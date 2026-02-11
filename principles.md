# Principles

Compiled from merge request review discussions spanning December 2018 through
January 2026.

---

## Code Quality & Design

- **Readability over cleverness** — Add intermediate variables to reduce mental load. "A
  primary goal is to write code that is easily readable for developers. They are the ones
  who introduce bugs and their time has the highest cost."
- **Single Responsibility Principle** — Functions should have one clear responsibility. If
  a function name no longer describes what it does, split it.
- **Functions should not have side effects unrelated to their name** —
  `hasFileBeenProcessed()` should not also delete the source object. Keep side effects in
  the caller.
- **Fail fast** — Validate inputs early, at the public function boundary, not deep in
  private helpers.
- **Avoid swallowing all exceptions** — Only catch expected errors; let unexpected ones
  propagate.
- **No nested ternaries** — Keep ternary usage simple and readable.
- **Remove unused code** — Don't comment out code; version control preserves history.
- **Follow existing patterns** — Don't introduce one-off deviations from established
  patterns without a reason to change them all.
- **Prefer positive logic over negative** — `if (isValid)` is clearer than
  `if (!isInvalid)`. `prefer == content || prefer == contentloose` is easier to grok than
  `prefer != lang`.
- **Prefer functional style** — Use `.map()`, `.filter()`, native array methods, or
  toolbox utilities over imperative loops.
- **Avoid underscore in TypeScript** — The types are poorly-typed. Use native functions
  like `.includes()`, `.filter()`, `Object.keys().forEach()`, or toolbox utilities
  instead.
- **Prefer simpler native methods** — `keys(obj).sort()` is clearer than
  `sortBy(keys(obj), identity)`.
- **Add parentheses around `||` in compound conditions** — Reduces mental load; devs don't
  have to remember operator precedence.
- **Don't compare objects with `JSON.stringify`** — It's unreliable due to key ordering.
- **Avoid recursive pagination** — Recursive calls for paginated API results can cause
  stack overflows. Use iterative loop/nextTick patterns instead.
- **Avoid premature abstraction** — Don't create helper functions that just wrap one or
  two external calls. "Every layer means more to test and more to keep on the mental
  stack."
- **Don't roll your own templating syntax** — Use established libraries.
- **Parallelize independent async calls** — Use `Promise.all` when calls don't depend on
  each other.
- **Start async work early, await late** — For fire-and-forget API calls, start the
  promise at the top of the function and await it at the end.
- **Only fetch data when needed** — Don't fetch data "for simplicity" if it's only needed
  sometimes.
- **Extract magic numbers into named constants** — `30` milliseconds is confusing without
  context. Use `MIN_TIME_FOR_data_ANALYSIS_MILLIS`.
- **Co-locate related config** — When filters and matchers must stay in sync, put them in
  the same config object rather than separate data structures with "keep in sync"
  comments.
- **Use data-driven iteration over hard-coded switches** —
  `for (let filter of Object.values(SearchFilter))` with a matcher is better than a switch
  statement that must be updated for every new filter.
- **Don't parse your own data structures as strings** — If you build an array and then
  parse it as strings elsewhere, that's a maintenance pinch point. Build the data natively
  where it's needed.
- **Make properties readonly when they shouldn't change after construction**.
- **Standardize function interfaces** — If `writeContentDoc` takes specific params,
  `readContentDoc` should follow the same pattern.
- **Use `isEmpty` consistently** — Replace `if (!x)` checks with `isEmpty(x)` for checking
  array/object emptiness.
- **Don't hard-code dependencies on third-party error messages** — Create a ticket to get
  the upstream team to provide a stable programmatic error code.
- **Separate business logic from event handling** — Business logic classes shouldn't know
  about the event type that triggered them.
- **Reduce cyclomatic complexity** — Use underscore chains with comments instead of nested
  loops/conditionals.
- **Be safe with multibyte characters** — `String.slice()` can split multibyte characters.
  Use spread operator `[...str]` for character-safe operations.
