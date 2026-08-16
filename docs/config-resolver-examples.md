# Config Resolver Worked Examples

These examples show how Phase 2 callers are expected to consume the shared
config resolver in Phase 5. They are based on current calling patterns in
`jl-quiz`, `jl-recon`, and `jl-issue-management`, which all describe the same
startup pattern:

1. define agent-owned defaults
2. resolve repository config from `CONTRIBUTING.md` and `AGENTS.md`
3. validate the resolved result for that agent or skill
4. continue with the resolved settings, prompting only when a required value is
   still not usable

The pseudocode is language-agnostic and uses the locked resolver API:

```text
resolveConfig({configKey, defaults, settingKeys?, paths?, includeSource?})
  returns {value: T, source: "agents" | "contributing" | "defaults", checkedFiles?: {...}}
```

See also:

- [Phase 2 config resolver map](./plans/phase-2-config-resolver.md)
- [`jl-config` resolution and merge rules](../.apm/skills/jl-config/SKILL.md)

## Shared Observations from Current Skills

- `jl-quiz` resolves config before interviews begin and then uses the resolved
  values for the rest of that skill invocation.
- `jl-recon` resolves a full config block up front because multiple later
  decisions depend on the same settings.
- `jl-issue-management` follows the same startup pattern and treats the
  resolved values as repository defaults that session overrides may supersede.
- The documented pattern is "resolve once at startup for the current skill or
  agent invocation", not "re-read on every branch".
- A shared skill invoked by multiple agents should resolve per invocation
  context, not keep a cross-agent global cache, because each call may run in a
  different repository or session.

## Example 1: Quiz Agent Resolves a Single Setting

Intent: `jl-quiz` needs `interview_mode` early to decide whether to run an
in-chat interview or a questionnaire-first flow.

```text
procedure startQuizAgent(debugMode)
  defaults :=
    interview_mode: "a"
    plan_destination: undefined
    file_storage_location: "docs/plans/"

  try
    result := resolveConfig({
      configKey: "jl_quiz",
      defaults: defaults,
      settingKeys: ["interview_mode"],
      includeSource: debugMode
    })

    interviewMode := result.value

    if interviewMode is not "a" and interviewMode is not "b"
      raise invalid_value("jl_quiz.interview_mode")

    if debugMode
      log("Resolved interview_mode", interviewMode, "from", result.source)
      log("Checked files", result.checkedFiles)

    if interviewMode = "a"
      runLiveInterview()
    else
      runQuestionnaireFirstFlow()

  catch error where error.kind = "invalid_value"
    warn("Quiz startup failed: interview_mode override is invalid")
    stopSkillUntilConfigIsFixed()

  catch error where error.kind = "required_missing"
    # This call asked only for interview_mode, which has a default.
    # If implementations still surface required_missing here, treat it as fatal.
    warn("Quiz startup failed: resolver contract violated for interview_mode")
    stopSkillUntilResolved()
end procedure
```

Default mode (`includeSource: false`) returns only the value:

```text
result = { value: "a" }
```

Debug mode (`includeSource: true`) may return:

```text
result =
  value: "b"
  source: "agents"
  checkedFiles:
    contributing: "found"
    agents: "found"
```

## Example 2: Recon Agent Resolves an Entire Config Block Atomically

Intent: `jl-recon` depends on several related settings. The whole block must
resolve all-or-nothing so later gates do not run with partial config.

```text
procedure startReconPass(debugMode)
  defaults :=
    decision_gates:
      destination_confirmation: false
      inciting_issue_confirmation: false
      research_afk: false
    uncertainty_tracking:
      pattern: "## Not Yet Specified (Fog of War)"

  try
    result := resolveConfig({
      configKey: "jl_recon",
      defaults: defaults,
      settingKeys: [
        "decision_gates.destination_confirmation",
        "decision_gates.inciting_issue_confirmation",
        "decision_gates.research_afk",
        "uncertainty_tracking.pattern"
      ],
      includeSource: debugMode
    })

    reconConfig := result.value

    validateBoolean(reconConfig.decision_gates.destination_confirmation)
    validateBoolean(reconConfig.decision_gates.inciting_issue_confirmation)
    validateBoolean(reconConfig.decision_gates.research_afk)
    validateMarkdownHeading(reconConfig.uncertainty_tracking.pattern)

    if debugMode
      log("Resolved jl_recon config from", result.source)
      log("Checked files", result.checkedFiles)

    runReconWorkflow(reconConfig)

  catch error where error.kind = "invalid_value"
    # Atomicity is explicit here:
    # one invalid setting means the entire jl_recon block fails.
    # Do not continue with partial gates from defaults plus partial overrides.
    warn("Recon config is invalid; abort entire recon startup")
    stopSkillUntilConfigIsFixed()

  catch error where error.kind = "required_missing"
    # If a required setting in the block is missing, the block also fails
    # atomically and no partial config is returned.
    warn("Recon config is incomplete; abort entire recon startup")
    stopSkillUntilResolved()
end procedure
```

