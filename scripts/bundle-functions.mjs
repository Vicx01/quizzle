// Bundles each Edge Function into a single self-contained file.
//
// WHY THIS EXISTS
//
// The Supabase Management API used for deployment accepts one source file per
// function, but our functions are written as small modules that share code from
// supabase/functions/_shared/. This script inlines those shared modules so the
// deployed body has no relative imports.
//
// It is deliberately conservative: the shared modules are dependency-free
// (they import nothing from each other), so concatenation is safe. If anyone
// ever adds an import to a shared module, the check below fails loudly rather
// than silently emitting broken code.
//
// Usage: node scripts/bundle-functions.mjs
// Output: .deploy-bundle/<slug>/index.ts

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTIONS_DIR = join(ROOT, 'supabase', 'functions');
const SHARED_DIR = join(FUNCTIONS_DIR, '_shared');
const OUT_DIR = join(ROOT, '.deploy-bundle');

// Shared modules are leaves, so any fixed order works. This one just reads well.
const SHARED_ORDER = ['respond.ts', 'token.ts', 'rateLimit.ts', 'grade.ts', 'allowlist.ts'];

// Matches a RELATIVE import statement, including multi-line named imports.
// Only relative imports are inlined; external ones (`npm:…`, bare specifiers)
// stay in the output, because those resolve against the Deno registry at
// runtime and stripping them would silently remove real dependencies.
// Deliberately non-greedy and anchored per-line so the word "import" inside a
// comment is not matched.
const RELATIVE_IMPORT_RE = /^import\s[\s\S]*?from\s+['"](\.\.?\/[^'"]+)['"];?\s*$/gm;

const EXTERNAL_IMPORT_RE = /^import\s[\s\S]*?from\s+['"](?!\.\.?\/)([^'"]+)['"];?\s*$/gm;

const EXPORT_PREFIX_RE =
  /^export\s+(?=(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum|abstract))/gm;

async function sharedModules() {
  const present = (await readdir(SHARED_DIR)).filter(f => f.endsWith('.ts')).sort();
  const missing = SHARED_ORDER.filter(f => !present.includes(f));
  const extra = present.filter(f => !SHARED_ORDER.includes(f));

  if (extra.length > 0) {
    throw new Error(`Unlisted shared module(s): ${extra.join(', ')}. Add them to SHARED_ORDER.`);
  }
  if (missing.length > 0) {
    throw new Error(`SHARED_ORDER lists missing module(s): ${missing.join(', ')}.`);
  }
  return SHARED_ORDER;
}

/** Removes relative imports (they have been inlined). */
function stripImports(source) {
  return source.replace(RELATIVE_IMPORT_RE, '');
}

/**
 * Lifts external imports out of a source file so they can be re-emitted at the
 * top of the bundle. Hoisting keeps the generated file conventional; ES module
 * imports are hoisted by the runtime anyway.
 */
function externalImports(source) {
  const found = [];
  let m;
  EXTERNAL_IMPORT_RE.lastIndex = 0;
  while ((m = EXTERNAL_IMPORT_RE.exec(source)) !== null) {
    found.push({ statement: m[0].trim(), source: m[1] });
  }
  return found;
}

function stripExportKeywords(source) {
  return source.replace(EXPORT_PREFIX_RE, '');
}

/** Top-level declared names, used to catch collisions before they ship. */
function declaredNames(source) {
  const names = new Set();
  const re =
    /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(source)) !== null) names.add(m[1]);
  return names;
}

async function build() {
  await rm(OUT_DIR, { recursive: true, force: true });

  const sharedFiles = await sharedModules();
  const chunks = [];
  const seen = new Map();

  for (const file of sharedFiles) {
    const raw = await readFile(join(SHARED_DIR, file), 'utf8');

    if (/^import\s/m.test(raw)) {
      throw new Error(
        `_shared/${file} imports another module. This bundler concatenates ` +
          `shared files in a fixed order and cannot resolve their dependencies. ` +
          `Move the import into the function itself, or extend this script.`
      );
    }

    for (const name of declaredNames(raw)) {
      if (seen.has(name)) {
        throw new Error(
          `Name collision: "${name}" is declared in both _shared/${seen.get(
            name
          )} and _shared/${file}. Inlining would produce invalid code.`
        );
      }
      seen.set(name, file);
    }

    chunks.push(`// ---- inlined from _shared/${file} ----\n${stripExportKeywords(raw).trim()}\n`);
  }

  const slugs = (await readdir(FUNCTIONS_DIR, { withFileTypes: true }))
    .filter(e => e.isDirectory() && e.name !== '_shared')
    .map(e => e.name)
    .sort();

  const written = [];
  for (const slug of slugs) {
    const entry = join(FUNCTIONS_DIR, slug, 'index.ts');
    const raw = await readFile(entry, 'utf8');

    const leftover = stripImports(raw).match(
      /(?:^|\n)\s*(?:import|export)\s+[^;]*from\s+['"]\.\.?\//
    );
    if (leftover) {
      throw new Error(
        `functions/${slug}/index.ts still has an unresolved import: ${leftover[0].trim()}`
      );
    }

    const externals = externalImports(raw);
    const externalLines = externals.length ? [externals.map(e => e.statement).join('\n'), ''] : [];

    const body = [
      `// GENERATED FILE - do not edit.`,
      `// Source: supabase/functions/${slug}/index.ts plus inlined _shared modules.`,
      `// Built by scripts/bundle-functions.mjs.`,
      ``,
      ...externalLines,
      ...chunks,
      `// ---- supabase/functions/${slug}/index.ts ----`,
      stripImports(raw).trim(),
      ``,
    ].join('\n');

    const outDir = join(OUT_DIR, slug);
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'index.ts'), body, 'utf8');
    written.push({ slug, bytes: Buffer.byteLength(body) });
  }

  return written;
}

build()
  .then(written => {
    for (const { slug, bytes } of written) {
      console.log(`bundled ${slug} (${bytes} bytes) -> .deploy-bundle/${slug}/index.ts`);
    }
    console.log(`\n${written.length} function(s) bundled.`);
  })
  .catch(err => {
    console.error(`bundle failed: ${err.message}`);
    process.exit(1);
  });