- **Keep library APIs future-proof** — Even if a method doesn't need to be async right
  now, keep it async if the API contract should allow for it. Add a comment explaining
  why.
- **Export library functionality, not raw data** — Don't export a blob of data; export
  helpful functions like `getMaxItemCount(category, subcategory)`.
- **Whitelist options** rather than passing through entire objects — type-checking alone
  doesn't prevent creative developers from sending unsupported options.
- **Don't default values in two places** — Pick one authoritative location for defaults.
- **Sanitize inputs** — "If there's a place where you don't want HTML to appear, then
  don't let it." Don't assume current data will always be clean.
- **Put data transformations in the right layer** — Bad data should be cleaned in a
  transformer, not in ad-hoc code. Ideally, transformations happen at the API boundary.

## TypeScript & Type Safety

- **Avoid `any` — use `unknown` or specific types** — "`any` spreads like a disease." When
  the type is genuinely unknown, prefer `unknown` or `StringUnknownMap` over `any`.
- **No blind type casts** — Casting loses type safety. If you need to cast, the types are
  wrong.
- **Use `[k in EnumType]` mapped types** to ensure exhaustive coverage of enum values in
  lookup tables. This forces a compile error if a new enum value is added without updating
  the table.
- **Only use `async` where you use `await`** — Don't mark functions `async` unnecessarily.
- **Define proper interfaces** for function parameters — Don't accept `AttributeMap` or
  `any` when you know the shape of the data.
- **Use `isEnumValue` for validation** — e.g.,
  `isEnumValue(Prefer, rawPrefer) ? rawPrefer : Prefer.ContentLoose`.
- **Use utility types** — e.g., `RequireOptional<FinderOptions, 'lank'>` to make optional
  fields required in specific contexts.
- **Use type guards to eliminate type assertions** — If `isSupportedDocument` is a
  type guard, you don't need `as SupportedDocument[]`.
- **Create specific types for filtered data** — When filtering `_source` fields from ES,
  create a type that only defines the fields actually returned.
- **Use `instanceof` over string comparisons for error handling** — `instanceof` is safer
  than checking `error.code` strings because it avoids typos and field name changes.
- **Rename awkward SDK types on import** — When the SDK exports a poorly-named type,
  alias it on import.
- **Use `StrictUnion` for discriminated union types** — Prevents TypeScript from allowing
  properties from one variant on another.
- **Use Zod for runtime validation of external data** — When parsing JSON from external
  sources, use Zod schemas to get parsing, validation, and helpful error messages for
  free.
- **Define real types for data you own** — If you're defining a data format, create proper
  TypeScript interfaces rather than using `any[]` or `object[]`.
- **Make generic utility functions return values** — `processZipFileFromPath<T>` should
  let the processor return a value to the caller, not just perform side effects.

## Function Signatures & Style

- **Function signatures on one line** — Multi-line signatures are distracting. Keep them
  single-line even if it means ignoring max-len on that line.
- **Use JSDoc comments** so intellisense picks them up, not regular comments.
- **Add JSDoc to exported interfaces** — At minimum a one-sentence summary explaining why
  this interface exists and how it relates to others.

## Naming Conventions

- **Use `ID` not `Id`** — e.g., `typeID` not `typeId` (unless interfacing with an external
  library that requires `Id`).
- **Use uppercase `IP`** not `Ip` — e.g., `IPSystemMetadata`, `IP_SOURCE_CATEGORY`,
  `cdsID`.
- **UPPER_SNAKE_CASE for constants** — Don't add values to constants at runtime.
- **Enums use UpperCamelCase**.
- **Naming accuracy matters** — Variable/function names should precisely describe what
  they represent.
- **Test variable names should be descriptive** — Use names that describe the scenario,
  not abbreviations.
- **Avoid acronyms mid-variable-name** — `_getSubtitlesURL` is better than
  `_getVTTURLFromMediaItem`.
