#!/bin/bash

################################################################################
# @johnludlow/agents Release Installation Script
#
# Usage:
#   ./install-release.sh [VERSION] [--global]
#
# Examples:
#   ./install-release.sh              # Install latest version locally
#   ./install-release.sh 1.0.0        # Install specific version locally
#   ./install-release.sh latest --global  # Install latest version globally
#
# Prerequisites:
#   - bash 4.0+
#   - Node.js 22.0.0+
#   - npm
#   - curl or wget
#   - tar
#
################################################################################

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

readonly REPO="JohnLudlow/agents"
readonly PACKAGE_NAME="@johnludlow/agents"
readonly GITHUB_API="https://api.github.com/repos/$REPO"
readonly MIN_NODE_VERSION="22.0.0"
readonly VERSION="${1:-latest}"
readonly GLOBAL_INSTALL="${2:-}"
readonly TEMP_DIR="${TEMP_DIR:-${TMPDIR:-.}}"

# Flags
INSTALL_GLOBAL=false
if [[ "$GLOBAL_INSTALL" == "--global" || "$GLOBAL_INSTALL" == "-g" ]]; then
    INSTALL_GLOBAL=true
fi

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

write_header() {
    local message="$1"
    echo ""
    echo -e "${CYAN}$(printf '=%.0s' {1..70})${NC}"
    echo -e "${CYAN}${message}${NC}"
    echo -e "${CYAN}$(printf '=%.0s' {1..70})${NC}"
    echo ""
}

write_success() {
    local message="$1"
    echo -e "${GREEN}✓ ${message}${NC}"
}

write_warning() {
    local message="$1"
    echo -e "${YELLOW}⚠ ${message}${NC}"
}

