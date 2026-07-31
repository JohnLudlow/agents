# Examples

## Planning — Small Scope (Mode A)

> User: Add a "remember me" checkbox to the login form.
>
> Agent: Looking at the login form now — it currently issues a session
> cookie with no explicit expiry (a fact, resolved by reading the code).
> One decision: when "remember me" is checked, how long should the session
> last?
>
> User: 30 days.
>
> Agent: Understood. Objective: add a "remember me" checkbox that extends
> the session to 30 days when checked. Resolved: session length is 30 days
> when checked, unchanged otherwise. Confirm before I proceed?

## Planning — Large Scope (Mode B)

> User: We need multi-tenant billing support across the whole platform.
>
> Agent: This spans billing, auth, and provisioning — more open decisions
> than a chat interview handles well. I've drafted a questionnaire with the
> facts I could confirm from the code and the open decisions I need from
> you. Take your time and hand it back when ready.

## Implementation — Library Choice (Mode A)

> User: Implement the CSV export feature from the plan.
>
> Agent: The plan says "export to CSV" but doesn't specify a library. The
> project already uses `papaparse` for CSV parsing in the import flow (a
> fact). One decision: should I use `papaparse` for export too, or do you
> prefer a different library?
>
> User: Use papaparse.
>
> Agent: Understood. Using papaparse for CSV export, consistent with the
> existing import flow. Confirm before I proceed?

## Implementation — Design Pattern (Mode A)

> User: Add retry logic to the API client.
>
> Agent: The API client currently has no retry logic (a fact). Two
> decisions: (1) should retries use exponential backoff or fixed intervals?
> (2) What is the maximum retry count?
>
> User: Exponential backoff, max 3 retries.
>
> Agent: Understood. Exponential backoff with a maximum of 3 retries.
> Confirm before I proceed?

## Documentation — Audience (Mode A)

> User: Document the authentication module.
>
> Agent: The auth module has inline JSDoc but no standalone documentation
> (a fact). One decision: is this documentation aimed at API consumers
> (external), or at developers maintaining the module (internal)?
>
> User: Internal — for maintainers.
>
> Agent: Understood. Internal maintainer documentation for the auth module.
> Confirm before I proceed?
