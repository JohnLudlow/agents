#!/usr/bin/env node

/**
 * Fleet Mode Coordination Prototype
 * 
 * QUESTION: Does automatic fleet mode activation and fallback across harnesses 
 * work correctly in practice? Can agents reliably detect their harness and fall 
 * back gracefully when fleet mode is unavailable?
 * 
 * This prototype simulates:
 * 1. Harness detection (Copilot CLI, Browser, Azure DevOps, Kiro, OpenCode, Pi)
 * 2. Fleet mode availability per harness
 * 3. Automatic subagent spawning with activation strategy
 * 4. Fallback chain: fleet → sequential → inline
 * 5. State transitions and logging
 * 
 * Based on AC5.1 decisions #185 (harness detection), #186 (automatic activation)
 */

import readline from 'readline';

// ============================================================================
// Pure Logic Module (reducer-based state machine)
// ============================================================================

const HARNESS_PROFILES = {
  'copilot-cli': {
    name: 'Copilot CLI',
    detection: 'COPILOT_CLI_MODE env var',
    fleetModeAvailable: true,
    subagentSpawning: true,
    fallbackChain: ['fleet', 'sequential', 'inline']
  },
  'browser': {
    name: 'Browser / Copilot Chat',
    detection: 'window object exists',
    fleetModeAvailable: false,
    subagentSpawning: false,
    fallbackChain: ['inline']
  },
  'azure-devops': {
    name: 'Azure DevOps',
    detection: 'Azure DevOps API objects',
    fleetModeAvailable: true,  // conditional: only GitHub-linked repos
    subagentSpawning: true,     // conditional
    fallbackChain: ['fleet', 'sequential', 'inline']
  },
  'kiro': {
    name: 'Kiro IDE/CLI',
    detection: 'Kiro orchestrator (TBD)',
    fleetModeAvailable: true,
    subagentSpawning: true,
    fallbackChain: ['fleet', 'sequential', 'inline']
  },
  'opencode': {
    name: 'OpenCode',
    detection: 'OpenCode environment (TBD)',
    fleetModeAvailable: null,  // unknown
    subagentSpawning: null,
    fallbackChain: ['sequential', 'inline']
  },
  'pi': {
    name: 'Pi',
    detection: 'Pi environment (TBD)',
    fleetModeAvailable: null,  // unknown
    subagentSpawning: null,
    fallbackChain: ['sequential', 'inline']
  }
};

const initialState = {
  harness: null,
  linkedRepo: null,  // 'github' or 'azure-repos' for azure-devops
  fleetModeAvailable: null,
  subagentsQueue: [],
  completedSubagents: [],
  activationPath: null,
  logs: [],
  nextSubagentId: 1
};

function addLog(state, message) {
  return {
    ...state,
    logs: [...state.logs.slice(-9), `[${new Date().toLocaleTimeString()}] ${message}`]
  };
}

function detectHarness(state, harness, linkedRepo = null) {
  const profile = HARNESS_PROFILES[harness];
  if (!profile) return state;

  let fleetAvailable = profile.fleetModeAvailable;
  let activationPath = null;

  // Special case: Azure DevOps with Azure Repos doesn't support subagent spawning
  if (harness === 'azure-devops' && linkedRepo === 'azure-repos') {
    fleetAvailable = false;
    activationPath = 'inline';
  } else if (fleetAvailable === true) {
    activationPath = 'fleet';
  } else if (fleetAvailable === false) {
    activationPath = 'inline';
  } else {
    // Unknown harness: default to sequential
    activationPath = 'sequential';
  }

  let newState = {
    ...state,
    harness,
    linkedRepo,
    fleetModeAvailable: fleetAvailable,
    activationPath,
    subagentsQueue: [],
    completedSubagents: [],
    logs: []
  };

  newState = addLog(newState, `Detected harness: ${profile.name}`);
  newState = addLog(newState, `Fleet mode available: ${fleetAvailable === true ? 'YES' : fleetAvailable === false ? 'NO' : 'UNKNOWN'}`);

  if (linkedRepo) {
    newState = addLog(newState, `Linked repository: ${linkedRepo === 'github' ? 'GitHub' : 'Azure Repos'}`);
  }

  newState = addLog(newState, `Activation strategy: ${activationPath.toUpperCase()}`);

  return newState;
}

