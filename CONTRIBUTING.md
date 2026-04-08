# Contributing Guide

Thank you for your interest in contributing to the johnludlow agents and skills
repository!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your changes
4. Make your changes
5. Test your changes
6. Submit a pull request

## Code Standards

### Agent Definitions

When creating or modifying agent definitions:

1. **Required Sections**
   - Description: Brief overview of the agent
   - Temperature: Creativity level (0.0-1.0)
   - Purpose: What the agent does
   - Inputs: What the agent accepts
   - Outputs: What the agent produces
   - Requirements: MUST, SHOULD, MUST NOT clauses
   - Capabilities: What the agent can do
   - Restrictions: What the agent cannot do
   - Integration: How it works with other agents

2. **Naming Convention**
   - All agent names start with `johnludlow-`
   - Use hyphen-separated names (e.g., `johnludlow-feature-planner`)
   - File names match agent names with `.md` extension

3. **Documentation**
   - Use clear, plain English
   - Define any technical jargon
   - Include examples where helpful
   - Link to related agents and skills

### Skill Definitions

When creating or modifying skills:

1. **Required Sections**
   - Overview: What the skill covers
   - Key principles or standards
   - Language-specific guidance (if applicable)
   - Examples where appropriate

2. **Naming Convention**
   - All skill names start with `johnludlow-`
   - Use descriptive names (e.g., `johnludlow-code-quality`)
   - File names match skill names with `.md` extension

3. **Standards**
   - Focus on practical, actionable guidance
   - Include examples from supported languages (C#, TypeScript, C++)
   - Link to official documentation where helpful

### Templates

When creating or updating templates:

1. **Structure**
   - Include YAML frontmatter with title, description, author, date
   - Use clear section headings (h2)
   - Provide helpful comments or placeholders
   - Include example content where appropriate

2. **Validation**
   - Must pass markdownlint checks
   - Should be concise but complete
   - Should guide users through the document structure

## Testing Changes

Before submitting a pull request:

1. **Markdown Validation**

```bash
npm install -g markdownlint-cli
markdownlint '.github/agents/*.md' '.github/skills/*.md' \
  'docs/templates/*.md' '*.md'
```

1. **Installation Testing**

- Test installation on any platform:

```bash
npm install
```

- Or run the install script directly:

```bash
node scripts/install.js
```

- For local testing without global install:

```bash
npm run install:local
```

1. **Agent Definition Validation**

- Ensure all required sections are present
- Check that file names match agent/skill names
- Verify links are valid and properly formatted

## Pull Request Guidelines

1. **Title**: Use a clear, descriptive title
   - Good: "Add new johnludlow-performance-analyzer agent"
   - Bad: "Updates"

2. **Description**: Explain what you changed and why
   - What problem does this solve?
   - What files did you modify?
   - Did you add new agents, skills, or templates?

3. **Changes**: Keep pull requests focused
   - One feature or fix per pull request
   - Don't mix multiple changes in one PR
   - Reference any related issues

4. **Testing**: Confirm you tested your changes
   - Markdown validation passes
   - Installation scripts work
   - Links are valid

## Common Tasks

### Adding a New Agent

1. Create a new file in `agents/` named `johnludlow-[agent-name].md`
2. Follow the standard agent definition structure
3. Include all required sections
4. Update the README.md with the new agent
5. Add the agent to the GitHub Actions validation workflow
6. Run `node scripts/install.js` to verify it installs correctly

### Adding a New Skill

1. Create a new file in `skills/` named `johnludlow-[skill-name].md`
2. Follow the standard skill definition structure
3. Include practical guidance and examples
4. Link from relevant agent definitions
5. Update the README.md with the new skill

### Adding a New Template

1. Create a new file in `docs/templates/` named `[document-type]-template.md`
2. Follow the existing template format and do not add YAML frontmatter
3. Provide clear structure with helpful placeholders
4. Include example content where appropriate
5. Update the README.md to reference the new template

## Release Process

Releases are handled automatically via GitHub Actions:

1. Merge your changes to the `main` branch
2. GitHub Actions validates your changes
3. A version number is automatically generated
4. Artifacts (tar.gz and zip) are created
5. The commit is tagged with the new version

## Questions or Issues?

- Open a GitHub Issue for bug reports
- Start a Discussion for questions or suggestions
- Review existing issues before opening a new one

## Code of Conduct

Please be respectful and inclusive in all interactions. We welcome contributions
from developers of all experience levels.

---

Thank you for contributing to johnludlow agents and skills!