- **Function names must match what they do** — `_getByDate` is misleading if it only looks
  up videos. Use `_getVideoByDate` instead.
- **Abbreviation casing must be consistent** across the codebase.
- **Use existing constants** — Don't hardcode values that already exist as constants
  elsewhere.
- **Naming should not be client-specific** — `paginationTotal` is better than
  `displayTotal`.
- **Rename `opts` to `overrides`** when the parameter provides override values for
  defaults.
- **Function names should describe what they return** — `get_error_code_from_yaml` is
  clearer than `get_error_code`.
- **Config key names should be descriptive** — `product-to-detail-page-id` is better
  than a vague abbreviation.
- **Service names should describe what they do** — `analytics-events-distributor` not
  `analytics-event-logger`.
- **Be consistent with plurals** — If existing services use `analytics-events` (plural),
  new related services should too.
- **Column names should describe what the data is, not its type** — `event_datetime` not
  `timestamp_column`.
- **Be precise with language identifiers** — "locale code" vs "internal language code"
  vs "locale" are different things.
- **Be explicit about CLI parameter names** — Use `--language-codes` not `--languages` to
  avoid ambiguity with "locale".
- **Don't prefix types with the wrong system name** — If an enum comes from SystemA,
  don't call it `SystemBType`.
- **Name event categories precisely** — `data-event` over `data-anomaly` (not all events
  are anomalies); avoid overloaded terms like "production" in event names.

## Formatting & Whitespace

- **Trailing newlines required** — Files must end with exactly one trailing newline.
- **Extra blank lines flagged** — Reviewers consistently flag extra blank lines.
- **One newline around `describe`/`it` blocks** in test files.
- **One blank newline after the final function in a class**.
- **Markdown wraps at 90 characters** — Raw text in markdown files should wrap at 90
  chars, same as code comments. Code snippets can exceed 90 chars.
- **One newline before and after code block backticks in markdown**.
- **Don't quote object keys** unless absolutely needed.
- **Don't reorder/reformat code unnecessarily** — It creates noise in code reviews.
- **No colon after log level** — Use `INFO Potentially` not `INFO: Potentially`.
- **Three-space indentation for new `package.json` files**.

## Commit & MR Practices

- **Commit messages must explain "why"** — Use imperative mood: mental prefix "If applied,
  this commit will..."
- **Remove filler from commit messages** — e.g., remove "The motivation behind making this
  change is that".
- **Separate commits for separate concerns** — Keep generated file changes in their own
  commit, separate from code changes.
- **Commit messages must reference ticket numbers** — Always reference a PBI or feature
  ticket number.
- **Commit message titles should not be redundant** — e.g., "fix: fix suggestion parsing"
  is bad.
- **Commit type matters** — `style:` not `fix:` for whitespace-only changes. Follow
  Angular commit conventions.
- **Update MR title** when commit message changes.
- **Reviewers resolve discussions**, not the author.
- **Don't push to an MR that is "in review"** — Creates extra diff noise.
- **Don't put conversation in MR descriptions** — Title and description become part of the
  commit.
- **Delete source branch after merge**.
- **Self-review before sending for review** — "Did you review this yourself before sending
  it to me?"
- **Squash closely related commits** into one — Makes seeing the "unit" of work easier in
  the log.
- **Mark dependent MRs as WIP/draft** — If an MR can't be merged until another ships, mark
  it as draft to prevent accidental merging.
- **Keep scope focused** — Pull out-of-scope changes into separate MRs.
- **Provide context in MR comments** — When removing TODOs, explain why each one is being
  removed.

## Testing

- **Keep test data in the test file** — Don't use separate JSON fixture files; generate
  data programmatically. "A function or two is far easier to manage than 74 objects."
- **Setup fake data within the `it` block** — Place fake data in the test that uses it.
- **Extract shared constants** to reduce test fragility.
- **Test edge cases** — Empty inputs, disabled states, boundary conditions.
- **Test idempotency** — Verify that running an operation twice produces the same result.
- **Separate `it` blocks for each case** — Don't combine multiple test cases in one `it`
  block.
