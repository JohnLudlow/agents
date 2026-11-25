## Configuration

jl-recon reads settings from `jl_recon` configuration in `CONTRIBUTING.md`
and `AGENTS.md`. It uses `jl-config` only for the generic resolution
mechanism; jl-recon owns this schema, its defaults, and its validation.

### Schema

| Setting | Type | Allowed values | Default | Sensitivity |
| --- | --- | --- | --- | --- |
| `decision_gates.destination_confirmation` | boolean | `true`, `false` | `false` | required by recon |
| `decision_gates.inciting_issue_confirmation` | boolean | `true`, `false` | `false` | required by recon |
| `decision_gates.research_afk` | boolean | `true`, `false` | `false` | required by recon |
| `uncertainty_tracking.pattern` | string | any markdown heading string | `## Not Yet Specified (Fog of War)` | optional |
| `model_selection.default` | string | `inherit` or recognized model name | `inherit` | optional |
| `model_selection.map` | string | `inherit` or recognized model name | inherits `model_selection.default` | optional |
| `model_selection.research` | string | `inherit` or recognized model name | inherits `model_selection.default` | optional |
| `model_selection.prototype` | string | `inherit` or recognized model name | inherits `model_selection.default` | optional |
| `model_selection.quiz_requirements` | string | `inherit` or recognized model name | inherits `model_selection.default` | optional |
| `model_selection.quiz_understanding` | string | `inherit` or recognized model name | inherits `model_selection.default` | optional |
| `model_selection.learn` | string | `inherit` or recognized model name | inherits `model_selection.default` | optional |
| `model_selection.prerequisite` | string | `inherit` or recognized model name | inherits `model_selection.default` | optional |
| `model_selection.ticket_resolution_checks` | string | `inherit` or recognized model name | inherits `model_selection.default` | optional |
| `model_selection.status_report_checks` | string | `inherit` or recognized model name | inherits `model_selection.default` | optional |
| `labels.default` | array of strings | any label names | `["recon:map"]` | optional |
| `labels.map` | array of strings | any label names | defaults to `labels.default` | optional |
| `labels.research` | array of strings | any label names | defaults to `labels.default` | optional |
| `labels.prototype` | array of strings | any label names | defaults to `labels.default` | optional |
| `labels.quiz_requirements` | array of strings | any label names | defaults to `labels.default` | optional |
| `labels.quiz_understanding` | array of strings | any label names | defaults to `labels.default` | optional |
| `labels.learn` | array of strings | any label names | defaults to `labels.default` | optional |
| `labels.prerequisite` | array of strings | any label names | defaults to `labels.default` | optional |
| `title_format.<ticket-type>` | string | non-empty title template | type-specific pattern | optional |
| `checks.on_ticket_resolution_enabled` | boolean | `true`, `false` | `true` | optional |
| `checks.on_status_report_enabled` | boolean | `true`, `false` | `true` | optional |
| `checks.timeout_seconds` | integer | any positive integer | `30` | optional |

### Legacy aliases (compatibility)

For backward compatibility, jl-recon also accepts:

- `model_selection.mode2_checks` (alias of `model_selection.ticket_resolution_checks`)
- `model_selection.mode3_checks` (alias of `model_selection.status_report_checks`)

If both a canonical key and its legacy alias are present, the canonical key
wins.

Canonical keys follow AC2.0 and ADS-STE100's human-readable naming guidance:
`ticket_resolution_checks` and `status_report_checks`.

### Validation and defaults

- validate that `jl_recon`, if present, is an object
- validate `decision_gates`, if present, as an object of booleans
- validate `uncertainty_tracking`, if present, as an object
- validate `model_selection`, if present, as an object with keys limited to:
  `default`, `map`, `research`, `prototype`, `quiz_requirements`,
  `quiz_understanding`, `learn`, `prerequisite`, `ticket_resolution_checks`,
  `status_report_checks` (legacy aliases `mode2_checks`, `mode3_checks` also accepted)
- validate each `model_selection.*` value as a non-empty string
- validate each configured model value as either `inherit` or a recognized model name
- validate `labels`, if present, as an object with keys limited to: `default`,
  `map`, `research`, `prototype`, `quiz_requirements`, `quiz_understanding`,
  `learn`, `prerequisite`
- validate each `labels.*` value as an array of non-empty strings
- validate that no `labels.*` array is empty
- validate `title_format`, if present, as an object with keys limited to:
  `map`, `research`, `prototype`, `quiz_requirements`, `quiz_understanding`,
  `learn`, `prerequisite`; each value must be a non-empty string
- validate `checks`, if present, as an object with keys limited to:
  `on_ticket_resolution_enabled` (boolean), `on_status_report_enabled` (boolean),
  `timeout_seconds` (positive integer)
- validate `checks.timeout_seconds` is a positive integer if present; values ≤ 0
  are treated as invalid and default to 30
- default each missing decision gate to `false`
- default missing `uncertainty_tracking.pattern` to
  `## Not Yet Specified (Fog of War)`
- default `model_selection.default` to `inherit`
- default each type-specific `model_selection` key and both check keys to
  inherit from `model_selection.default`
- default `labels.default` to `["recon:map"]`
- default each type-specific `labels` key to inherit from `labels.default`
- default `title_format` to the built-in pattern for each ticket type
- default `checks.on_ticket_resolution_enabled` to `true`
- default `checks.on_status_report_enabled` to `true`
- apply resolved label values when creating maps and tickets, per the resolved behavior below
- apply resolved gate values at their workflow decision points rather than
  relying on separate hardcoded gate rules
- apply resolved checks configuration when Mode 2 (ticket resolution) or Mode 3 (status report) runs
- apply resolved model-selection values when delegating ticket work and checks

### Example configuration

In `CONTRIBUTING.md`:

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: false
    inciting_issue_confirmation: false
    research_afk: false
  uncertainty_tracking:
    pattern: "## Not Yet Specified (Fog of War)"
  model_selection:
    default: "inherit"
    map: "inherit"
    research: "claude-sonnet-5"
    quiz_requirements: "inherit"
    quiz_understanding: "inherit"
    learn: "inherit"
    prerequisite: "inherit"
    ticket_resolution_checks: "gpt-5.4-mini"
    status_report_checks: "claude-sonnet-5"
  checks:
    on_ticket_resolution_enabled: true
    on_status_report_enabled: true
  labels:
    default:
      - "recon:map"
    map:
      - "recon:map"
      - "planning"
    research:
      - "recon:research"
    prototype:
      - "recon:prototype"
    quiz_requirements:
      - "recon:quiz-requirements"
    quiz_understanding:
      - "recon:quiz-understanding"
    learn:
      - "recon:learn"
    prerequisite:
      - "recon:prerequisite"
  title_format:
    map: "Map: {destination}"
    research: "Research: {topic}"
    prototype: "Prototype: {concept}"
    quiz_requirements: "Quiz (Requirements): {question}"
    quiz_understanding: "Quiz (Understanding): {question}"
    learn: "Learn: {topic}"
    prerequisite: "Prerequisite: {work}"
```

In `AGENTS.md`:

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: true
  model_selection:
    default: "claude-sonnet-5"
    ticket_resolution_checks: "gpt-5.4-mini"
  checks:
    on_ticket_resolution_enabled: true
    on_status_report_enabled: true
  labels:
    map:
      - "recon:map"
      - "planning"
      - "urgent"
```
