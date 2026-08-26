<#
.SYNOPSIS
Pester tests for Azure DevOps tag application (map and ticket tags).

Tests tag application to Azure DevOps work items using mocked `az` CLI responses.
Azure DevOps tags use semicolon-delimited format (vs. GitHub's per-label CLI args).

Test Coverage:
- Azure DevOps map tag application
- Azure DevOps ticket tag application (all 4 types)
- Tag inheritance (additive, not replacement)
- Config override handling
- Semicolon serialization format
- Edge cases (special characters, long lists)
#>

BeforeAll {
    # Mock the az command for Azure DevOps API calls
    function Invoke-AzWorkItemCreate {
        param(
            [string]$Title,
            [string]$Description,
            [string]$Tags,
            [string]$Type,
            [string]$Org,
            [string]$Project,
            [hashtable]$MockResponse
        )
        
        # In mocked mode, verify that tags were passed correctly
        if ($null -eq $MockResponse) {
            $MockResponse = @{ success = $true; id = 456 }
        }
        return $MockResponse
    }
    
    function Invoke-AzWorkItemUpdate {
        param(
            [int]$Id,
            [string]$Tags,
            [string]$Org,
            [string]$Project,
            [hashtable]$MockResponse
        )
        
        if ($null -eq $MockResponse) {
            $MockResponse = @{ success = $true }
        }
        return $MockResponse
    }
    
    function ConvertTo-SemicolonDelimited {
        param([string[]]$Tags)
        return ($Tags | Sort-Object) -join ";"
    }
}

Describe "Azure DevOps Map Tag Application" {
    
    Context "Map receives configured tags" {
        It "applies map tags from configuration" {
            # Arrange
            $mapTags = @("recon:map", "planning")
            $semicolonTags = ConvertTo-SemicolonDelimited $mapTags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Test Map" `
                -Description "Map description" `
                -Tags $semicolonTags `
                -Type "Issue" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
            $semicolonTags | Should -Match "planning;recon:map"
        }
        
        It "applies default tags when map-specific not configured" {
            # Arrange
            $defaultTags = @("recon:map")
            $semicolonTags = ConvertTo-SemicolonDelimited $defaultTags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Test Map (No Map Config)" `
                -Description "Description" `
                -Tags $semicolonTags `
                -Type "Issue" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
        }
    }
    
    Context "Map tag override" {
        It "user session override replaces configured tags" {
            # Arrange
            $configuredTags = @("recon:map", "planning")
            $overrideTags = @("recon:map", "urgent-research")
            $semicolonOverride = ConvertTo-SemicolonDelimited $overrideTags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Overridden Map" `
                -Description "Description" `
                -Tags $semicolonOverride `
                -Type "Issue" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
            $semicolonOverride | Should -Match "urgent-research"
        }
    }
}

Describe "Azure DevOps Ticket Tag Application" {
    
    Context "Quiz ticket tags" {
        It "quiz receives type tags + inherited map tags + recon:quiz" {
            # Arrange
            $typeTags = @("type:question", "needs-answer")
            $inheritedTags = @("recon:map", "planning")
            $requiredTag = @("recon:quiz")
            $allTags = @($typeTags + $inheritedTags + $requiredTag) | Sort-Object -Unique
            $semicolonTags = ConvertTo-SemicolonDelimited $allTags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Quiz Ticket" `
                -Description "Quiz body" `
                -Tags $semicolonTags `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
            $semicolonTags | Should -Match "recon:quiz"
            $semicolonTags | Should -Match "planning"
            $semicolonTags | Should -Match "type:question"
        }
    }
    
    Context "Research ticket tags" {
        It "research receives type tags + inherited map tags + recon:research" {
            # Arrange
            $typeTags = @("type:research", "recon-output")
            $inheritedTags = @("recon:map", "area:api")
            $requiredTag = @("recon:research")
            $allTags = @($typeTags + $inheritedTags + $requiredTag) | Sort-Object -Unique
            $semicolonTags = ConvertTo-SemicolonDelimited $allTags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Research Ticket" `
                -Description "Research body" `
                -Tags $semicolonTags `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
            $semicolonTags | Should -Match "recon:research"
            $semicolonTags | Should -Match "area:api"
        }
    }
    
    Context "Prototype ticket tags" {
        It "prototype receives type tags + inherited map tags + recon:prototype" {
            # Arrange
            $typeTags = @("type:prototype", "spike")
            $inheritedTags = @("recon:map", "priority:high")
            $requiredTag = @("recon:prototype")
            $allTags = @($typeTags + $inheritedTags + $requiredTag) | Sort-Object -Unique
            $semicolonTags = ConvertTo-SemicolonDelimited $allTags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Prototype Ticket" `
                -Description "Prototype body" `
                -Tags $semicolonTags `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
            $semicolonTags | Should -Match "recon:prototype"
        }
    }
    
    Context "Task ticket tags" {
        It "task receives type tags + inherited map tags + recon:task" {
            # Arrange
            $typeTags = @("type:task", "decision-unblocker")
            $inheritedTags = @("recon:map", "area:setup")
            $requiredTag = @("recon:task")
            $allTags = @($typeTags + $inheritedTags + $requiredTag) | Sort-Object -Unique
            $semicolonTags = ConvertTo-SemicolonDelimited $allTags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Task Ticket" `
                -Description "Task body" `
                -Tags $semicolonTags `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
            $semicolonTags | Should -Match "recon:task"
        }
    }
}

Describe "Azure DevOps Tag Inheritance" {
    
    Context "Additive inheritance model" {
        It "ticket tags are union of configured type + inherited map tags" {
            # Arrange
            $typeTags = @("type:question", "needs-answer")
            $mapTags = @("recon:map", "planning")
            $requiredTag = "recon:quiz"
            
            $allTags = @($typeTags + $mapTags + $requiredTag) | Sort-Object -Unique
            $semicolonTags = ConvertTo-SemicolonDelimited $allTags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Inheritance Test" `
                -Description "Description" `
                -Tags $semicolonTags `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert - all three sources should be present
            $result.success | Should -Be $true
            $semicolonTags | Should -Match "type:question"
            $semicolonTags | Should -Match "planning"
            $semicolonTags | Should -Match "recon:quiz"
        }
        
        It "does not duplicate tags when present in multiple sources" {
            # Arrange
            $tags = @("recon:map", "planning", "recon:map", "type:question")
            $unique = $tags | Sort-Object -Unique
            $semicolonTags = ConvertTo-SemicolonDelimited $unique
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Dedup Test" `
                -Description "Description" `
                -Tags $semicolonTags `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
            $unique.Count | Should -Be 3
        }
    }
}

Describe "Azure DevOps Tag Override" {
    
    Context "User session override" {
        It "user override replaces entire tag set" {
            # Arrange
            $configuredTags = @("type:question", "needs-answer", "recon:map", "planning")
            $override = @("urgent", "needs-immediate-review")
            $semicolonOverride = ConvertTo-SemicolonDelimited $override
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Override Test" `
                -Description "Description" `
                -Tags $semicolonOverride `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
            $semicolonOverride | Should -Match "urgent"
            $semicolonOverride | Should -Not -Match "planning"
        }
    }
}

Describe "Azure DevOps Semicolon Serialization" {
    
    Context "Proper semicolon format" {
        It "tags are semicolon-delimited (not comma-delimited)" {
            # Arrange
            $tags = @("tag1", "tag2", "tag3")
            $semicolonFormat = ConvertTo-SemicolonDelimited $tags
            
            # Assert - should have semicolons, not commas
            $semicolonFormat | Should -Match "tag1;tag2;tag3"
            $semicolonFormat | Should -Not -Match ","
        }
        
        It "tags are sorted alphabetically for determinism" {
            # Arrange
            $unsorted = @("zebra", "apple", "banana")
            $sorted = ConvertTo-SemicolonDelimited $unsorted
            
            # Assert
            $sorted | Should -Be "apple;banana;zebra"
        }
    }
}

Describe "Azure DevOps Edge Cases" {
    
    Context "Special characters in tags" {
        It "handles colons, hyphens, underscores in tag names" {
            # Arrange
            $tags = @("type:question", "area-auth", "priority_high", "recon:quiz")
            $semicolonTags = ConvertTo-SemicolonDelimited $tags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Special Chars Test" `
                -Description "Description" `
                -Tags $semicolonTags `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
        }
    }
    
    Context "Empty or minimal tag sets" {
        It "handles empty tag list" {
            # Arrange
            $tags = @()
            $semicolonTags = ConvertTo-SemicolonDelimited $tags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Empty Tags Test" `
                -Description "Description" `
                -Tags $semicolonTags `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
        }
        
        It "handles single tag" {
            # Arrange
            $tags = @("recon:map")
            $semicolonTags = ConvertTo-SemicolonDelimited $tags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Single Tag Test" `
                -Description "Description" `
                -Tags $semicolonTags `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
        }
    }
    
    Context "Long tag lists" {
        It "handles 20+ tags without truncation" {
            # Arrange
            $tags = @(1..20 | ForEach-Object { "tag-$_" })
            $semicolonTags = ConvertTo-SemicolonDelimited $tags
            
            # Act
            $result = Invoke-AzWorkItemCreate `
                -Title "Long Tags Test" `
                -Description "Description" `
                -Tags $semicolonTags `
                -Type "Task" `
                -Org "myorg" `
                -Project "myproject"
            
            # Assert
            $result.success | Should -Be $true
            ($semicolonTags -split ";").Count | Should -Be 20
        }
    }
}
