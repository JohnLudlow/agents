# Tour File Format

Reference for the CodeTour `.tour` JSON format: what fields exist, how CodeTour discovers tour files, and the checklist
for validating anchors before a tour is written. Facts verified against the microsoft/codetour source
(`src/store/index.ts`) and the official schema at <https://aka.ms/codetour-schema>.

## Tour-level fields

| Field | Required | Meaning |
|---|---|---|
| `$schema` | yes | `https://aka.ms/codetour-schema` |
| `title` | yes | Tour title shown in the tree view and player |
| `steps` | yes | Ordered array of steps; never empty |
| `description` | no | Short description of the tour |
| `ref` | no | Git ref (branch, tag, or commit) the tour is anchored to |
| `isPrimary` | no | `true` marks the tour CodeTour plays on `CodeTour: Start CodeTour` |
| `nextTour` | no | Title of the tour to play after this one finishes |
| `when` | no | VS Code "when" clause controlling tour availability |

## Step fields

| Field | Required | Meaning |
|---|---|---|
| `description` | yes | Markdown description of what to look at and why |
| `file` | one-of | Relative path of the file the step anchors to |
| `directory` | one-of | Directory the step anchors to |
| `contents` | one-of | Embedded file contents (exported tours) |
| `uri` | one-of | External URI the step opens |
| `view` | one-of | VS Code view the step focuses |
| `line` | no | 1-based line number the step highlights |
| `selection` | no | `{ start: { line, character }, end: { line, character } }` — highlighted range; lines 1-based, characters 0-based |
| `title` | no | Step title shown in the player |
| `commands` | no | Array of VS Code command IDs; a `>>` prefix runs a shell command in the integrated terminal |
| `pattern` | no | File pattern the step's marker applies to |
| `markerTitle` | no | Title for the step's gutter marker |

Exactly one of `file`, `directory`, `contents`, `uri`, `view` is set per step — they identify the step type. `line` and
`selection` are only meaningful on `file` steps. A `file` step without a `line` attaches its description to the last
line of the file — set `line` explicitly unless that is the intent.

## Line numbering

`line` and `selection.start.line` / `selection.end.line` are **1-based** in `.tour` files. CodeTour subtracts 1 when
constructing VS Code positions (which are 0-based). Selection `character` values are 0-based. Generate anchors in
1-based form and never adjust them.

## Discovery

CodeTour auto-discovers tours, recursively, in these directories:

- `.tours/` (primary)
- `.vscode/tours/`
- `.github/tours/`
- a custom directory if configured

plus root-level files `.tour`, `main.tour`, and `.vscode/main.tour`. There is no sidecar pattern and no index file. Tour
files are reloaded automatically when they change, so a committed tour is playable immediately.

## Anchor validation checklist

Before writing a tour, verify for every step:

- Exactly one of `file` / `directory` / `contents` / `uri` / `view` is set.
- `description` is non-empty.
- For `file` steps: the path exists relative to the repo root.
- For `file` steps with a `line`: `1 <= line <= <line count of the file>`.
- For `selection`: both start and end lines are within the file, and start is not after end.

A step that fails validation is fixed (correct path or line from the code) or dropped — never written as-is.

## Minimal valid tour

```json
{
  "$schema": "https://aka.ms/codetour-schema",
  "title": "My tour",
  "description": "What this tour walks through",
  "steps": [
    {
      "description": "This is where the app starts.",
      "file": "src/index.ts",
      "line": 1
    }
  ]
}
```
