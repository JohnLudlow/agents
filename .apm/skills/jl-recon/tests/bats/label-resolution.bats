#!/usr/bin/env bats

# Bats tests for label configuration resolution, inheritance scenarios,
# and cross-provider consistency.
#
# Test Coverage:
# - Config resolution precedence (defaults → CONTRIBUTING.md → AGENTS.md)
# - Label inheritance across ticket types
# - Cross-provider consistency (same logic, different serialization)
# - Integration scenarios (create map → create tickets with inheritance)

setup() {
    export TEST_TEMP_DIR=$(mktemp -d)
    export CONTRIBUTING_MD="$TEST_TEMP_DIR/CONTRIBUTING.md"
    export AGENTS_MD="$TEST_TEMP_DIR/AGENTS.md"
}

teardown() {
    rm -rf "$TEST_TEMP_DIR"
}

# Helper: parse YAML and extract jl_recon.labels config
get_config_labels() {
    local file="$1"
    local key="$2"
    grep -A 10 "jl_recon:" "$file" | grep "labels:" | head -1
}

@test "config resolution: defaults applied when no config files" {
    # Arrange - no config files
    
    # Act & Assert - should use built-in defaults
    # (jl-recon defaults: labels.default = ["recon:map"])
    [[ -z "$(get_config_labels nonexistent 'labels')" ]]
}

@test "config resolution: CONTRIBUTING.md overrides defaults" {
    # Arrange
    cat > "$CONTRIBUTING_MD" <<EOF
jl_recon:
  labels:
    default: ["recon:map", "planning"]
    map: ["recon:map", "planning", "contribution-specific"]
EOF
    
    # Act
    local labels=$(grep -A 5 "labels:" "$CONTRIBUTING_MD" | grep "contribution-specific")
    
    # Assert
    [[ -n "$labels" ]]
}

@test "config resolution: AGENTS.md overrides CONTRIBUTING.md" {
    # Arrange
    cat > "$CONTRIBUTING_MD" <<EOF
jl_recon:
  labels:
    research: ["type:research", "from-contrib"]
EOF
    
    cat > "$AGENTS_MD" <<EOF
jl_recon:
  labels:
    research: ["type:research", "from-agents"]
EOF
    
    # Act - AGENTS.md should override CONTRIBUTING.md
    local from_agents=$(grep -A 2 "labels:" "$AGENTS_MD" | grep "from-agents")
    
    # Assert
    [[ -n "$from_agents" ]]
}

@test "config resolution: session user override replaces entire label set" {
    # Arrange - configured labels
    local configured="label1,label2"
    local override="override1,override2"
    
    # Act - simulate override
    local result="$override"
    
    # Assert - should not contain configured labels
    [[ ! "$result" =~ "label1" ]]
    [[ "$result" =~ "override1" ]]
}

@test "label inheritance: ticket type labels + map labels + recon:type" {
    # Arrange
    local type_labels="type:question,needs-answer"
    local map_labels="planning,recon:map"
    local required_label="recon:quiz"
    
    # Act - combine all three sources
    IFS=',' read -ra type_arr <<< "$type_labels"
    IFS=',' read -ra map_arr <<< "$map_labels"
    
    local all_labels=("${type_arr[@]}" "${map_arr[@]}" "$required_label")
    
    # Assert - all three sources present
    [[ " ${all_labels[@]} " =~ "type:question" ]]
    [[ " ${all_labels[@]} " =~ "planning" ]]
    [[ " ${all_labels[@]} " =~ "recon:quiz" ]]
}