write_error() {
    local message="$1"
    echo -e "${RED}✗ ${message}${NC}"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Compare semantic versions
# Returns: 0 if equal, 1 if version1 > version2, -1 if version1 < version2
compare_version() {
    local version1="$1"
    local version2="$2"
    
    local IFS=.
    local i ver1=($version1) ver2=($version2)
    
    for ((i = 0; i < ${#ver1[@]} && i < ${#ver2[@]}; i++)); do
        if ((10#${ver1[i]:-0} > 10#${ver2[i]:-0})); then
            echo 1
            return
        elif ((10#${ver1[i]:-0} < 10#${ver2[i]:-0})); then
            echo -1
            return
        fi
    done
    
    if ((${#ver1[@]} > ${#ver2[@]})); then
        echo 1
        return
    elif ((${#ver1[@]} < ${#ver2[@]})); then
        echo -1
        return
    fi
    
    echo 0
}

# Download a file using curl or wget
download_file() {
    local url="$1"
    local destination="$2"
    
    if command_exists curl; then
        curl -fsSL "$url" -o "$destination"
    elif command_exists wget; then
        wget -q -O "$destination" "$url"
    else
        write_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi
}

# Test Node.js version
test_node_version() {
    write_header "Checking Node.js version"
    
    if ! command_exists node; then
        write_error "Node.js is not installed or not in PATH"
        echo "Please install Node.js $MIN_NODE_VERSION or later from https://nodejs.org/"
        exit 1
    fi
    
    local node_version
    node_version=$(node --version | sed 's/v//')
    
    local cmp_result
    cmp_result=$(compare_version "$node_version" "$MIN_NODE_VERSION")
    
    if [[ $cmp_result -lt 0 ]]; then
        write_error "Node.js version $node_version is below minimum required version $MIN_NODE_VERSION"
        exit 1
    fi
    
    write_success "Node.js $node_version is compatible"
}

# Test npm availability
test_npm() {
    write_header "Checking npm"
    
    if ! command_exists npm; then
        write_error "npm is not installed or not in PATH"
        exit 1
    fi
    
    local npm_version
    npm_version=$(npm --version)
    write_success "npm $npm_version is available"
}

# Fetch release information from GitHub
get_release_info() {
    local version="$1"
    local url
    
    echo "Fetching release information from GitHub..."
    
    if [[ "$version" == "latest" ]]; then
        url="$GITHUB_API/releases/latest"
    else
        url="$GITHUB_API/releases/tags/v$version"
    fi
    
    local response
    if ! response=$(download_file "$url" /dev/stdout 2>&1); then
        write_error "Failed to fetch release information"
        echo "$response"
        exit 1
    fi
    
    # Check for 404 error
    if echo "$response" | grep -q "404"; then
        write_error "Release version '$version' not found"
        exit 1
    fi
    
    echo "$response"
}

# Extract download URL from release JSON
get_download_url() {
    local release_json="$1"
    
    echo "Looking for NPM package in release assets..."
    
    # Extract the .tgz asset URL
    local download_url
    download_url=$(echo "$release_json" | grep -o '"browser_download_url":"[^"]*\.tgz"' | head -1 | cut -d'"' -f4)
    
    if [[ -z "$download_url" ]]; then
        write_error "No NPM package (.tgz) found in release assets"
        echo "Available assets:"
        echo "$release_json" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/  - /'
        exit 1
    fi
    
    local filename
    filename=$(basename "$download_url")
    write_success "Found package: $filename"
    
    echo "$download_url"
}

# Create temporary directory
create_temp_directory() {
    local temp_dir
    temp_dir=$(mktemp -d "${TEMP_DIR}/johnludlow-agents-install.XXXXXX")
    echo "$temp_dir"
}

# Download the package
invoke_download() {
    local url="$1"
    local destination="$2"
    
    echo "Downloading from $url..."
    
    if ! download_file "$url" "$destination"; then
        write_error "Failed to download package"
        exit 1
    fi
    
    write_success "Downloaded to $destination"
}

# Extract the package
invoke_extract() {
    local tgz_file="$1"
    local extract_path="$2"
    
    echo "Extracting package..."
    
    if ! tar -xzf "$tgz_file" -C "$extract_path"; then
        write_error "Failed to extract package"
        exit 1
    fi
    
    write_success "Extracted to $extract_path"
}

# Install with npm
invoke_npm_install() {
    local package_path="$1"
    local is_global="$2"
    
    echo "Installing package with npm..."
    
    local install_args=()
    if [[ "$is_global" == "true" ]]; then
        install_args+=("--global")
    fi
    install_args+=("$package_path")
    
    if ! npm install "${install_args[@]}"; then
        write_error "npm install failed"
        exit 1
    fi
    
    write_success "Package installed successfully"
}

# Verify the installation
verify_installation() {
    echo "Verifying installation..."
    
    if npm list "$PACKAGE_NAME" >/dev/null 2>&1; then
        write_success "Installation verified"
        return 0
    else
        write_warning "Could not verify installation. Please run: npm list $PACKAGE_NAME"
        return 1
    fi
}

# Show post-install instructions
show_post_install_instructions() {
    write_header "Installation Complete!"
    
    echo "Next steps:"
    echo ""
    echo "1. Verify installation:"
    echo -e "   ${YELLOW}npm list @johnludlow/agents${NC}"
    echo ""
    echo "2. Use the agents in your projects:"
    echo -e "   - OpenCode: ${YELLOW}/agent johnludlow-feature-planner${NC}"
    echo -e "   - Copilot: ${YELLOW}copilot chat -a johnludlow-feature-planner${NC}"
    echo ""
    echo "3. For more information:"
    echo -e "   - View README: ${YELLOW}https://github.com/$REPO#readme${NC}"
    echo -e "   - View documentation: ${YELLOW}https://github.com/$REPO/blob/main/docs/${NC}"
    echo ""
}

# Cleanup temporary files
cleanup() {
    local temp_dir="$1"
    
    if [[ -d "$temp_dir" ]]; then
        echo "Cleaning up temporary files..."
        rm -rf "$temp_dir"
    fi
}

# Handle script exit
handle_exit() {
    local exit_code=$?
    cleanup "$WORK_DIR"
    
    if [[ $exit_code -ne 0 ]]; then
        write_error "Installation failed. Please check the output above for details."
    fi
    
    exit $exit_code
}

trap handle_exit EXIT

# ============================================================================
# Main Installation Flow
# ============================================================================

write_header "Installing $PACKAGE_NAME"

# Validate prerequisites
test_node_version
test_npm

# Create working directory
WORK_DIR=$(create_temp_directory)
write_success "Created temporary directory: $WORK_DIR"

# Fetch release information
release_json=$(get_release_info "$VERSION")
write_success "Found release in GitHub"

# Get download URL
download_url=$(get_download_url "$release_json")

# Download package
package_file="$WORK_DIR/package.tgz"
invoke_download "$download_url" "$package_file"

# Extract package
extract_dir="$WORK_DIR/extracted"
mkdir -p "$extract_dir"
invoke_extract "$package_file" "$extract_dir"

# Find the package directory (usually "package")
package_dir="$extract_dir/package"
if [[ ! -d "$package_dir" ]]; then
    package_dir="$extract_dir"
fi

# Install with npm
invoke_npm_install "$package_dir" "$INSTALL_GLOBAL"

# Verify installation
verify_installation

# Show post-install instructions
show_post_install_instructions

exit 0
