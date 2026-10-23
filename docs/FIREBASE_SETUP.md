# Firebase Setup — Quizzle

> ## ⚠️ This document is obsolete and is kept for history only.
>
> **Firebase Authentication has been removed from Quizzle.** Supabase Auth is
> the sole authentication provider, and sign-in remains Google-only.
>
> The four `EXPO_PUBLIC_FIREBASE_*` variables no longer exist in the codebase,
> `services/firebase.ts` has been deleted, and the `firebase` package is no
> longer used by any application code.
>
> **For current setup instructions, see
> [docs/SUPABASE_SETUP.md](SUPABASE_SETUP.md).**

## What replaced it

| Was (Firebase)                        | Now (Supabase)                                                          |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Firebase Authentication (Google)      | Supabase Auth, Google provider                                          |
| `EXPO_PUBLIC_FIREBASE_*` (4 vars)     | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`             |
| Firebase Console → Authorized domains | Supabase Dashboard → Authentication → URL Configuration → Redirect URLs |
| Firestore security rules              | Supabase Row Level Security (deployed and tested)                       |

## Migration timeline

- **2026-10-23** — Supabase database foundation deployed to the hosted project
  and verified on it. 74 executed tests.
- **2026-10-23** — Supabase Google OAuth implemented behind a temporary
  `EXPO_PUBLIC_AUTH_PROVIDER` switch, with Firebase kept as the default so the
  app never lost a working login.
- **2026-10-23** — the switch removed. Supabase became the sole provider,
  Firebase Auth code and its tests were deleted, and screens moved to the
  provider-neutral `AppUser` model.

## Note on the `firebase` package

`firebase` remains in `package.json` **only** because
`tests/rules/firestore.rules.test.ts` imports `firebase/firestore`. That suite
exercises the Firestore security rules, which are a separate written-but-never-
executed artefact predating the Supabase migration. **No application code uses
Firebase.** Whether to retire that suite — and with it the Firestore rules,
which the Supabase schema has superseded — is an open decision for the owner.