Atomicity rule for block calls:

```text
If resolveConfig(...) is asked for a block or multiple settingKeys,
then either:
  - every requested setting resolves and validates, returning one value object
or:
  - the call throws and returns no partial object
```

## Example 3: Fallback-to-Prompt Flow for Missing Optional or Unusable Values

Intent: `jl-issue-management` or `jl-quiz` may accept repository defaults, but
still ask the human when a required operational choice is unresolved or unsafe
for the current harness.

```text
procedure choosePlanDestination(debugMode)
  defaults :=
    interview_mode: "a"
    plan_destination: undefined
    file_storage_location: "docs/plans/"

  try
    result := resolveConfig({
      configKey: "jl_quiz",
      defaults: defaults,
      settingKeys: ["plan_destination", "file_storage_location"],
      includeSource: debugMode
    })

    resolved := result.value

    if resolved.plan_destination is undefined
      # Optional at resolver level; required for this operation.
      # Graceful degradation: ask only for the still-missing value.
      destination := promptHumanForDestination()
      location := resolved.file_storage_location
      return makeSessionOverride(destination, location)

    if resolved.plan_destination = "local_file" and
       pathIsUnsafeOrUnavailable(resolved.file_storage_location)
      location := promptHumanForSafePath()
      return makeSessionOverride(resolved.plan_destination, location)

    if debugMode
      log("Resolved destination from", result.source)
      log("Checked files", result.checkedFiles)

    return resolved

  catch error where error.kind = "invalid_value"
    warn("Configured destination is invalid")
    stopSkillUntilConfigIsFixed()

  catch error where error.kind = "required_missing"
    # If an implementation marks plan_destination as required in this call,
    # prompt only if policy allows interactive recovery; otherwise fail.
    destination := promptHumanForDestination()
    return makeSessionOverride(destination, defaults.file_storage_location)
end procedure
```

Notes:

- Missing config files are not themselves an error; the resolver warns, offers
  scaffold guidance, and falls back to defaults.
- Prompting is a caller decision after resolution, not a resolver side effect.
- `includeSource: false` is the normal path; `includeSource: true` is for
  diagnostics, support, or tests.

## Example 4: Shared Skill Called by Multiple Agents

Intent: `jl-quiz` may be called from different agents. Cache within one
invocation if useful, but do not reuse config across unrelated invocations.

```text
procedure invokeSharedSkill(agentContext, debugMode)
  cacheKey := agentContext.session_id + ":" + agentContext.repository_root + ":jl_quiz"

  if invocationCache contains cacheKey
    return invocationCache[cacheKey]

  defaults :=
    interview_mode: "a"
    plan_destination: undefined
    file_storage_location: "docs/plans/"

  try
    result := resolveConfig({
      configKey: "jl_quiz",
      defaults: defaults,
      includeSource: debugMode
    })

    validated := validateQuizConfig(result.value)

    cachedResult :=
      value: validated
      source: result.source if debugMode
      checkedFiles: result.checkedFiles if debugMode

    invocationCache[cacheKey] := cachedResult
    return cachedResult

  catch error where error.kind in ["invalid_value", "required_missing"]
    # Do not cache failures as usable config.
    rethrow error
end procedure
```

Caching guidance:

- Cache only within the current invocation or session when repeated reads are
  likely in the same repository context.
- Do not maintain a cross-agent or cross-repository global cache.
- If a human gives a session override, prefer the override for that session
  without mutating repository defaults.

## Notes for Phase 5 Integration

- Agents and skills should resolve config near startup, before branching on
  behavior controlled by config.
- Single-setting calls are useful when one early decision unlocks the next
  workflow step.
- Multi-setting or whole-block calls are preferred when several later branches
  depend on the same coherent config object.
- Block resolution is atomic: no partial success object should escape a failed
  call.
- Debug mode should expose source metadata and checked files; default mode
  should stay minimal and return only the resolved value unless an error occurs.