- **Use Sinon's fake timers** over mocking time libraries directly.
- **Use `calledWithExactly`** for precise stub assertions.
- **Only stub what's necessary** — When testing a public function, only stub the direct
  dependencies it calls.
- **Test that packaging changes work across all services** before merging.
- **Validate invalid inputs** — Functions that return valid data must check for invalid
  inputs.
- **Fix the source, not the test** — When a function returns the wrong type, fix the
  function, not the test expectations.
- **Don't base tests on total call counts** — Basing tests on `console.log` call counts is
  fragile. Return a value and assert on that instead.
- **Use `resetHistory`** on Sinon stubs to get per-test invocation counts.
- **Write comparison scripts** for API refactors to validate old vs. new behavior.
- **Ensure tests run in CI** — Verify tests are included in the CI pipeline.
- **Use `AssertionError`** with `expected`/`actual` for clear test failure output.
- **Report all failures, not just the first** — Collect all errors before asserting.
- **Create shared test helpers** — e.g., `makeFakeEntity(overrides)` with
  `Partial<Entity>` parameter.
- **Place test helpers in shared locations** — e.g., `lib/tests/entity-helpers.ts`.
- **Add tests for invisible behaviors** — "When this breaks it isn't very visible so the
  tests are very important."
- **Provide examples of test failure output** — Show what failures look like so reviewers
  can evaluate readability.
- **Abstract date logic for testability** — Extract date manipulation into separate
  testable functions.
- **Use made-up IDs in test examples** — Don't use real user IDs in test data.
- **Test edge cases like unsorted arrays** — If data from an external source isn't
  guaranteed to be sorted, add tests with unsorted input.
- **Be liberal with validation for external clients** — For events from third-party
  devices, prefer liberal validation to avoid dropping events.
- **Reduce test logic complexity** — When tests have too much logic, bugs hide in the
  tests themselves. Make test data explicit.
- **Use clock functions in tests instead of tiny TTLs** — Don't use `1ms` TTL to test
  cache expiration. Use `sinon.useFakeTimers()`.
- **Validate API responses against JSON schemas in integration tests**.
- **Write unit tests for complex, critical, easy-to-test functions** — Functions that are
  (a) complex to reason about, (b) critical to system correctness, and (c) don't depend on
  external services should always have unit tests.
- **Use `rewire` for testing module-level constants**.
- **Reset global state after tests** — When modifying env vars or global state in tests,
  always restore the original value in an `afterEach` block.
- **Test across a wide range of input data** — Test across different input types,
  languages, and file format generations.
- **Tighten regexes** — Always use `^` and `$` anchors and be as strict as possible.
  Loosen later if needed.
- **Validate data assumptions before processing** — Do basic input validation before
  expensive operations.

## Logging & Error Handling

- **Prefix error logs with `ERROR`** — Required for log alerting to pick them up.
- **Log useful debugging context** — Include relevant identifiers, policies, and counts
  in log messages.
- **Log before the operation, not after** — Logging after a potentially-failing operation
  means you may never see the log.
- **Log `e, e.stack`** when logging errors to get the stack trace.
- **Use ISO-8601 dates** over unix timestamps for human readability.
- **ERROR vs WARNING in logs** — Only use "ERROR" for things caused by our code. Use
  "WARNING" for bad user data, since "ERROR" triggers daily error reports and alerts.
- **Log structured JSON objects** — When logging multiple fields, use a JSON object so
  fields are parseable by log aggregation tools.
- **Put keys first in log messages** — Variable-length user content should come after
  fixed-width keys for easier scanning.
- **Use proper console methods** — `console.error` for errors, `console.warn` for
  warnings, `console.info` for info. Don't use `console.log('ERROR ...')`.
