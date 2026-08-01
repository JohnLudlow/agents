# Relationships & Dependencies

## Related Skills

- **jl-issue-management** — Use when the resolved objective needs a
  home in a provider-native system (GitHub issue, Azure DevOps work item).
  This skill only surfaces and resolves decisions; jl-issue-management
  decides where resulting artifacts live.
- **jl-markdown-standards** — Use for the structure and formatting of
  any questionnaire document produced by this skill.
- **jl-planning-workflow** — This skill (quiz) is invoked during BLOCKER
  1 (Shared Understanding) in planning agents. The planning workflow skill
  orchestrates all BLOCKERs.
- **jl-subagent-spawning** — Reference this skill if you're implementing
  Phase 2 (harness detection) to understand when subagents can spawn quiz
  instances across different harnesses (CLI, browser, Azure DevOps).

## Dependency Flow

```text
Planning Agent (jl-planner)
  ↓
  BLOCKER 0: Preference Resolution (in this skill)
  ↓
  BLOCKER 1: Shared Understanding
    ↓
    Invoke jl-quiz (this skill, Mode A or B)
    ↓
    Returns: objective + resolved decisions
  ↓
  BLOCKER 2: Plan Target Selection (consult jl-issue-management)
  ↓
  BLOCKER 3: Issue Workflow (consult jl-issue-management)
  ↓
  Planning Steps (produce artifact)
  ↓
  Invoke jl-adversarial-review (before completion)
```

## How Other Skills Invoke This Skill

Any agent that needs to surface decisions before proceeding can invoke this
skill. Common patterns:

- **Planning agents** invoke during BLOCKER 1 (Shared Understanding)
- **Implementation agents** invoke before deciding on library/pattern choices
- **Documentation agents** invoke before deciding on audience/scope
- **Any agent** can invoke when facing a decision that only the user can answer

## Assets

- `assets/clarify-questionnaire-template.md` — Template for questionnaire documents
  (Mode B output). See SKILL.md Mode B section for usage.
