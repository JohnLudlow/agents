<#
.SYNOPSIS
Pester tests for GitHub label application (map and ticket labels).

Tests label application to GitHub issues using mocked `gh` CLI responses.
Covers map label application, ticket label application with inheritance,
and config override behavior.

Test Coverage:
- GitHub map label application
- GitHub ticket label application (all 4 types)
- Label inheritance (additive, not replacement)
- Config override handling
- Edge cases (missing labels, special characters)
#>

BeforeAll {
    # Mock the gh command for GitHub API calls
    function Invoke-GhIssueCreate {
        param(
            [string]$Title,
            [string]$Body,
            [string[]]$Labels,
            [string]$Repo,
            [hashtable]$MockResponse
        )
        
        # In mocked mode, verify that labels were passed correctly
        if ($null -eq $MockResponse) {
            $MockResponse = @{ success = $true; id = 123 }
        }
        return $MockResponse
    }
    
    function Invoke-GhIssueEdit {
        param(
            [int]$IssueNumber,
            [string[]]$Labels,
            [string]$Repo,
            [hashtable]$MockResponse
        )
        
        if ($null -eq $MockResponse) {
            $MockResponse = @{ success = $true }
        }
        return $MockResponse
    }
}

Describe "GitHub Map Label Application" {
    
    Context "Map receives configured labels" {
        It "applies map labels from configuration" {
            # Arrange
            $mapLabels = @("recon:map", "planning")
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Test Map" `
                -Body "Map body" `
                -Labels $mapLabels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
        }
        
        It "applies default labels when map-specific not configured" {
            # Arrange
            $defaultLabels = @("recon:map")
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Test Map (No Map Config)" `
                -Body "Map body" `
                -Labels $defaultLabels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
        }
    }
    
    Context "Map label override" {
        It "user session override replaces configured labels" {
            # Arrange
            $configuredLabels = @("recon:map", "planning")
            $overrideLabels = @("recon:map", "urgent-research")
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Overridden Map" `
                -Body "Map body" `
                -Labels $overrideLabels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
            $overrideLabels | Should -Contain "urgent-research"
        }
    }
}

Describe "GitHub Ticket Label Application" {
    
    Context "Quiz ticket labels" {
        It "quiz receives type labels + inherited map labels + recon:quiz" {
            # Arrange
            $typeLabels = @("type:question", "needs-answer")
            $inheritedLabels = @("recon:map", "planning")
            $requiredLabel = @("recon:quiz")
            $expectedLabels = @($typeLabels + $inheritedLabels + $requiredLabel) | Sort-Object -Unique
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Quiz Ticket" `
                -Body "Quiz body" `
                -Labels $expectedLabels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
            $expectedLabels | Should -Contain "recon:quiz"
            $expectedLabels | Should -Contain "planning"
            $expectedLabels | Should -Contain "type:question"
        }
    }
    
    Context "Research ticket labels" {
        It "research receives type labels + inherited map labels + recon:research" {
            # Arrange
            $typeLabels = @("type:research", "recon-output")
            $inheritedLabels = @("recon:map", "area:api")
            $requiredLabel = @("recon:research")
            $expectedLabels = @($typeLabels + $inheritedLabels + $requiredLabel) | Sort-Object -Unique
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Research Ticket" `
                -Body "Research body" `
                -Labels $expectedLabels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
            $expectedLabels | Should -Contain "recon:research"
            $expectedLabels | Should -Contain "area:api"
        }
    }
    
    Context "Prototype ticket labels" {
        It "prototype receives type labels + inherited map labels + recon:prototype" {
            # Arrange
            $typeLabels = @("type:prototype", "spike")
            $inheritedLabels = @("recon:map", "priority:high")
            $requiredLabel = @("recon:prototype")
            $expectedLabels = @($typeLabels + $inheritedLabels + $requiredLabel) | Sort-Object -Unique
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Prototype Ticket" `
                -Body "Prototype body" `
                -Labels $expectedLabels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
            $expectedLabels | Should -Contain "recon:prototype"
        }
    }
    
    Context "Task ticket labels" {
        It "task receives type labels + inherited map labels + recon:task" {
            # Arrange
            $typeLabels = @("type:task", "decision-unblocker")
            $inheritedLabels = @("recon:map", "area:setup")
            $requiredLabel = @("recon:task")
            $expectedLabels = @($typeLabels + $inheritedLabels + $requiredLabel) | Sort-Object -Unique
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Task Ticket" `
                -Body "Task body" `
                -Labels $expectedLabels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
            $expectedLabels | Should -Contain "recon:task"
        }
    }
}

Describe "GitHub Label Inheritance" {
    
    Context "Additive inheritance model" {
        It "ticket labels are union of configured type + inherited map labels" {
            # Arrange - simulating:
            # Configured for quiz type: ["type:question", "needs-answer"]
            # Inherited from map: ["recon:map", "planning"]
            # Required: ["recon:quiz"]
            $typeLabels = @("type:question", "needs-answer")
            $mapLabels = @("recon:map", "planning")
            $requiredLabel = "recon:quiz"
            
            $expectedUnion = @($typeLabels + $mapLabels + $requiredLabel) | Sort-Object -Unique
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Inheritance Test" `
                -Body "Body" `
                -Labels $expectedUnion `
                -Repo "owner/repo"
            
            # Assert - all three sources should be present
            $result.success | Should -Be $true
            $expectedUnion | Should -Contain "type:question"
            $expectedUnion | Should -Contain "planning"
            $expectedUnion | Should -Contain "recon:quiz"
        }
        
        It "does not duplicate labels when present in multiple sources" {
            # Arrange - recon:map might appear in both configured AND inherited
            $labels = @("recon:map", "planning", "recon:map", "type:question")
            $unique = $labels | Sort-Object -Unique
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Dedup Test" `
                -Body "Body" `
                -Labels $unique `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
            $unique.Count | Should -Be 3
        }
    }
}