- **Error messages should use past tense** — "Could not post..." not "Will post..." when
  reporting a failure that already happened.
- **Error messages need a subject** — Don't omit what failed.
- **`console.debug` should be disabled in production** — Use a `DEBUG_LOGGING` environment
  variable to control debug output.
- **Log expected conditions at info level, not error** — Expected behavior is not an
  error.
- **Don't log errors without adding context** — If the auto-logged error is sufficient,
  don't add a redundant `console.error`.
- **Don't log entire search documents or massive data structures** — Log only the fields
  needed for debugging.
- **Log all errors that trigger batch retries** — Throw a new error that includes all of
  them, not just the first one.
- **Log structured data, not recovery commands** — Log structured JSON events and let the
  log processor determine what to do.
- **Distinguish error scenarios for different audiences** — A zero-byte ZIP and a ZIP with
  no ingestible files are different problems.
- **Add comments explaining why known errors occur** — When handling known error patterns,
  add a comment with the background.
- **Prefer allowlisting over denylisting in logs** — Use `pick(evt, 'body', 'path', ...)`
  to explicitly select what to log.
- **Warnings that go into the ether are useless** — If a warning won't be seen
  proactively, either make it an error or set up a report for it.

## Documentation & Comments

- **Comments explain "why"** — Add comments explaining intent, especially for complex
  chains or non-obvious sorting.
- **Comments belong in code, not MR discussions** — If a decision needs to be remembered,
  put the comment in the code where someone will find it years later.
- **Add helpful context to commit descriptions** — When a fix has important context, put
  it in the commit description.
- **Use `https://example.org/`** for test URLs — It's a reserved domain.
- **Add comments explaining "why" for chunking/batching** — If you chunk operations,
  explain why.
- **Add ticket references in code comments** — `See #127160` gives future devs an example
  of the issue.
- **JSDoc for non-self-documenting methods** — If the method signature isn't entirely
  self-documenting, document it with examples.
- **Define terms before using them** — Create a "Terms Used in This Document" section.
- **Use the Oxford comma** — Always.
- **Remove smart quotes** from documentation.
- **Keep tense consistent** — Don't switch between past and present tense within the same
  document.
- **Explain *how we use* important fields** — Don't just describe what a field is; explain
  its significance to our system.
- **Clarify differences between similar fields** — If two fields look alike, the
  documentation must explain how they differ.
- **Use named markdown references** — `[job bookmarks][bookmarks]` not `[1]` for
  maintainability.
- **Explain all schema fields** — Don't leave fields undocumented.
- **Give examples in documentation** — Show what arguments look like.
- **Documentation examples should be realistic** — Include headers and cookies, not just
  bare URLs.
- **Use correct examples in docs** — Users copy-paste from examples, so use
  canonical/correct values.
- **Comment when order matters** — e.g., "the order is important on these" for config
  arrays.
- **Comment when downstream code modifies upstream objects** — Add a comment at the
  definition site.
- **Keep code comments in sync with code changes**.
- **Show example data formats in templates** — When removing default values, show the
  expected format in a comment.
- **Add code comments pointing to API spec/schema files** — "also update the API spec".
- **Update stale references when removing services**.
- **Put context in code comments, not just git blame** — Add a brief "why" and a ticket
  link directly in the code.
- **Document recurring maintenance tasks** — Keep a list of recurring tasks so they don't
  get lost.

## Architecture & Event Design

- **Events belong to the emitting service** — A service emits an event and doesn't care
  who listens. The emitter "owns" the event type.
- **Keep service-specific types in the owning service** — Don't move types to
  `model/shared` unless genuinely shared between backend and frontend.
- **Validate implicit type contracts** — If an external event is implicitly passed through
  a workflow, ensure the internal contract stays in sync.
- **Separate race condition solutions from batching optimizations** — Locking/conditional
  writes solve race conditions. Queues with delays solve batching/deduplication.
