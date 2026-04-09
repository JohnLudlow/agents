#!/usr/bin/env node

/**
 * Release Notes Generator
 *
 * Generates comprehensive release notes from:
 * - package.json version
 * - Git commit history
 * - Previous release tags
 * - CHANGELOG.md (if exists)
 *
 * Output format includes:
 * - Version number
 * - Release date
 * - Installation instructions
 * - Changelog entries
 * - Contributors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// Configuration
// ============================================================================

const GITHUB_REPO = 'JohnLudlow/agents';
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main`;
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

// ============================================================================
// Helper Functions
// ============================================================================

function readPackageJson() {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
        throw new Error('package.json not found');
    }
    return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
}

function getLatestTag() {
    try {
        return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch {
        return null;
    }
}

function getCommitHistory(fromTag, toRef = 'HEAD') {
    try {
        const format = '%H|%h|%s|%an|%ae|%aI';
        let command = `git log --pretty=format:"${format}"`;
        
        if (fromTag) {
            command += ` ${fromTag}..${toRef}`;
        } else {
            command += ` ${toRef}`;
        }
        
        const output = execSync(command, { encoding: 'utf8' });
        
        return output
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [hash, shortHash, subject, author, email, date] = line.split('|');
                return { hash, shortHash, subject, author, email, date };
            });
    } catch (error) {
        console.warn('Warning: Could not get commit history:', error.message);
        return [];
    }
}

function categorizeCommits(commits) {
    const categories = {
        features: [],
        fixes: [],
        docs: [],
        refactor: [],
        perf: [],
        test: [],
        chore: [],
        other: []
    };
    
    commits.forEach(commit => {
        const subject = commit.subject.toLowerCase();
        
        if (subject.startsWith('feat')) {
            categories.features.push(commit);
        } else if (subject.startsWith('fix')) {
            categories.fixes.push(commit);
        } else if (subject.startsWith('docs')) {
            categories.docs.push(commit);
        } else if (subject.startsWith('refactor')) {
            categories.refactor.push(commit);
        } else if (subject.startsWith('perf')) {
            categories.perf.push(commit);
        } else if (subject.startsWith('test')) {
            categories.test.push(commit);
        } else if (subject.startsWith('chore')) {
            categories.chore.push(commit);
        } else {
            categories.other.push(commit);
        }
    });
    
    return categories;
}

function formatCommitList(commits) {
    if (commits.length === 0) return '';
    
    return commits
        .map(commit => {
            // Remove conventional commit prefix if present
            let subject = commit.subject
                .replace(/^(feat|fix|docs|refactor|perf|test|chore)(\(.+?\))?:\s*/, '')
                .trim();
            
            // Capitalize first letter
            subject = subject.charAt(0).toUpperCase() + subject.slice(1);
            
            return `- ${subject} ([${commit.shortHash}](https://github.com/${GITHUB_REPO}/commit/${commit.hash})) - ${commit.author}`;
        })
        .join('\n');
}

function getContributors(commits) {
    const contributors = new Map();
    
    commits.forEach(commit => {
        if (!contributors.has(commit.email)) {
            contributors.set(commit.email, {
                name: commit.author,
                email: commit.email,
                commits: 0
            });
        }
        contributors.get(commit.email).commits += 1;
    });
    
    // Sort by commit count descending
    return Array.from(contributors.values())
        .sort((a, b) => b.commits - a.commits)
        .slice(0, 20); // Top 20 contributors
}

function readChangelog() {
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) {
        return '';
    }
    
    const content = fs.readFileSync(changelogPath, 'utf8');
    // Extract the first release section
    const match = content.match(/## \[.+?\]\(.+?\)\s*(?:\n(?!##).+)*/s);
    return match ? match[0] : '';
}

