# StudyOS — Agent Instructions

## 0. Core Principle

StudyOS is a long-term production project.

Priorities, in order:

1. Correctness
2. Safety
3. Maintainability
4. Minimal scope
5. Verification
6. Performance
7. Development speed

Do not optimize for the number of files changed or the amount of code produced.

Prefer the smallest correct change that solves the requested problem.

---

## 1. Before Changing Code

Before making changes:

1. Inspect the relevant project structure.
2. Read the relevant existing implementation.
3. Search for existing patterns, helpers, types, and utilities.
4. Check related tests.
5. Check relevant Prisma/schema/API dependencies when applicable.
6. Understand the request and its scope before editing.

Do not guess project conventions when they can be verified from the repository.

If the requested behavior already exists somewhere, reuse the existing implementation or pattern instead of creating a duplicate.

---

## 2. Scope Discipline

### MUST

* Modify only files relevant to the requested task.
* Preserve existing architecture and conventions.
* Prefer minimal, targeted changes.
* Reuse existing utilities and abstractions.
* Preserve existing routes and public behavior unless the task explicitly requires changing them.
* Preserve database compatibility unless a schema change is explicitly requested.

### MUST NOT

* Add unrelated features.
* Perform opportunistic refactoring.
* Rename files or symbols without a task-related reason.
* Rewrite working code merely because another implementation looks cleaner.
* Change formatting across unrelated files.
* Upgrade dependencies unless explicitly requested.
* Delete existing functionality unless explicitly requested.

If you discover an unrelated issue, report it instead of fixing it.

---

## 3. Architecture

StudyOS is a Next.js App Router application using:

* Next.js
* React
* TypeScript
* Prisma
* PostgreSQL / Supabase
* NextAuth
* Vitest
* ESLint
* Prettier
* AI integrations

The repository contains multiple feature domains under:

`src/features/`

Respect the existing feature-oriented architecture.

Do not move code between architectural layers unless the task requires it.

Pay particular attention to:

* Server Components vs Client Components
* Server Actions
* API routes
* authentication/authorization boundaries
* Prisma access
* feature-level actions/queries
* shared UI components
* i18n

Do not introduce a new architectural pattern when an existing project pattern already solves the problem.

---

## 4. Generated Code

Do NOT manually edit generated Prisma/client files.

In particular, avoid editing:

`src/generated/prisma/**`

Generated files may be very large and are not normal application source code.

Modify the source schema or generator configuration when appropriate, then regenerate using the project's established workflow.

---

## 5. Prisma / Database Safety

Database changes are high-risk.

Before modifying:

`prisma/schema.prisma`

or migrations:

1. Inspect the existing model.
2. Inspect related models and relations.
3. Inspect recent migrations.
4. Follow existing naming conventions.
5. Determine whether the change is backward compatible.
6. Avoid destructive operations unless explicitly requested.

Never casually:

* drop tables
* delete columns
* reset the database
* modify production data
* run destructive migrations
* use `prisma migrate reset`
* use force flags

Do not invent database data or schema relationships.

When a schema change is required, verify the migration and generated client according to the project's existing workflow.

---

## 6. Testing

Tests are part of the implementation.

When changing behavior:

1. Find relevant existing tests.
2. Add or update tests when appropriate.
3. Run the narrowest relevant test first.
4. Run the broader verification suite before declaring completion.

Do not claim a test passed unless it was actually executed.

Do not remove tests simply to make the suite pass.

If the repository lacks coverage for an important behavior, mention that explicitly.

---

## 7. Verification

Before declaring a non-trivial task complete, run the relevant project checks.

Preferred order:

1. Formatting check / formatting
2. ESLint
3. TypeScript typecheck
4. Tests
5. Production build when appropriate

Use the project's existing npm scripts rather than inventing alternative commands.

If a check fails:

* inspect the actual error
* determine whether the failure is caused by your change
* fix the root cause if it is within scope
* rerun the failed check

Do not hide, suppress, or ignore errors merely to obtain a green result.

Never report success based on an expected result.

---

## 8. Production Build

The production build is an important verification gate.

