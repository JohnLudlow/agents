#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const apmYml = path.join(root, 'apm.yml');
const agentAgentMd = path.join(root, '.apm', 'agents', 'johnludlow-implementer.agent.md');
const agentLegacyMd = path.join(root, '.apm', 'agents', 'johnludlow-implementer.md');
const agentMd = fs.existsSync(agentAgentMd) ? agentAgentMd : agentLegacyMd;
const agentJson = path.join(root, '.apm', 'agents', 'johnludlow-implementer.json');

let failed = false;

function ok(msg){ console.log('✓', msg); }
function err(msg){ console.error('✗', msg); failed = true; }

if(!fs.existsSync(apmYml)) err('Missing apm.yml at repo root'); else ok('apm.yml exists');
if(!fs.existsSync(agentMd)) err(`Missing .apm agent markdown (checked: ${agentAgentMd} or ${agentLegacyMd})`); else ok(`.apm agent markdown exists: ${path.basename(agentMd)}`);
if(!fs.existsSync(agentJson)) err('Missing .apm/agents/johnludlow-implementer.json'); else ok('.apm agent json sidecar exists');

if(fs.existsSync(agentJson)){
  try{
    const j = JSON.parse(fs.readFileSync(agentJson,'utf8'));
    const missing = [];
    if(!j.description) missing.push('description');
    if(typeof j.mode === 'undefined') missing.push('mode');
    if(typeof j.temperature === 'undefined') missing.push('temperature');
    if(typeof j.permission === 'undefined') missing.push('permission');
    if(missing.length) err('agent sidecar missing fields: ' + missing.join(', ')); else ok('agent sidecar has required fields');
  }catch(e){ err('Failed to parse agent sidecar JSON: ' + e.message); }
}

process.exit(failed?1:0);
