/**
 * @johnludlow/agents Package Entry Point
 *
 * Re-exports all public APIs from the installation and management scripts.
 * This allows programmatic use of the agents installation system.
 */

// Installation functions
const {
  installPlatform,
  installOpenCodeConfig,
  main: install,
} = require("./scripts/install.js");

// Uninstallation functions
const { uninstallPlatform, uninstall } = require("./scripts/uninstall.js");

// Restoration functions
const { restorePlatform, restore } = require("./scripts/restore.js");

// CLI utilities
const { showHelp, showVersion } = require("./scripts/init.js");

/**
 * Public API
 */
module.exports = {
  // Installation
  install,
  installPlatform,
  installOpenCodeConfig,

  // Uninstallation
  uninstall,
  uninstallPlatform,

  // Restoration
  restore,
  restorePlatform,

  // CLI
  showHelp,
  showVersion,
};
