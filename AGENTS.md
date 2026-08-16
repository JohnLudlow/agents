# Agent Configuration Overrides

This file can optionally override repository-wide agent settings defined in
`CONTRIBUTING.md`, following the portable `jl-config` pattern.

## Valid Example Configuration

For this repository, agent configuration uses the following settings:

```yaml
jl_quiz:
  interview_mode: a
  plan_destination: github_issue
  file_storage_location: docs/plans/

jl_recon:
  decision_gates:
    destination_confirmation: false
    inciting_issue_confirmation: false
    research_afk: false
  uncertainty_tracking:
    pattern: "## Not Yet Specified (Fog of War)"

jl_issue_management:
  plan_destination: github_issue
  file_storage_location: docs/plans/
  decision_gates:
    destination_confirmation: false
    research_afk: false
```

Note: This example is in a code block and will not be validated.

## References

- Full configuration validation schema: `.apm/skills/jl-config/validation-rules.md`
- jl-config skill: `.apm/skills/jl-config/SKILL.md`
- Individual agent settings:
  - jl-quiz: `.apm/skills/jl-quiz/SKILL.md`
  - jl-recon: `.apm/skills/jl-recon/SKILL.md`
  - jl-issue-management: `.apm/skills/jl-issue-management/SKILL.md`
