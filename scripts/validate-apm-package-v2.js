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

if(!fs.existsSync(agentMd)) err(`Missing .apm agent markdown (checked: ${agentAgentMd} or ${agentLegacyMd})`);
else ok(`.apm agent markdown exists: ${path.basename(agentMd)}`);

if(fs.existsSync(agentJson)){
  try{
    const j = JSON.parse(fs.readFileSync(agentJson,'utf8'));
    const missing = [];
    if(!j.description) missing.push('description');
    if(typeof j.mode === 'undefined') missing.push('mode');
    if(typeof j.temperature === 'undefined') missing.push('temperature');
    if(typeof j.permission === 'undefined') missing.push('permission');
    if(missing.length) err('agent sidecar JSON missing fields: ' + missing.join(', ')); else ok('agent sidecar JSON has required fields');
  }catch(e){ err('Failed to parse agent sidecar JSON: ' + e.message); }
} else {
  // parse YAML frontmatter from agentMd
  if(fs.existsSync(agentMd)){
    try{
      const text = fs.readFileSync(agentMd,'utf8');
      const m = text.match(/^---\s*[\r\n]+([\s\S]*?)\r?\n---/);
      if(!m) { err('No YAML frontmatter found in ' + path.basename(agentMd)); }
      else {
        const fm = m[1];
        const hasDescription = /(^|\r?\n)\s*description\s*:\s*.+/i.test(fm);
        const hasTemp = /(^|\r?\n)\s*temperature\s*:\s*.+/i.test(fm);
        if(!hasDescription) err('YAML frontmatter missing description'); else ok('agent frontmatter contains description');
        if(!hasTemp) err('YAML frontmatter missing temperature'); else ok('agent frontmatter contains temperature');
      }
    }catch(e){ err('Failed to read agent markdown: ' + e.message); }
  }
}

process.exit(failed?1:0);
