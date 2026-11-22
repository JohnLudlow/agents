# Learn Validation Guide

Use this guide for new Learn tickets. Shared rules are in `SHARED_BASE_SCHEMA.md`.

## Creation

Require a Topic, Learning Goals, a proposed Explanation and Resources, and an
explicit invitation in Check Preference to choose whether a knowledge check
is useful. The user can choose during the lesson; do not require a choice or
check results at creation.

Require at least three checkable acceptance criteria at creation. Put each on
its own checklist line with sequential IDs starting at `AC001:`.

## Resolution

Require the delivered Explanation and Resources, Takeaways, and an
optional-check outcome. If the user selected a check, record its result and
feedback. If the user skipped it, record their choice and reason instead of
requiring results. A user-chosen defer records the choice and reason and stays
open in `Ready` or `In Progress`. Requiring a completed knowledge check despite
a recorded user-chosen skip is invalid.