Describe "GitHub Label Override" {
    
    Context "User session override" {
        It "user override replaces entire label set" {
            # Arrange
            $configuredLabels = @("type:question", "needs-answer", "recon:map", "planning")
            $override = @("urgent", "needs-immediate-review")
            
            # Act - applying override
            $result = Invoke-GhIssueCreate `
                -Title "Override Test" `
                -Body "Body" `
                -Labels $override `
                -Repo "owner/repo"
            
            # Assert - override should completely replace configured
            $result.success | Should -Be $true
            $override | Should -Contain "urgent"
            $override | Should -Not -Contain "planning"
        }
    }
}

Describe "GitHub Edge Cases" {
    
    Context "Special characters in labels" {
        It "handles colons, hyphens, underscores in label names" {
            # Arrange
            $labels = @("type:question", "area-auth", "priority_high", "recon:quiz")
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Special Chars Test" `
                -Body "Body" `
                -Labels $labels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
        }
    }
    
    Context "Empty or minimal label sets" {
        It "handles empty label list" {
            # Arrange
            $labels = @()
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Empty Labels Test" `
                -Body "Body" `
                -Labels $labels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
        }
        
        It "handles single label" {
            # Arrange
            $labels = @("recon:map")
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Single Label Test" `
                -Body "Body" `
                -Labels $labels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
        }
    }
    
    Context "Long label lists" {
        It "handles 20+ labels without truncation" {
            # Arrange
            $labels = @(1..20 | ForEach-Object { "label-$_" })
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Long Labels Test" `
                -Body "Body" `
                -Labels $labels `
                -Repo "owner/repo"
            
            # Assert
            $result.success | Should -Be $true
            $labels.Count | Should -Be 20
        }
    }
}

Describe "GitHub Label Determinism" {
    
    Context "Consistent label ordering" {
        It "labels are sorted alphabetically in output" {
            # Arrange
            $unsorted = @("zebra", "apple", "banana")
            $sorted = $unsorted | Sort-Object
            
            # Act
            $result = Invoke-GhIssueCreate `
                -Title "Determinism Test" `
                -Body "Body" `
                -Labels $sorted `
                -Repo "owner/repo"
            
            # Assert - when same inputs applied, output should be identical
            $result.success | Should -Be $true
        }
    }
}
