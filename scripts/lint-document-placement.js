#!/usr/bin/env node

/**
 * Linter: Document Placement Violations
 * 
 * Scans .apm/agents/ and .apm/skills/ for ACTUAL violations: where shipped code
 * would try to read or reference repo-local files that don't exist in downstream repos.
 * 
 * Does NOT flag:
 * - Documentation about AGENTS.md or CONTRIBUTING.md (e.g., "jl-config reads from...")
 * - Example code blocks showing how to use config files
 * - YAML frontmatter descriptions
 * - Comments explaining the framework
 * 
 * See AGENTS.md "Repository Structure and Document Placement Rules" for the full framework.
 * 
 * Usage: node scripts/lint-document-placement.js [--verbose]
 *   --verbose: Show all violations (not just CRITICAL)
 */

const fs = require('fs');
const path = require('path');

// Patterns that indicate an ACTUAL problem (code would fail in other repos)
const CRITICAL_PATTERNS = [
  // Code patterns that reference repo-local paths
  /require\s*\(\s*['"](\.\.?\/)?CONTRIBUTING\.md['\"]/,
  /require\s*\(\s*['"](\.\.?\/)?AGENTS\.md['\"]/,
  /readFileSync\s*\(\s*['"](\.\.?\/)?CONTRIBUTING\.md['\"]/,
  /readFileSync\s*\(\s*['"](\.\.?\/)?AGENTS\.md['\"]/,
  /require\s*\(\s*['"](\.\.?\/)?docs\//,
  /require\s*\(\s*['"](\.\.?\/)?scripts\//,
  /readFileSync\s*\(\s*['"](\.\.?\/)?docs\//,
  /readFileSync\s*\(\s*['"](\.\.?\/)?scripts\//,
  // Config paths that point to repo-local files
  /file_storage_location\s*:\s*['"](\.\.?\/)?\/docs\//,
  /path\s*:\s*['"](\.\.?\/)?\/docs\//,
  /template_path\s*:\s*['"](\.\.?\/)?\/docs\//,
];

let violations = [];

/**
 * Scan a file for actual code violations
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    CRITICAL_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: index + 1,
          severity: 'CRITICAL',
          message: `References repo-local path that will not be available in downstream repos`,
          snippet: line.trim(),
        });
      }
    });
  });
}

/**
 * Scan directory recursively
 */
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.forEach(entry => {
    if (entry.name.startsWith('.')) {
      return; // Skip hidden files
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.js'))) {
      scanFile(fullPath);
    }
  });
}

/**
 * Format and print violations
 */
function reportViolations(viols) {
  if (viols.length === 0) {
    console.log('✅ No document placement violations found.');
    return 0;
  }

  console.error(`\n❌ Found ${viols.length} document placement violation(s):\n`);

  viols.forEach(v => {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    Message: ${v.message}`);
    console.error(`    Code: ${v.snippet}`);
    console.error();
  });

  console.error(`\nSee AGENTS.md "Repository Structure and Document Placement Rules" for guidance.`);

  return 1;
}

// Main
const verbose = process.argv.includes('--verbose');

console.log('Linting document placement in .apm/agents/ and .apm/skills/...\n');

const apmAgentsDir = path.join(__dirname, '..', '.apm', 'agents');
const apmSkillsDir = path.join(__dirname, '..', '.apm', 'skills');

if (fs.existsSync(apmAgentsDir)) {
  console.log(`Scanning ${apmAgentsDir}...`);
  scanDirectory(apmAgentsDir);
}

if (fs.existsSync(apmSkillsDir)) {
  console.log(`Scanning ${apmSkillsDir}...`);
  scanDirectory(apmSkillsDir);
}

process.exit(reportViolations(violations));
