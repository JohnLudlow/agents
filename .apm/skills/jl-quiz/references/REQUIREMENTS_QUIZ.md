# Requirements Quiz — workflow reference

Entry point: `/jl-quiz-requirements`. This is the Requirements Quiz
workflow, driven by the `jl_quiz_requirements` configuration block
(`jl_quiz_requirements.quiz_mode`, `plan_destination`,
`file_storage_location`), resolved through `jl-config` as described in
`jl-quiz/SKILL.md` BLOCKER 0.

The workflow is conversational (Mode A, in-chat interview by default): ask
one decision at a time and wait for the user's answer before the next one.

## Goal model (AC009, AC010)

1. Derive a goal model from the session context: a one-line objective plus
   the things the user is trying to achieve. Facts answerable from the
   repository are resolved by the agent itself and are never put to the
   user as decisions.
2. State the model to the user: "My goal model of this is: <objective> —
   please confirm or correct it."
3. The user confirms or corrects it; record the confirmed model as the
   opening of the Requirements Quiz record.

## Confirmed requirements (AC001, AC003)

For each question the agent asks, the user gives answers. For each answer:

1. Record the user's wording as a confirmed requirement.
2. Assign stable IDs at capture, sequentially and zero-padded — `REQ001`,
   `REQ002`, ... (AC003: stable IDs assigned to captured requirements;
   later phases re-read the record without renumbering).
3. Only requirements the user confirms are captured (AC001: the Requirements
   Quiz captures user-confirmed requirements). A requirement the agent
   stated as its own guess is not a confirmed requirement — it is moved to
   acknowledged open questions or recorded as open, never to the confirmed
   list.

Capture the record as the confirmed requirements list with their IDs.

## Acknowledged open questions (AC002)

The agent raises the open questions that matter most (a handful, say
three to five). The user may acknowledge an open question — a brief
statement of awareness or an explicit acknowledgement. Acknowledged open
questions are recorded as a separate list: "Acknowledged open questions",
with the user's acknowledgement noted against each item
(AC002: the Requirements Quiz records acknowledged open questions).

Open questions the user neither acknowledges nor rejects in this session
are not recorded.

## Link to the map's fog of war (AC004)

When the agent is working under a Recon map (the user says so, or the map
is known from the session) and the user's answers do not resolve some
acknowledged open question, the agent appends that open question to the map
as a new fog-of-war line or a note on an existing item, linked with the
provider-native link (GitHub `#nnn` or `https://.../issues/nnn`,
Azure DevOps `AB#nnn`, or a Markdown link) — never a floating reference
(AC004: the Requirements Quiz links unresolved questions to map fog).

If there is no map in play, this step is skipped.

## Wrap-up

Restate the objective plus every captured requirement and every
acknowledged open question and stop for the user's confirmation — the
shared-understanding rule of `jl-quiz/SKILL.md`.
