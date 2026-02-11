<!--
Sync Impact Report
- Version change: N/A → 1.0.0 (initial ratification)
- Added principles:
  - I. Readability Over Cleverness
  - II. YAGNI
  - III. Type Safety & Correctness
  - IV. Fail Fast & Defensive Design
  - V. Testing Discipline
  - VI. Explicit Naming & Communication
  - VII. Follow Established Patterns
- Added sections:
  - Code Review & Commit Standards
  - Logging & Error Handling Standards
  - Governance
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (Constitution Check
    section already references constitution; no changes needed)
  - .specify/templates/spec-template.md ✅ (no constitution
    references to update)
  - .specify/templates/tasks-template.md ✅ (no constitution
    references to update)
- Follow-up TODOs: none
-->

# Run-Box Constitution

## Core Principles

### I. Readability Over Cleverness

Code is written once but read many times. Developer time is the
highest cost, and bugs hide in code that is hard to follow.

- Code MUST use intermediate variables to reduce mental load;
  multi-step expressions MUST be broken into named parts.
- Functions MUST have a single clear responsibility described
  by their name.
- Positive logic MUST be preferred over negative
  (`if (isValid)` not `if (!isInvalid)`).
- Nested ternaries are FORBIDDEN. Simple ternaries are allowed.
- Functional style (`.map()`, `.filter()`, native array methods)
  MUST be preferred over imperative loops.
- Cyclomatic complexity MUST be kept low; extract conditions
  into named variables or helper functions rather than nesting.
- Parentheses MUST be added around `||` in compound conditions
  to eliminate operator-precedence guesswork.

### II. YAGNI (You Aren't Gonna Need It)

Simplicity is a feature. Every file, abstraction, and layer
carries maintenance cost. Structure matters, but so does not
having to navigate ten files to understand one behavior.

- Do NOT create files, abstractions, or indirection layers
  until a concrete, present need demands them.
- A single file MAY contain a group of related functions;
  splitting into separate files is only justified when the
  group grows large enough to hurt readability.
- Do NOT create helper functions that merely wrap one or two
  calls — "every layer means more to test and more to keep on
  the mental stack."
- Do NOT fetch data, build config, or add parameters "for
  future use." Only build what is needed now.
- When evaluating whether to add structure, the burden of
  proof is on complexity: the simpler option wins unless there
  is a demonstrable reason it cannot work.

### III. Type Safety & Correctness

Types are the first line of defense. Loose types hide bugs
and make refactoring dangerous.

- `any` is FORBIDDEN; use `unknown` or a specific type.
- Blind type casts (`as Foo`) MUST be replaced with type
  guards or corrected type definitions.
- Mapped types (`[k in EnumType]`) MUST be used for
  exhaustive enum coverage in lookup tables.
- Zod MUST be used for runtime validation of external data.
- `async` MUST only appear on functions that use `await`.
- Generic utility functions MUST return values, not just
  perform side effects.
- Interfaces MUST define the actual shape of data; do NOT
  accept `AttributeMap` or `object` when the shape is known.

### IV. Fail Fast & Defensive Design

Errors caught early are cheap; errors caught late are
expensive and often invisible.

- Inputs MUST be validated at the public function boundary,
  not deep in private helpers.
- Only expected errors MUST be caught; unexpected errors MUST
  propagate.
- Functions with side effects MUST name those side effects —
  `hasFileBeenProcessed()` MUST NOT delete objects.
- Destructive operations MUST be coded as simply as possible.
- External service calls MUST have explicit connect timeouts
  backed by latency data, not defaults.
- Regex MUST use `^`/`$` anchors and be as strict as possible;
  loosen only when a concrete case requires it.
- User input MUST be sanitized at the entry point.

### V. Testing Discipline

Tests are the specification. They prove the code works, catch
regressions, and document expected behavior.

- Test data MUST live in the test file and be generated
  programmatically — no separate JSON fixture files.
- Each `it` block MUST cover exactly one scenario.
- Edge cases (empty inputs, boundary conditions, unsorted
  data) MUST be tested.
