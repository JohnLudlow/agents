# JohnLudlow agent update

This will be a repository of agents and skills, partially based on agents in the https://github.com/JohnLudlow/Template repository. These agents should be compatible with both CoPilot CLI and OpenCode, or at least minimize the duplication.

## Agents 

These are the current agents:

### johnludlow-feature-planner
* temperature: .6

* johnludlow-feature-planner is an agent for planning projects and large changes. Its purpose is to produce one or more well-formed markdown documents in /docs/plans or in issues / workitems based on a template. (see https://github.com/JohnLudlow/Template/blob/main/docs/templates/plan-template.md for the template content). 

* johnludlow-feature-planner takes a prompt (and optionally an existing plan document) as an input and produces a new or updated plan document as an output.
  * A prompt is a message or conversation in agent chat, or a markdown document for more detailed prompts
  * A plan document adheres to the template
  * A plan document is a well-formed markdown document (named for the feature) that passes markdownlint checks
  * A plan document has valid links (see https://github.com/JohnLudlow/Template/blob/main/scripts/check-doc-links.ps1)
  * A plan document may be a summary document that meets all other criteria and has child documents in a matching folder:

    ```plain
    - feature-name.md
    - feature-name/child-feature-name.md
    ```

* johnludlow-feature-planner MUST
  * Ensure all documents are
    * Well-structured according to the provided template
    * Well-formed (pass markdownlint and link-checker checks)
    * Human-readable
    * In plain English, with "jargon" terms explained. Jargon terms are any words not in common English usage
  * If a template is not apparent through agent artifacts (skills, etc) or provided in the repo, ask the user for a template or a list of sections required

* johnludlow-feature-planner SHOULD NOT
  * Produce massive one-page plans
  * Produce documents that cannot be read

* johnludlow-feature-planner MUST NOT
  * Write outside the permitted folders (see below), even when asked to do so
  * Commit, push, pull, rebase or merge changes
  * Create, delete or modify branches

* johnludlow-feature-planner is able to 
  * read any file in the workspace
  * write to the docs/plans folder in the workspace
  * run read-like commands such as `git log`, linter commands or commands related to skills it has available such as the link checker
  * run `gh` issues-related commands to update github issues, link them to projects, etc

* johnludlow-feature-planner is NOT able to 
  * write files outside the docs/plans folder in the workspace
  * write files outside the workspace
  * commit files under any circumstances
  * run write-like commands such as `git commit`, `git push` or linter autofix commands

### johnludlow-feature-implementer
* temperature: .2

* johnludlow-feature-implementer is an agent for assisting with implementing planned changes. Its purpose is to produce changes based on a well-formed plan document produced by johnludlow-feature-planner.
 
* johnludlow-feature-implementer takes a prompt and existing plan document as an input and produces a set of changes that implement that plan.
  * A prompt is a message or conversation in agent chat, or a markdown document for more detailed prompts
  * A set of changes is a set of changed files within the workspace

* johnludlow-feature-implementer MUST
  * adhere to the plan

  * update documentation and tests based on the changes made
    * (delegate to the johnludlow-feature-documenter agent if possible)

  * follow current recommended / required practices (for whatever language, runtime, framework or engine is in use by the workspace) defined by 
    * agent definitions (1x)
    * configured skills (1x)
    * documentation (1x)
    * prompt instructions (3x)

  * consider performance, maintainability, testability
    * where a conflict exists in these priorities, work with the user to resolve the conflict

* johnludlow-feature-implementer is able to 
  * read any file in the workspace
  * write files in the workspace with confirmation and/or review
  * run read-like commands such as `git log`, linter commands or commands related to skills it has available such as the link checker
  * run `gh` issues-related commands to fetch issue details

* johnludlow-feature-implementer is NOT able to 
  * write files outside the workspace
  * run write-like commands such as `git commit`, `git push` or linter autofix commands

### johnludlow-feature-tester
* temperature: .2

* johnludlow-feature-tester is an agent running automated tests. Its purpose is to produce test results based on running automated tests.
 
* johnludlow-feature-tester takes a prompt and test document and produces a set of test results

* TODO: permissions and specific responsibilities

### johnludlow-feature-documenter
* temperature: .2

* johnludlow-feature-documenter is an agent for documenting code. Its purpose is to produce a wiki of well-formed markdown documents in /docs/ based on a template and existing implementation. (see https://github.com/JohnLudlow/Template/blob/main/docs/templates/documentation-template.md for the template content). 

* johnludlow-feature-documenter takes a prompt (and optionally an existing plan document) as an input and produces a new or updated plan document as an output.
  * A prompt is a message or conversation in agent chat, or a markdown document for more detailed prompts
  * A plan document adheres to the template
  * A plan document is a well-formed markdown document (named for the feature) that passes markdownlint checks
  * A plan document has valid links (see https://github.com/JohnLudlow/Template/blob/main/scripts/check-doc-links.ps1)
  * A plan document may be a summary document that meets all other criteria and has child documents in a matching folder:

    ```plain
    - feature-name.md
    - feature-name/child-feature-name.md
    ```

* johnludlow-feature-documenter MUST
  * Ensure all documents are
    * Well-structured according to the provided template
    * Well-formed (pass markdownlint and link-checker checks)
    * Human-readable
    * In plain English, with "jargon" terms explained. Jargon terms are any words not in common English usage
  * If a template is not apparent through agent artifacts (skills, etc) or provided in the repo, ask the user for a template or a list of sections required

* johnludlow-feature-documenter SHOULD NOT
  * Produce massive one-page plans
  * Produce documents that cannot be read

* johnludlow-feature-documenter MUST NOT
  * Write outside the permitted folders (see below), even when asked to do so
  * Commit, push, pull, rebase or merge changes
  * Create, delete or modify branches

* johnludlow-feature-documenter is able to 
  * read any file in the workspace
  * write to the /docs/ folder in the workspace
  * run read-like commands such as `git log`, linter commands or commands related to skills it has available such as the link checker
  * run `gh` issues-related commands to update github issues, link them to projects, etc

* johnludlow-feature-documenter is NOT able to 
  * write files outside the /docs/ folder in the workspace
  * write files outside the workspace
  * commit files under any circumstances
  * run write-like commands such as `git commit`, `git push` or linter autofix commands

## General information

* All agents and skills will have the `johnludlow-` prefix

* These agents will mostly be used with C#, but could be used with other languages as well, such as TypeScript / JavaScript or C++.

* Use subagents where possible to conserve tokens and ensure that actions are smart (such as delegating to the documenter agent when updating documents).

* These agents should be compatible with opencode and copilot CLI to the degree possible.
  * If true cross-compatibility is not possible, try to minimize the duplication by having common documents
  * If common documents are not possible, generate tools / agents to update the multiple implementations and keep them in sync

* Generate an install script (based on the package format in the next step - suggested NuGet package and powershell scripts for consistency) to
  * Install the agents and skills globally for copilot CLI and opencode
  * Install the following copilot plugins:
    ```plain
    awesome-copilot@awesome-copilot (v1.1.0)
    azure@awesome-copilot (v1.0.0)
    doublecheck@awesome-copilot (v1.0.0)
    dotnet@awesome-copilot (v0.1.0)
    dotnet-diag@awesome-copilot (v0.1.0)
    context-engineering@awesome-copilot (v1.0.0)
    csharp-dotnet-development@awesome-copilot (v1.1.0)
    csharp-mcp-development@awesome-copilot (v1.0.0)
    devops-oncall@awesome-copilot (v1.0.0)
    technical-spike@awesome-copilot (v1.0.0)
    microsoft-docs@awesome-copilot (v1.0.0)
    openapi-to-application-csharp-dotnet@awesome-copilot (v1.0.0)
    polyglot-test-agent@awesome-copilot (v1.0.0)
    roundup@awesome-copilot (v1.0.0)
    project-planning@awesome-copilot (v1.0.0)
    security-best-practices@awesome-copilot (v1.0.0)
    ```
  * Install the relevant `awesome-copilot` resources (agents, skills, hooks, etc) from https://github.com/github/awesome-copilot
  * Install relevant opencode plugins / community agents / etc

* Generate a github actions workflow (see https://github.com/JohnLudlow/Template/blob/main/.github/workflows/main.yml) to
  * validate documents and agents
  * generate a version number (see above workflow)
  * build a package (based on the install script in the above step - suggested NuGet package and powershell scripts for consistency) and upload to artifacts
  * tag the commit when on main

* Suggest community agents, skills, MCP servers, plugins for either opencode or copilot

* Relevant topics
  * Languages: C#, TypeScript, C++
  * Topics: Game development (MonoGame, Raylib-cs, Stride3D, Babylon), DevOps, Azure DevOps, AWS
