# Quiz Validation Guide

This guide covers Requirements and Understanding Quizzes.
Shared fields and lifecycle rules are in `SHARED_BASE_SCHEMA.md`.

## Requirements Quiz

Use type `quiz-requirements`. At creation, require an objective, scope,
neutral Decision Statement, questions, and at least three checkable criteria.
Do not preselect answers or add reasoning for undecided choices.

At resolution, record confirmed requirements and every unanswered question.
Give each open question a sequential ID (`Q1`, `Q2`, etc.), full text, a Map
Fog of War link, and user acknowledgement.
Keep `recon:open-questions` while any question remains, even if the Quiz
closes. Remove it only when none remain. Record an empty list when all are
resolved.

The resolution data uses `openQuestions: [{ id, text, mapFogUrl, acknowledged }]`.
The ticket body repeats each ID, question, and link in the Open Questions
section.

## Understanding Quiz

Use type `quiz-understanding`. At creation, state the agent's Goal Model, offer two to five optional topic-related Questions, and explain why a check may help.

At resolution, record the user's responses and any mismatch or clarification.
A skip needs the user's choice and reason. A defer needs the user's choice and
reason and keeps the ticket open.

## Criteria

Each acceptance criterion is a separate checklist item with a unique, sequential ID starting at `AC001:`.
