# Subagent Models Configuration Reference

This document is the canonical shipped reference for `jl_subagent_models`
configuration. Use it when documenting, validating, or resolving subagent
model-selection settings in downstream repositories.

## Schema

```yaml
jl_subagent_models:
  default: "claude-sonnet-5"
  research: "claude-sonnet-5"
  implementation: "gpt-4-turbo"
  test_generation: "claude-opus-4.5"
  documentation: "claude-sonnet-5"
  overrides:
    my-research-task: "claude-opus-4.5"
```

## Hierarchy and precedence

Model selection resolves in this order, with each level allowed to override the
level below it:

1. per-task override: `jl_subagent_models.overrides.<task-key>`
2. per-delegation-type default: `jl_subagent_models.<delegation-type>`
3. per-agent default: the delegating skill's documented default model
4. global default: `jl_subagent_models.default`

If a requested model is unavailable in the current harness, the delegating
agent must fall back down the hierarchy until it finds an available model. The
delegation result should record both the requested model and the resolved
model.

## Supported delegation-type keys

Use these canonical keys in repository configuration:

- `research`
- `implementation`
- `test_generation`
- `documentation`

Additional bounded task keys may be added later, but they must remain
snake_case, stable, and documented by the delegating skill.

## Validation rules

- `jl_subagent_models` must be a mapping object.
- `default` should always be provided; if omitted, delegating skills fall back
  to their own documented hard default.
- top-level delegation-type entries must be strings naming recognized models.
- `overrides`, when present, must be a mapping of stable task keys to model
  names.
- model names must match a recognized family or explicit supported name such as
  `claude-sonnet-5`, `claude-opus-4.5`, `gpt-4-turbo`, `gpt-5.4`,
  `gpt-5.4-mini`, `gemini-3.5-flash`, or later recognized harness models.
- unknown or misspelled model names should be treated as validation warnings at
  minimum and must not be silently accepted as correct.
- a valid configured model can still be unavailable in a given harness; runtime
  resolution must check harness availability before use.

## Harness constraints

Different harnesses expose different model inventories. Copilot CLI usually has
the broadest set, while browser or extension harnesses may expose only a
subset. Configuration should prefer portable defaults where possible, and
delegating agents must warn when the requested model changes because the
current harness cannot honor it.