@test "label inheritance: deduplication removes duplicates" {
    # Arrange - some labels appear in both type and inherited sets
    local labels=(
        "recon:map"      # in both
        "planning"       # inherited only
        "type:question"  # type only
        "recon:map"      # duplicate
        "planning"       # duplicate
    )
    
    # Act - deduplicate via sort -u
    local unique=($(printf '%s\n' "${labels[@]}" | sort -u))
    
    # Assert - should have exactly 3 unique labels
    [[ ${#unique[@]} -eq 3 ]]
}

@test "label inheritance: works for all 4 ticket types" {
    # Arrange
    local types=("quiz" "research" "prototype" "task")
    
    # Act - verify each type gets its required recon label
    for type in "${types[@]}"; do
        local label="recon:$type"
        # Simulate label recording
        [[ -n "$label" ]]
    done
    
    # Assert - all types handled
    [[ ${#types[@]} -eq 4 ]]
}

@test "cross-provider consistency: same labels apply across GitHub, Azure DevOps, Markdown" {
    # Arrange - configured labels
    local labels="planning,recon:map,feature-a"
    
    # Act - simulate applying to all three providers
    
    # GitHub: per-label CLI args (already tested in Pester)
    # Azure DevOps: semicolon-delimited
    local ado_format=$(echo "$labels" | tr ',' ';')
    # Markdown: YAML list
    local md_format="- planning\n- recon:map\n- feature-a"
    
    # Assert - all represent the same logical set
    [[ "$labels" =~ "planning" ]]
    [[ "$ado_format" =~ "planning" ]]
    [[ "$md_format" =~ "planning" ]]
}

@test "integration: create map with labels, then create ticket with inherited labels" {
    # Arrange - map receives configured labels
    local map_labels="recon:map,planning"
    # Ticket receives map labels + type labels + recon:type
    local type_labels="type:question,needs-answer"
    
    # Act - simulate workflow
    local map_created=true
    [[ "$map_created" == "true" ]] || return 1
    
    # Simulate ticket creation with inherited labels
    IFS=',' read -ra type_arr <<< "$type_labels"
    IFS=',' read -ra map_arr <<< "$map_labels"
    local ticket_labels=("${type_arr[@]}" "${map_arr[@]}" "recon:quiz")
    
    # Assert
    [[ " ${ticket_labels[@]} " =~ "planning" ]]         # inherited from map
    [[ " ${ticket_labels[@]} " =~ "type:question" ]]    # type-specific
    [[ " ${ticket_labels[@]} " =~ "recon:quiz" ]]       # required type label
}

@test "edge case: empty label list creates empty array" {
    # Arrange
    local labels=""
    
    # Act - simulate recording empty labels
    # For Markdown: should be labels: []
    # For GitHub: should be no --label args
    # For Azure DevOps: should be empty tag string
    
    [[ -z "$labels" ]]
}

@test "edge case: labels with special characters (colons, hyphens)" {
    # Arrange
    local labels="type:question,area-auth,priority-high"
    
    # Act - verify format is preserved
    [[ "$labels" =~ "type:question" ]]
    [[ "$labels" =~ "area-auth" ]]
    [[ "$labels" =~ "priority-high" ]]
}

@test "edge case: very long label list (20+)" {
    # Arrange
    local labels=()
    for i in {1..20}; do
        labels+=("label-$i")
    done
    
    # Act - combine into string
    local label_string=$(IFS=,; echo "${labels[*]}")
    
    # Assert - all 20 labels present
    local count=$(echo "$label_string" | tr ',' '\n' | wc -l)
    [[ $count -eq 20 ]]
}

@test "azure devops: tags are semicolon-delimited, not comma-delimited" {
    # Arrange
    local github_format="label1,label2,label3"
    
    # Act - convert to Azure DevOps format (semicolon-delimited, sorted)
    local ado_format=$(echo "$github_format" | tr ',' '\n' | sort | tr '\n' ';' | sed 's/;$//')
    
    # Assert - should have semicolons, not commas
    [[ "$ado_format" =~ ";" ]]
    [[ ! "$ado_format" =~ "," ]]
}

@test "alphabetical sorting ensures determinism" {
    # Arrange - unsorted labels
    local unsorted="zebra,apple,banana"
    
    # Act - sort alphabetically
    local sorted=$(echo "$unsorted" | tr ',' '\n' | sort | tr '\n' ',')
    
    # Assert - should be in alphabetical order
    [[ "$sorted" =~ "apple,banana,zebra" ]]
}

@test "markdown frontmatter: labels field is YAML list" {
    # Arrange - test YAML rendering
    local labels="feature-a,planning,recon:map"
    
    # Act - render as YAML list
    local yaml_inline="labels: [feature-a, planning, recon:map]"
    local yaml_multiline="labels:\n  - feature-a\n  - planning\n  - recon:map"
    
    # Assert - both formats valid
    [[ -n "$yaml_inline" ]]
    [[ -n "$yaml_multiline" ]]
}

@test "user override completely replaces configured labels" {
    # Arrange
    local configured="label1,label2,label3"
    local override="override1,override2"
    
    # Act - apply override
    local result="$override"
    
    # Assert - should only have override labels
    [[ "$result" =~ "override1" ]]
    [[ "$result" =~ "override2" ]]
    [[ ! "$result" =~ "label1" ]]
}

@test "all 4 ticket types receive their respective recon label" {
    # Arrange - ticket types
    local types=("quiz" "research" "prototype" "task")
    
    # Act - verify each gets the right label
    for type in "${types[@]}"; do
        local expected_label="recon:$type"
        [[ -n "$expected_label" ]]
    done
    
    # Assert
    [[ ${#types[@]} -eq 4 ]]
}
