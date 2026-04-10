#!/usr/bin/env node

/**
 * @johnludlow/agents CLI Entry Point
 *
 * Provides a command-line interface for agent management.
 * Uses the refactored install, uninstall, and restore scripts.
 */

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
   uninstall                 Remove agents and skills (with restore option)
   restore                   Restore from latest backup
   generate-copilot          Generate GitHub Copilot format from OpenCode format
   list [--global]           List installed agents and skills
   help                      Show this help message
   version                   Show version information

Examples:
   johnludlow-agents install
   johnludlow-agents install --global
   johnludlow-agents list
   johnludlow-agents list --global
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
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  try {
    switch (command) {
      case "install": {
        // Set global flag if --global is passed
        if (args.includes("--global")) {
          process.env.npm_config_global = "true";
        }
        const { main: installMain } = require("./install.js");
        await installMain();
        break;
      }

      case "uninstall": {
        const { uninstall } = require("./uninstall.js");
        uninstall();
        break;
      }

      case "restore": {
        const { restore } = require("./restore.js");
        restore();
        break;
      }

      case "generate-copilot": {
        const { generate } = require("./generate-copilot.js");
        generate();
        break;
      }

      case "list": {
        // Set global flag if --global is passed
        if (args.includes("--global")) {
          process.env.npm_config_global = "true";
        }
        const { list } = require("./list.js");
        list();
        break;
      }

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
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { showHelp, showVersion };
