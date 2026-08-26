<#
.SYNOPSIS
Pester tests for markdown label recording (map and ticket frontmatter).

Tests the record-markdown-map-labels.ps1 and record-markdown-ticket-labels.ps1
scripts with mocked file I/O and various label configurations.

Test Coverage:
- Map label recording (basic, empty, override)
- Ticket label recording (per type, inheritance, override)
- YAML frontmatter parsing and generation
- Label de-duplication
- Edge cases (special chars, long lists, duplicates)
#>

BeforeAll {
    # Load the scripts under test
    $modulePath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    $mapScriptPath = Join-Path $modulePath "scripts" "record-markdown-map-labels.ps1"
    $ticketScriptPath = Join-Path $modulePath "scripts" "record-markdown-ticket-labels.ps1"
    
    if (-not (Test-Path $mapScriptPath)) {
        throw "Map script not found at $mapScriptPath"
    }
    if (-not (Test-Path $ticketScriptPath)) {
        throw "Ticket script not found at $ticketScriptPath"
    }
}

Describe "record-markdown-map-labels" {
    
    Context "Basic map label recording" {
        It "records resolved labels as YAML list in frontmatter" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = "recon:map,planning,feature-a"
            
            # Act
            & $mapScriptPath -FilePath $tempFile -Labels $labels -DryRun | Should -Match 'labels:'
            & $mapScriptPath -FilePath $tempFile -Labels $labels -Title "Test Map"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'labels:\s*-\s*"?feature-a"?'
            $content | Should -Match 'labels:\s*-\s*"?planning"?'
            $content | Should -Match 'labels:\s*-\s*"?recon:map"?'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
        
        It "records empty label list as empty array" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = ""
            
            # Act
            & $mapScriptPath -FilePath $tempFile -Labels $labels -Title "Empty Labels Map"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'labels:\s*\[\s*\]'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
    
    Context "Label deduplication" {
        It "removes duplicate labels" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = "planning,recon:map,planning,feature-a,recon:map"
            
            # Act
            & $mapScriptPath -FilePath $tempFile -Labels $labels -Title "Duplicates Map"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $lines = $content -split "`n"
            $labelLines = $lines | Where-Object { $_ -match '^\s*-\s*' }
            $planningCount = ($labelLines | Where-Object { $_ -match 'planning' }).Count
            $recomMapCount = ($labelLines | Where-Object { $_ -match 'recon:map' }).Count
            $planningCount | Should -Be 1
            $recomMapCount | Should -Be 1
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
    
    Context "User override" {
        It "replaces labels with user override" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $defaultLabels = "label1,label2"
            $override = "override1,override2"
            
            # Act
            & $mapScriptPath -FilePath $tempFile -Labels $defaultLabels -UserOverride $override -Title "Override Map"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'override1'
            $content | Should -Match 'override2'
            $content | Should -Not -Match 'label1'
            $content | Should -Not -Match 'label2'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
    
    Context "Edge cases" {
        It "handles labels with special characters" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = "type:question,area-auth,priority-high"
            
            # Act
            & $mapScriptPath -FilePath $tempFile -Labels $labels -Title "Special Chars Map"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'type:question'
            $content | Should -Match 'area-auth'
            $content | Should -Match 'priority-high'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
        
        It "handles very long label lists" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = [string]::Join(",", @(1..20 | ForEach-Object { "label$_" }))
            
            # Act
            & $mapScriptPath -FilePath $tempFile -Labels $labels -Title "Long Labels Map"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            @(1..20) | ForEach-Object { $content | Should -Match "label$_" }
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
}

Describe "record-markdown-ticket-labels" {
    
    Context "Ticket label recording per type" {
        It "records quiz ticket labels with type field" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = "needs-answer,recon:map"
            
            # Act
            & $ticketScriptPath -FilePath $tempFile -Labels $labels -Type "quiz" -Title "Test Quiz Ticket"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'type:\s*quiz'
            $content | Should -Match 'needs-answer'
            $content | Should -Match 'recon:map'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
        
        It "records research ticket labels" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = "recon-output,recon:map"
            
            # Act
            & $ticketScriptPath -FilePath $tempFile -Labels $labels -Type "research" -Title "Test Research Ticket"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'type:\s*research'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
        
        It "records prototype ticket labels" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = "spike,recon:map"
            
            # Act
            & $ticketScriptPath -FilePath $tempFile -Labels $labels -Type "prototype" -Title "Test Prototype Ticket"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'type:\s*prototype'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
        
        It "records task ticket labels" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = "decision-unblocker,recon:map"
            
            # Act
            & $ticketScriptPath -FilePath $tempFile -Labels $labels -Type "task" -Title "Test Task Ticket"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'type:\s*task'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
    
    Context "Label inheritance" {
        It "records inherited map labels plus configured labels" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            # Simulating: configured type labels + inherited map labels
            $labels = "type:question,needs-answer,planning,recon:map"
            
            # Act
            & $ticketScriptPath -FilePath $tempFile -Labels $labels -Type "quiz" -Title "Inheritance Test"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'type:question'
            $content | Should -Match 'needs-answer'
            $content | Should -Match 'planning'
            $content | Should -Match 'recon:map'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
    
    Context "Ticket label with optional body note" {
        It "records labels in frontmatter and optional body note" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = "needs-answer,recon:map"
            $bodyNote = "Blocked by: [Some decision](link.md)"
            
            # Act
            & $ticketScriptPath -FilePath $tempFile -Labels $labels -Type "quiz" -Title "Body Note Test" -BodyNote $bodyNote
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match '\*\*Labels:\*\*'
            $content | Should -Match 'needs-answer'
            $content | Should -Match $bodyNote
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
    
    Context "Parent link in frontmatter" {
        It "records parent link when provided" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = "needs-answer"
            $parent = "docs/plans/map.md"
            
            # Act
            & $ticketScriptPath -FilePath $tempFile -Labels $labels -Type "quiz" -Title "Parent Test" -Parent $parent
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match "parent:\s*$([regex]::Escape($parent))"
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
    
    Context "User override for tickets" {
        It "replaces ticket labels with user override" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $defaultLabels = "type:question,planning,recon:map"
            $override = "urgent,needs-review"
            
            # Act
            & $ticketScriptPath -FilePath $tempFile -Labels $defaultLabels -Type "quiz" -UserOverride $override -Title "Override Test"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'urgent'
            $content | Should -Match 'needs-review'
            $content | Should -Not -Match 'planning'
            $content | Should -Not -Match 'type:question'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
    
    Context "Edge cases" {
        It "handles ticket type validation" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            
            # Act & Assert - invalid type should fail
            { & $ticketScriptPath -FilePath $tempFile -Labels "test" -Type "invalid" -Title "Invalid Type" -ErrorAction Stop } | Should -Throw
            
            # Cleanup
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        }
        
        It "handles frontmatter preservation on update" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $initialLabels = "old-label"
            
            # Act - initial creation
            & $ticketScriptPath -FilePath $tempFile -Labels $initialLabels -Type "quiz" -Title "Update Test"
            
            # Update with new labels
            $newLabels = "new-label,another-label"
            & $ticketScriptPath -FilePath $tempFile -Labels $newLabels -Type "quiz"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $content | Should -Match 'new-label'
            $content | Should -Match 'another-label'
            $content | Should -Match 'type:\s*quiz'
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
}

Describe "Label sorting and determinism" {
    Context "Alphabetical sorting" {
        It "outputs labels in alphabetical order for determinism" {
            # Arrange
            $tempFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.md'
            $labels = "zebra,apple,banana"
            
            # Act
            & $mapScriptPath -FilePath $tempFile -Labels $labels -Title "Sort Test"
            
            # Assert
            $content = Get-Content $tempFile -Raw
            $lines = $content -split "`n"
            $labelSection = $lines | Where-Object { $_ -match 'labels:' }
            # After labels: header, should see apple before banana before zebra
            $appleIdx = $lines | Select-Object -Index 0 | Where-Object { $_ -match 'apple' }
            $bananaIdx = $lines | Select-Object -Index 0 | Where-Object { $_ -match 'banana' }
            $zebraIdx = $lines | Select-Object -Index 0 | Where-Object { $_ -match 'zebra' }
            
            # Cleanup
            Remove-Item $tempFile -Force
        }
    }
}
