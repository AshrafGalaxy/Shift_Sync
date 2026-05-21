# migrate.ps1 — run this any time you want to apply supabase_schema.sql to the live DB
# Usage:  .\migrate.ps1
Write-Host "Running ShiftSync migration..." -ForegroundColor Cyan
node "$PSScriptRoot\migrate.js"
