#!/bin/bash
# Install script for johnludlow agents and skills
# Usage: ./install.sh

set -e

# Parse arguments
OPENCODE=false
COPILOT_CLI=false
INSTALL_PATH=""
ALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --opencode)
            OPENCODE=true
            shift
            ;;
        --copilot-cli)
            COPILOT_CLI=true
            shift
            ;;
        --install-path)
            INSTALL_PATH="$2"
            shift 2
            ;;
        --all)
            ALL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# If no options specified, install for all
if [ "$OPENCODE" = false ] && [ "$COPILOT_CLI" = false ] && [ "$ALL" = false ]; then
    ALL=true
fi

if [ "$ALL" = true ]; then
    OPENCODE=true
    COPILOT_CLI=true
fi

# Get default install path
if [ -z "$INSTALL_PATH" ]; then
    INSTALL_PATH="$HOME/.local/share/agents"
fi

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Installing johnludlow agents and skills to: $INSTALL_PATH"

# Create installation directory
mkdir -p "$INSTALL_PATH"

# Install agents
echo ""
echo "Installing agents..."
AGENT_DIR="$SCRIPT_PATH/.github/agents"
DEST_AGENT_DIR="$INSTALL_PATH/agents"
mkdir -p "$DEST_AGENT_DIR"
cp "$AGENT_DIR"/*.md "$DEST_AGENT_DIR" 2>/dev/null || true
echo "Agents installed to: $DEST_AGENT_DIR"

# Install skills
echo ""
echo "Installing skills..."
SKILL_DIR="$SCRIPT_PATH/.github/skills"
DEST_SKILL_DIR="$INSTALL_PATH/skills"
mkdir -p "$DEST_SKILL_DIR"
cp "$SKILL_DIR"/*.md "$DEST_SKILL_DIR" 2>/dev/null || true
echo "Skills installed to: $DEST_SKILL_DIR"

# Install templates
echo ""
echo "Installing templates..."
TEMPLATE_DIR="$SCRIPT_PATH/docs/templates"
DEST_TEMPLATE_DIR="$INSTALL_PATH/templates"
mkdir -p "$DEST_TEMPLATE_DIR"
cp "$TEMPLATE_DIR"/*.md "$DEST_TEMPLATE_DIR" 2>/dev/null || true
echo "Templates installed to: $DEST_TEMPLATE_DIR"

# Copilot CLI setup
if [ "$COPILOT_CLI" = true ]; then
    echo ""
    echo "Setting up Copilot CLI..."
    if command -v copilot &> /dev/null; then
        echo "Copilot CLI found at: $(command -v copilot)"
        
        echo ""
        echo "Installing Copilot plugins..."
        plugins=(
            "awesome-copilot@awesome-copilot"
            "azure@awesome-copilot"
            "doublecheck@awesome-copilot"
            "dotnet@awesome-copilot"
            "dotnet-diag@awesome-copilot"
            "context-engineering@awesome-copilot"
            "csharp-dotnet-development@awesome-copilot"
            "csharp-mcp-development@awesome-copilot"
            "devops-oncall@awesome-copilot"
            "technical-spike@awesome-copilot"
            "microsoft-docs@awesome-copilot"
            "openapi-to-application-csharp-dotnet@awesome-copilot"
            "polyglot-test-agent@awesome-copilot"
            "roundup@awesome-copilot"
            "project-planning@awesome-copilot"
            "security-best-practices@awesome-copilot"
        )
        
        for plugin in "${plugins[@]}"; do
            echo "Installing $plugin..."
            if copilot plugin install "$plugin" 2>/dev/null; then
                echo "  ✓ Installed"
            else
                echo "  ✗ Failed (plugin may already be installed)"
            fi
        done
    else
        echo "Copilot CLI not found. Please install it first:"
        echo "  npm install -g @github/copilot-cli"
    fi
fi

# OpenCode setup
if [ "$OPENCODE" = true ]; then
    echo ""
    echo "Setting up OpenCode..."
    if command -v opencode &> /dev/null; then
        echo "OpenCode found at: $(command -v opencode)"
        echo "Note: Manually configure agents in your OpenCode settings"
    else
        echo "OpenCode not found. Please install it first:"
        echo "  npm install -g @anomalyco/opencode"
    fi
fi

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Configure your agent tool with the installed agents and skills"
echo "2. Copy relevant agents from $DEST_AGENT_DIR to your tool's agent directory"
echo "3. Copy relevant skills from $DEST_SKILL_DIR to your tool's skills directory"
echo ""
echo "For more information, see the README.md in the repository"