- Fix the source, not the test — when a function returns the
  wrong type, fix the function.
- Stubs MUST only mock direct dependencies; use
  `calledWithExactly` for precise assertions.
- Global state modified in tests MUST be restored in
  `afterEach`.
- Unit tests are REQUIRED for functions that are (a) complex
  to reason about, (b) critical to correctness, and (c) do
  not depend on external services.
- Use `sinon.useFakeTimers()` over tiny TTLs or mocking time
  libraries directly.

### VI. Explicit Naming & Communication

Names are documentation. Comments explain *why*, not *what*.

- Variable and function names MUST precisely describe what
  they represent or return.
- Constants MUST use `UPPER_SNAKE_CASE` and MUST NOT have
  values added at runtime.
- Enums MUST use `UpperCamelCase`.
- `ID` not `Id`; acronyms MUST be ALL_CAPS except at the
  start of a camelCase identifier.
- JSDoc MUST be used on exported interfaces and non-self-
  documenting methods so intellisense picks them up.
- Comments MUST answer "why," never "what" or "how."
- Commit messages MUST use imperative mood, explain "why,"
  and reference a ticket number.
- Magic numbers MUST be extracted into named constants.
- Config key names MUST be descriptive, not abbreviated.

### VII. Follow Established Patterns

Consistency reduces cognitive load across the codebase.
One-off deviations create maintenance debt.

- New code MUST follow existing patterns unless there is
  a deliberate, documented decision to change them all.
- Formatting (3-space indent, trailing newlines, no extra
  blank lines) MUST match the codebase standard.
- Function interfaces MUST be standardized — if
  `writeContentDoc` takes specific params, `readContentDoc`
  MUST follow the same shape.
- Defaults MUST be defined in exactly one authoritative
  location.
- Dependency versions MUST be exact (no `^` or `~`).
- Co-locate related config; do NOT split matched data
  structures that must stay in sync.
- Data-driven iteration MUST be preferred over hard-coded
  switch statements that grow with every new value.

## Code Review & Commit Standards

- Separate commits for separate concerns; generated file
  changes MUST be in their own commit.
- `style:` commits for whitespace-only changes, not `fix:`.
- Squash closely related commits into one logical unit.
- Self-review before requesting review.
- Reviewers resolve discussions, not authors.
- Keep MR scope focused; out-of-scope work goes in a
  separate MR.
- Delete source branch after merge.
- Mark dependent MRs as draft to prevent accidental merge.
- Do NOT push to an MR that is "in review."

## Logging & Error Handling Standards

- Prefix error logs with `ERROR`; use `WARNING` for bad
  user data (not `ERROR`, which triggers alerts).
- Use proper console methods: `console.error` for errors,
  `console.warn` for warnings, `console.info` for info.
  Never `console.log`.
- Log BEFORE the operation, not after.
- Log `e, e.stack` when logging errors.
- Use structured JSON objects for log fields so they are
  parseable by aggregation tools.
- Put fixed-width keys first in log messages; variable-
  length content comes after.
- `console.debug` MUST be disabled in production via a
  `DEBUG_LOGGING` environment variable.
- Do NOT log entire data structures; log only the fields
  needed for debugging using allowlisted `pick()`.

## Governance

This constitution is the authoritative source for coding
standards and design principles in this project. All code
reviews and implementation decisions MUST verify compliance
with these principles.

- Amendments require: documentation of the change, review
  by at least one other team member, and a migration plan
  for any code that becomes non-compliant.
- Version follows semantic versioning:
  - **MAJOR**: Principle removed or redefined incompatibly.
  - **MINOR**: New principle or section added or materially
    expanded.
  - **PATCH**: Clarifications, wording, typo fixes.
- Complexity MUST be justified. When in doubt, the simpler
  option wins (see Principle II).
- Reference `principles.md` for the full, detailed catalogue
  of team conventions from which these principles are
  distilled.

**Version**: 1.0.0 | **Ratified**: 2026-02-10 | **Last Amended**: 2026-02-10
