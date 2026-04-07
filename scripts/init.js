#!/usr/bin/env node

/**
 * @johnludlow/agents CLI Entry Point
 *
 * Provides a command-line interface for agent management.
 */

const { installAgentsAndSkills, installCopilotPlugins } = require("./install.js");
const { uninstall } = require("./uninstall.js");
const { generate } = require("./generate-copilot.js");
const { restore } = require("./restore.js");

/**
 * Display help message
 */
function showHelp() {
  console.log(`
@johnludlow/agents CLI

Usage:
  johnludlow-agents [command] [options]

Commands:
  install [--global]        Install agents and skills
  uninstall                 Remove agents and skills
  restore                   Restore from latest backup
  generate-copilot          Generate GitHub Copilot format
  help                      Show this help message
  version                   Show version information

Examples:
  johnludlow-agents install
  johnludlow-agents install --global
  johnludlow-agents uninstall
  johnludlow-agents restore
  johnludlow-agents generate-copilot

For more information, visit: https://github.com/JohnLudlow/agents
  `);
}

/**
 * Show version information
 */
function showVersion() {
  const packageJson = require("../package.json");
  console.log(`@johnludlow/agents v${packageJson.version}`);
}

/**
 * Main CLI function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  try {
    switch (command) {
      case "install":
        console.log("Installing agents and skills...\n");
        // Set global flag if --global is passed
        if (args.includes("--global")) {
          process.env.npm_config_global = "true";
        }
        const { installAgentsAndSkills } = require("./install.js");
        const mode = process.env.npm_config_global === "true" ? "global" : "local";
        installAgentsAndSkills(mode);
        break;

      case "uninstall":
        uninstall();
        break;

      case "restore":
        restore();
        break;

      case "generate-copilot":
      case "generate":
        generate();
        break;

      case "version":
      case "-v":
      case "--version":
        showVersion();
        break;

      case "help":
      case "-h":
      case "--help":
        showHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Run CLI
if (require.main === module) {
  main();
}

module.exports = { showHelp, showVersion };
