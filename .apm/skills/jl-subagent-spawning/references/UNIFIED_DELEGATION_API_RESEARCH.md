# Unified Delegation API Research (#195)

This note captures research inputs used to shape the AC5.1 Phase 4 prototype
for a unified `DelegateToSubagent` API.

## Systems reviewed

| System | Relevant concept | Source |
|---|---|---|
| LangChain | Agent harness construction (`create_agent`) and positioning of subagent spawning in Deep Agents/LangGraph stack | <https://docs.langchain.com/oss/python/langchain/overview> |
| Ray | Stateful worker/actor abstraction, plus clear parallelism semantics (different actors in parallel, same actor serial) | <https://docs.ray.io/en/latest/ray-core/actors.html> |

## Key findings

1. **Unified entry point + composable runtime policy is the stable pattern.**  
   LangChain's "model + harness" framing maps to our need for a single
   delegation entry point with explicit policy hooks (mode selection, model
   fallback, and warnings), rather than many ad-hoc harness calls.
2. **Parallelism policy must be explicit and deterministic.**  
   Ray's actor semantics reinforce that concurrency behavior should be
   predictable and observable. For this repo, that means preserving the
   deterministic fallback chain: `fleet -> sequential -> inline`.
3. **Decision traces are part of the contract, not optional diagnostics.**  
   Both ecosystems emphasize runtime observability. For AC5.1 this translates
   to structured decision logs included with each delegation result.

## Design implications for this repository

- Keep `DelegationRequest` and `DelegationResult` as the source-of-truth
  contract in `SKILL.md`.
- Implement one-harness prototype first (Copilot CLI) to validate behavior
  without claiming cross-harness parity.
- Make model-resolution source explicit (`explicit`, `task-override`,
  `per-type`, `per-agent`, `global`, `fallback`) so fallback behavior is
  auditable.
- Keep non-CLI behavior conservative in this stage: inline fallback plus clear
  warning.

## Out of scope in #195

- Product commitment for a cross-harness callable API.
- Vendor-capability upgrades for Kiro/OpenCode/Pi.
- DAG-level orchestration beyond a single delegated call.