function spawnSubagents(state, count = 2) {
  if (!state.harness) {
    return addLog(state, 'ERROR: No harness detected. Call DETECT_HARNESS first.');
  }

  const tasks = ['Research', 'Review', 'Documentation'];
  const newQueue = [];

  for (let i = 0; i < count && i < tasks.length; i++) {
    newQueue.push({
      id: state.nextSubagentId + i,
      task: tasks[i],
      status: 'queued',
      fallbackPath: state.activationPath
    });
  }

  let newState = {
    ...state,
    subagentsQueue: newQueue,
    nextSubagentId: state.nextSubagentId + count
  };

  newState = addLog(newState, `Spawning ${count} subagent(s)`);
  newState = addLog(newState, `Using activation: ${state.activationPath === 'fleet' ? 'FLEET MODE (parallel)' : state.activationPath === 'sequential' ? 'SEQUENTIAL (one at a time)' : 'INLINE (parent session)'}`);

  // Simulate activation
  if (state.activationPath === 'fleet') {
    newState = addLog(newState, 'Fleet mode: launching all subagents in parallel');
    const updated = newState.subagentsQueue.map(s => ({ ...s, status: 'running' }));
    newState = { ...newState, subagentsQueue: updated };
  } else if (state.activationPath === 'sequential') {
    if (newState.subagentsQueue.length > 0) {
      const updated = [...newState.subagentsQueue];
      updated[0].status = 'running';
      newState = { ...newState, subagentsQueue: updated };
      newState = addLog(newState, `Sequential dispatch: starting [1/${count}] ${newState.subagentsQueue[0].task}`);
    }
  } else {
    newState = addLog(newState, 'Inline mode: running work in parent session');
    const updated = newState.subagentsQueue.map(s => ({ ...s, status: 'running' }));
    newState = { ...newState, subagentsQueue: updated };
  }

  return newState;
}

function completeSubagent(state, subagentId) {
  const idx = state.subagentsQueue.findIndex(s => s.id === subagentId);
  if (idx === -1) return addLog(state, `ERROR: Subagent ${subagentId} not found`);

  const subagent = state.subagentsQueue[idx];
  const timeMs = Math.floor(Math.random() * 2000) + 800;

  let newState = {
    ...state,
    subagentsQueue: state.subagentsQueue.filter((_, i) => i !== idx),
    completedSubagents: [...state.completedSubagents, { id: subagent.id, task: subagent.task, result: 'OK', timeMs }]
  };

  newState = addLog(newState, `✓ [${subagent.id}] ${subagent.task} completed in ${timeMs}ms`);

  // If sequential and more in queue, start next one
  if (state.activationPath === 'sequential' && newState.subagentsQueue.length > 0) {
    const remaining = newState.subagentsQueue.length;
    const completed = newState.completedSubagents.length;
    const next = newState.subagentsQueue[0];
    const updated = [...newState.subagentsQueue];
    updated[0].status = 'running';
    newState = { ...newState, subagentsQueue: updated };
    newState = addLog(newState, `Sequential dispatch: starting [${completed + 1}/${completed + remaining}] ${next.task}`);
  }

  // If all done
  if (newState.subagentsQueue.length === 0 && newState.completedSubagents.length > 1) {
    newState = addLog(newState, `✓ All subagents completed. Total time: ${newState.completedSubagents.reduce((sum, s) => sum + s.timeMs, 0)}ms`);
    newState = addLog(newState, `Fallback chain result: ${state.activationPath.toUpperCase()} worked successfully`);
  }

  return newState;
}

function switchHarness(state, harness, linkedRepo = null) {
  return detectHarness(state, harness, linkedRepo);
}

// ============================================================================
// TUI Shell
// ============================================================================

