# Documentation

This folder contains user-facing guides and reference documentation for working with JohnLudlow agents and skills.

## Getting Started

**New here?** Start with one of these:

- **[Installation Guide](INSTALLATION.md)** — How to install jl-agents on your platform
- **[Subagent Spawning and Fleet Mode](FLEET_MODE.md)** — Understand parallel agents, fleet mode, and how fallback works

## Core Topics

### Workflow and Spawning

- **[Subagent Spawning and Fleet Mode](FLEET_MODE.md)** — When to use fleet mode, how it parallelizes work, per-harness capabilities, and automatic fallback chains

### Configuration and Permissions

- **[Configuration Guide](CONFIGURATION.md)** — How to configure agents, skills, and system behavior
- **[Permissions](PERMISSIONS.md)** — Access control model for agents and delegated tasks

### Operations

- **[Installation Guide](INSTALLATION.md)** — Step-by-step install for different platforms
- **[Testing Installation](TESTING-INSTALLATION.md)** — Verify your installation works
- **[CI-CD Integration](CI-CD.md)** — How agents integrate with build and test pipelines

## Reference

- **[Implementation Summary](IMPLEMENTATION-SUMMARY.md)** — Overview of what's been implemented in this release

## For Developers

If you're implementing agents or extending this package:

- See the root **README.md** for agent descriptions and architecture
- See `.apm/skills/jl-subagent-spawning/SKILL.md` for subagent delegation APIs and model selection
- See `CONTRIBUTING.md` in the root for contribution guidelines