function generateInstallationInstructions(version) {
    return `## Installation

### Quick Start (Recommended)

The simplest way to install is directly from the release package using npx:

**Windows (PowerShell):**

\`\`\`powershell
npx https://github.com/JohnLudlow/agents/releases/download/v${version}/johnludlow-agents-${version}.tgz install --global
\`\`\`

**macOS/Linux (Bash):**

\`\`\`bash
npx https://github.com/JohnLudlow/agents/releases/download/v${version}/johnludlow-agents-${version}.tgz install --global
\`\`\`

### Or Install Locally

To install in the current project instead of globally:

\`\`\`bash
npm install https://github.com/JohnLudlow/agents/releases/download/v${version}/johnludlow-agents-${version}.tgz
\`\`\`

### Verification

After installation, verify it worked:

\`\`\`bash
npm list @johnludlow/agents
\`\`\`

For help with installation, see the [Installation Guide](https://github.com/JohnLudlow/agents/blob/main/docs/INSTALLATION.md).`;
}

function generateReleaseNotes(version) {
    const latestTag = getLatestTag();
    const commits = getCommitHistory(latestTag);
    const categories = categorizeCommits(commits);
    const contributors = getContributors(commits);
    const changelog = readChangelog();
    const date = new Date().toISOString().split('T')[0];
    
    let notes = `# Release v${version}\n\n`;
    
    // Release metadata
    notes += `**Released**: ${date}\n\n`;
    
    // Installation instructions
    notes += generateInstallationInstructions(version) + '\n\n';
    
    // Changelog from CHANGELOG.md if exists
    if (changelog) {
        notes += `## Release Notes\n\n${changelog}\n\n`;
    }
    
    // Features
    if (categories.features.length > 0) {
        notes += `## ✨ Features\n\n${formatCommitList(categories.features)}\n\n`;
    }
    
    // Fixes
    if (categories.fixes.length > 0) {
        notes += `## 🐛 Bug Fixes\n\n${formatCommitList(categories.fixes)}\n\n`;
    }
    
    // Performance improvements
    if (categories.perf.length > 0) {
        notes += `## ⚡ Performance Improvements\n\n${formatCommitList(categories.perf)}\n\n`;
    }
    
    // Documentation
    if (categories.docs.length > 0) {
        notes += `## 📚 Documentation\n\n${formatCommitList(categories.docs)}\n\n`;
    }
    
    // Refactoring
    if (categories.refactor.length > 0) {
        notes += `## 🔧 Refactoring\n\n${formatCommitList(categories.refactor)}\n\n`;
    }
    
    // Tests
    if (categories.test.length > 0) {
        notes += `## ✅ Tests\n\n${formatCommitList(categories.test)}\n\n`;
    }
    
    // Other changes
    if (categories.other.length > 0) {
        notes += `## 📦 Other Changes\n\n${formatCommitList(categories.other)}\n\n`;
    }
    
    // Contributors
    if (contributors.length > 0) {
        notes += `## 👥 Contributors\n\n`;
        notes += contributors
            .map(c => `- **${c.name}** (${c.commits} commits)`)
            .join('\n');
        notes += '\n\n';
    }
    
    // Links
    notes += `## Links\n\n`;
    notes += `- [Compare Changes](https://github.com/${GITHUB_REPO}/compare/${latestTag || 'initial'}...v${version})\n`;
    notes += `- [Full Commit History](https://github.com/${GITHUB_REPO}/commits/v${version})\n`;
    notes += `- [Release Assets](https://github.com/${GITHUB_REPO}/releases/tag/v${version})\n`;
    
    return notes;
}

// ============================================================================
// Main
// ============================================================================

function main() {
    try {
        // Get version from environment variable (set by GitHub Actions)
        // Falls back to package.json for local testing
        let version = process.env.RELEASE_VERSION;
        
        if (!version) {
            const pkg = readPackageJson();
            version = pkg.version;
        }
        
        // Generate release notes
        const notes = generateReleaseNotes(version);
        
        // Output
        console.log(notes);
        
        // Also save to file for reference
        const outputPath = path.join(process.cwd(), '.release-notes.md');
        fs.writeFileSync(outputPath, notes, 'utf8');
        console.error(`\n✓ Release notes saved to ${outputPath}`);
        
    } catch (error) {
        console.error('Error generating release notes:', error.message);
        process.exit(1);
    }
}

main();