StudyOS's build process may involve Prisma/database operations before Next.js compilation.

Therefore, distinguish between:

* database/migration failures
* TypeScript failures
* Next.js compilation failures
* lint failures
* environment/configuration failures

Do not assume a build failure is caused by the code you changed without investigating the actual error.

---

## 9. Git Safety

Git operations must be conservative.

Before modifying Git state:

* inspect `git status`
* inspect the current branch
* understand existing user changes

Never destroy user work.

NEVER run without explicit user instruction:

* `git reset --hard`
* `git clean -fd`
* destructive checkout/restore operations
* force push
* history rewriting
* branch deletion

Do not modify or commit unrelated user changes.

Do not create a commit unless explicitly requested.

Do not push unless explicitly requested.

If the working tree contains changes that predate the task, preserve them.

---

## 10. Environment Safety

Do not modify:

* production infrastructure
* deployment configuration
* secrets
* environment variables
* authentication configuration
* billing configuration

unless explicitly required by the task.

Never expose secrets in output.

Never print or commit API keys, passwords, tokens, database credentials, or private configuration.

---

## 11. Dependencies

Do not install, remove, upgrade, or downgrade packages unless necessary for the requested task.

Before adding a dependency:

1. Check whether the repository already has an equivalent dependency.
2. Prefer existing utilities.
3. Consider whether the dependency is actually necessary.
4. Explain the reason before making a significant dependency change.

Avoid dependency churn.

---

## 12. UI / UX

When modifying UI:

* follow existing component patterns
* reuse `src/components/ui`
* preserve responsive behavior
* preserve accessibility
* preserve existing i18n architecture
* do not hardcode user-facing strings when the project uses translations

Do not redesign unrelated UI.

For icon-only interactive elements, ensure accessible labels are present.

---

## 13. Internationalization

StudyOS supports multiple languages.

When adding or modifying user-facing text:

* inspect existing translation keys
* reuse existing keys where appropriate
* add translations consistently across supported locales
* do not introduce unnecessary hardcoded Korean/English strings

Do not modify unrelated translations.

---

## 14. Performance

Do not optimize based on assumptions.

Before performance changes:

1. Identify the actual bottleneck.
2. Measure where practical.
3. Understand whether the bottleneck is server, database, network, rendering, or client-side work.
4. Make the smallest effective change.
5. Verify that behavior remains correct.

Do not remove functionality merely to improve an unmeasured metric.

---

## 15. AI / LLM Features

StudyOS contains AI-related functionality.

When modifying AI behavior:

* inspect existing provider/client abstractions
* preserve existing error handling
* preserve authentication and authorization
* avoid leaking user data
* avoid exposing API keys
* preserve existing rate-limit/cost protections

Do not introduce a new AI provider or abstraction unless explicitly requested.

---

## 16. Long-Running Tasks

For large tasks:

1. Break the work into explicit phases.
2. Keep each phase scoped.
3. Verify after meaningful changes.
4. Avoid accumulating a huge unverified diff.
5. If the task becomes ambiguous, stop and ask rather than guessing.

Do not silently expand the scope of a task.

---

## 17. Browser / Runtime Verification

When browser verification is available and relevant:

* test the actual affected route
* check console errors
* check the affected interaction
* verify responsive behavior when relevant

Do not claim browser verification if it was not actually performed.

If browser tooling is unavailable, state that clearly.

---

## 18. Completion Report

When the task is complete, report:

### Changed

List the important files and what changed.

### Why

Briefly explain why the changes were necessary.

### Verification

List the commands actually executed and their results.

Example:

* `npm run lint` — PASS
* `npm run typecheck` — PASS
* `npm run test` — PASS
* `npm run build` — PASS

### Not Verified

Explicitly list anything that could not be verified.

### Remaining Issues

Mention relevant issues discovered but intentionally left untouched.

Do not claim more verification than was actually performed.

---

## 19. Final Rule

When uncertain:

**Do less, inspect more, and ask before making a risky assumption.**

The goal is not to change as much code as possible.

The goal is to leave StudyOS in a more correct, maintainable, and verified state with the smallest necessary change.