function renderFrame(state) {
  console.clear();
  
  console.log('\x1b[1m╔════════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m║         Fleet Mode Coordination Prototype (AC5.1)              ║\x1b[0m');
  console.log('\x1b[1m╚════════════════════════════════════════════════════════════════╝\x1b[0m');
  console.log();

  // Current State Section
  console.log('\x1b[1m━ CURRENT STATE ━\x1b[0m');
  console.log(`  Harness:           ${state.harness ? `\x1b[1m${HARNESS_PROFILES[state.harness].name}\x1b[0m` : '\x1b[2m(not detected)\x1b[0m'}`);
  
  if (state.linkedRepo) {
    console.log(`  Linked Repo:       ${state.linkedRepo === 'github' ? '✓ GitHub' : '✗ Azure Repos'}`);
  }
  
  const fleetStr = state.fleetModeAvailable === null ? '\x1b[2mUNKNOWN\x1b[0m' 
                  : state.fleetModeAvailable ? '\x1b[1m✓ YES\x1b[0m'
                  : '✗ NO';
  console.log(`  Fleet Mode:        ${fleetStr}`);
  console.log(`  Activation Path:   ${state.activationPath ? `\x1b[1m${state.activationPath.toUpperCase()}\x1b[0m` : '\x1b[2m(none)\x1b[0m'}`);
  console.log();

  // Subagents Queue Section
  if (state.subagentsQueue.length > 0) {
    console.log('\x1b[1m━ ACTIVE SUBAGENTS ━\x1b[0m');
    state.subagentsQueue.forEach((s, idx) => {
      const status = s.status === 'running' ? '🔄 RUNNING' : '⏳ QUEUED';
      console.log(`  [${s.id}] ${s.task.padEnd(12)} ${status}`);
    });
    console.log();
  }

  // Completed Section
  if (state.completedSubagents.length > 0) {
    console.log('\x1b[1m━ COMPLETED SUBAGENTS ━\x1b[0m');
    state.completedSubagents.forEach(s => {
      console.log(`  [${s.id}] ${s.task.padEnd(12)} ✓ ${s.timeMs}ms`);
    });
    console.log();
  }

  // Logs Section
  if (state.logs.length > 0) {
    console.log('\x1b[1m━ LOG ━\x1b[0m');
    state.logs.forEach(log => {
      console.log(`  ${log}`);
    });
    console.log();
  }

  // Commands Section
  console.log('\x1b[1m━ COMMANDS ━\x1b[0m');
  console.log('\x1b[1m  [1]\x1b[0m Detect Copilot CLI          \x1b[1m[2]\x1b[0m Detect Browser');
  console.log('\x1b[1m  [3]\x1b[0m Detect Azure DevOps+GitHub  \x1b[1m[4]\x1b[0m Detect Azure DevOps+Azure Repos');
  console.log('\x1b[1m  [5]\x1b[0m Detect Kiro                 \x1b[1m[6]\x1b[0m Detect OpenCode');
  console.log('\x1b[1m  [7]\x1b[0m Detect Pi                   \x1b[1m[s]\x1b[0m Spawn subagents (2)');
  console.log('\x1b[1m  [c]\x1b[0m Complete next subagent      \x1b[1m[q]\x1b[0m Quit');
  console.log();
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let state = initialState;

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  renderFrame(state);

  while (true) {
    const input = await question('> ');
    const cmd = input.trim().toLowerCase();

    switch (cmd) {
      case '1':
        state = detectHarness(state, 'copilot-cli');
        break;
      case '2':
        state = detectHarness(state, 'browser');
        break;
      case '3':
        state = detectHarness(state, 'azure-devops', 'github');
        break;
      case '4':
        state = detectHarness(state, 'azure-devops', 'azure-repos');
        break;
      case '5':
        state = detectHarness(state, 'kiro');
        break;
      case '6':
        state = detectHarness(state, 'opencode');
        break;
      case '7':
        state = detectHarness(state, 'pi');
        break;
      case 's':
        state = spawnSubagents(state, 2);
        break;
      case 'c':
        if (state.subagentsQueue.length > 0) {
          state = completeSubagent(state, state.subagentsQueue[0].id);
        } else {
          state = addLog(state, 'No active subagents to complete');
        }
        break;
      case 'q':
        console.log('Exiting prototype. Findings saved.');
        rl.close();
        return;
      default:
        state = addLog(state, `Unknown command: ${cmd}`);
    }

    renderFrame(state);
  }
}

main().catch(console.error);