- **Use conditional writes (`updateUUID`) for transactional consistency**.
- **Don't pollute core model interfaces** — Extend the interface at the event level rather
  than adding fields to `toPlainObject()`.
- **Rename methods to reflect their actual purpose** — `toPlainObject()` →
  `toMenuActivationEvent()`.

## Streams & Memory

- **Don't load entire files into memory** — Use stream pipelines (`GET -> gzip -> PUT`).
- **Never leave a promise unreturned or uncaught** — "The cardinal rule of using
  promises."
- **Use `pipeline` not `pipe`** — They have very different semantics.

## Normalization & Data Handling

- **Centralize normalization in model classes** — `Language.normalize_locale()` should be
  the single source of truth.
- **Sanitize input early** — Normalize query string params at the entry point.
- **Regex should be precise** — Language codes are 1-3 characters, not "one or more"
  (`{1,3}` not `+`).
- **Use `/u` flag on regex** for multi-lingual text.
- **Handle non-breaking spaces** — German and French use `\u00a0` as thousand separators.
- **Avoid smart quotes** in user-facing strings.

## Cache Design

- **Expose structured cache key builders** — Provide an enum of entry types, version
  numbers, and separate unhashed/hashed key parts.
- **Tie storage TTL to validity TTL** — Don't store data for 90 days if it's only valid
  for 7.
- **Never put unsanitized user input in unhashed key parts** — User search queries go in
  `hashedParts`.
- **Cache negative results** — If a feature API returns "not enabled," cache that result.
- **Don't fetch config on every request** if it doesn't change frequently — cache it.
- **Set connect timeouts** on all external service calls — don't rely on defaults.
- **Use data to justify timeouts** — Check latency metrics before setting timeouts.

## YAML Style

- **YAML array objects on separate lines** — Use the dash-on-its-own-line pattern for
  objects in arrays.
- **Collapse short object declarations** — `- { Name: year, Type: int }` is more scannable
  for simple key-value pairs.
- **Quote YAML strings with control characters** — Strings containing `:` should always be
  in single quotes.
- **Always indent objects in YAML** — Don't copy old unindented patterns from legacy
  services.
- **Don't hardcode environment-specific values**.

## Dependency & Library Management

- **Exact version specifiers in `package.json`** — No `^` or `~`.
- **Base forks on tagged releases** — Don't fork from upstream master. Fork from a tagged
  release + only the commits you need.
- **Don't commit dist folders** — Find a proper fix for build issues.
- **Test dependency upgrades across multiple services**.
- **Use forks temporarily, switch to published packages ASAP**.

## Shell Scripts

- **Avoid bash arrays** — They are not portable across shells.
- **Use case statements for arg parsing** — Not hacky positional argument checks.
- **Exit with non-zero on failure** — `exit 1` when something fails.
- **Echo destructive commands for review** — Have the script echo the exact commands, put
  them in the MR for review, then copy-paste to execute.

## Operational Practices

- **Defensive coding for destructive operations** — Code that deletes data should be as
  simple as possible.
- **Document "gotchas"** so they don't recur.
- **Create follow-up tickets for deferred work** — Don't let things fall through the
  cracks.
- **Move tribal knowledge into documentation** — Instead of sending an email, create a
  documentation page.
- **Write documentation for the common case first**.
- **Clean up related data, not just primary records** — When deleting records, also
  clean up related table references.

## Thinking & Reasoning

- **"Programming is science, not art"** — Think through decisions rigorously.
- **Explain your thinking** — Reviewers ask "please explain your thinking on this" to
  ensure decisions are deliberate.
- **Understand existing code before changing it** — Know what functionality exists and why
  before refactoring.
- **Consider the pros and cons of changes** — Don't make changes without thinking through
  implications.
- **Challenge your own assumptions** — Before asserting something can't be done, check the
  docs.
- **Think through the design before coding** — List endpoints, behaviors, operations,
  overlaps, and data needs.
- **Verify assumptions with data** — Query production data to confirm rather than
  guessing.
