# Quizzle — Next Steps

**Current phase:** Phase 0 — discovery and project setup  
**Status:** Not started in the repository; documentation bootstrap only.

## Immediate next task

Run the Phase 0 discovery interview before implementing the application.

### Required actions
1. Inspect the current repository, if one exists.
2. Identify existing features, framework, dependencies, assets, tests, and working code.
3. Ask the owner concise questions about intended users, design references, visual direction, branding, layout, theme, and platform priorities.
4. Clarify unresolved product decisions without re-asking requirements already documented in `PROJECT_CONTEXT.md`.
5. Update `DESIGN_BRIEF.md` with answers, marking unanswered items as open questions.
6. Update `PROJECT_CONTEXT.md` with confirmed decisions and clearly labelled proposals.
7. Record actual inspection results in `CHANGELOG.md`.

## Acceptance criteria

- Existing repository inspected, or absence of a repository explicitly confirmed.
- Discovery questions asked before major implementation.
- Confirmed decisions separated from assumptions.
- Design preferences captured before final UI selection.
- No claim that implementation or tests passed unless run.
- Owner approval requested before Phase 1 architecture work.

## Outstanding blockers

- Repository location and current implementation are unknown.
- User segments and primary use cases need clarification.
- Visual direction and references are not yet approved.
- Proposed architecture is not approved.
- AI provider account access and current free quotas are unverified.
- Retention periods and free-tier quotas need owner approval.

## Suggested next prompt

Read `PROJECT_CONTEXT.md`, `CHANGELOG.md`, `NEXT_STEPS.md`, and `DESIGN_BRIEF.md`. Begin Phase 0 discovery. Inspect the repository before changing code. Ask a short batch of high-value questions about the intended users, visual references, design direction, branding, screen layout, themes, and platform priorities. Do not implement the full app until the owner approves the design and architecture. Update all four documents before stopping.
