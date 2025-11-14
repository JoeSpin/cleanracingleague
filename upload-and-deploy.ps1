# Enhanced PowerShell script for automatic Git commits
param(
    [string]$csvFile,
    [string]$commitMessage = "Upload race data"
)

# Check if CSV file exists
if (-not (Test-Path $csvFile)) {
    Write-Host "Error: CSV file not found: $csvFile" -ForegroundColor Red
    exit 1
}

# Upload the CSV data first
Write-Host "Uploading CSV data..." -ForegroundColor Yellow
$uploadResult = curl -X POST http://localhost:3000/api/upload-race -F "file=@$csvFile" 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error uploading CSV data" -ForegroundColor Red
    exit 1
}

Write-Host "CSV uploaded successfully!" -ForegroundColor Green

# Add all changes to git
Write-Host "Adding files to Git..." -ForegroundColor Yellow
git add data/

# Check if there are changes to commit
$status = git status --porcelain data/
if (-not $status) {
    Write-Host "No changes to commit" -ForegroundColor Yellow
    exit 0
}

# Commit the changes
Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m "$commitMessage"

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to GitHub! Your changes will be live in 1-2 minutes." -ForegroundColor Green
} else {
    Write-Host "Error pushing to GitHub. Please check your Git setup." -ForegroundColor Red
    exit 1
}