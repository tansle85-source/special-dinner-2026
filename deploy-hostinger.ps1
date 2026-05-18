# Hostinger Deployment Packaging Automation Script
# This script builds the React frontend and packages only the required production files into a deployment ZIP.

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Hostinger Production Build Prep..." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Step 1: Run production frontend compilation via cmd.exe to bypass execution policies
Write-Host "📦 Step 1: Compiling React/Vite Frontend..." -ForegroundColor Yellow
cmd.exe /c "npm run build"

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Frontend build failed! Aborting packaging."
}
Write-Host "✅ Frontend compiled successfully." -ForegroundColor Green

# Step 2: Establish paths
$root = Get-Item .
$tempDir = Join-Path $root.FullName "deploy_temp"
$zipPath = Join-Path $root.FullName "production-deploy.zip"

# Step 3: Clean previous artifacts
Write-Host "🧹 Step 2: Cleaning up previous packaging files..." -ForegroundColor Yellow
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

# Step 4: Create deploy directory structure
New-Item -Path $tempDir -ItemType Directory | Out-Null

# Step 5: Copy production assets
Write-Host "📋 Step 3: Copying production-only components..." -ForegroundColor Yellow

$essentialFiles = @(
    "server.js",
    "package.json",
    "package-lock.json",
    ".env",
    "ecosystem.config.cjs"
)

foreach ($file in $essentialFiles) {
    $filePath = Join-Path $root.FullName $file
    if (Test-Path $filePath) {
        Copy-Item -Path $filePath -Destination $tempDir -Force
    } else {
        Write-Warning "⚠️ Missing essential file: $file"
    }
}

# Copy compiled frontend build directory
$distPath = Join-Path $root.FullName "dist"
if (Test-Path $distPath) {
    Copy-Item -Path $distPath -Destination $tempDir -Recurse -Force
} else {
    Write-Error "❌ Compiled dist directory is missing! Make sure the build ran successfully."
}

Write-Host "✅ Copied assets into temporary deployment folder." -ForegroundColor Green

# Step 6: Create ZIP archive
Write-Host "📦 Step 4: Packaging directory into production-deploy.zip..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# Step 7: Clean temporary directory
Write-Host "🧹 Step 5: Performing post-package clean up..." -ForegroundColor Yellow
Remove-Item -Path $tempDir -Recurse -Force

$zipSize = (Get-Item $zipPath).Length / 1MB
$formattedSize = "{0:N2}" -f $zipSize

Write-Host "=============================================" -ForegroundColor Green
Write-Host "🎉 SUCCESS! Hostinger Deployment Package Ready!" -ForegroundColor Green
Write-Host "📦 File: production-deploy.zip" -ForegroundColor Green
Write-Host "💾 Size: $formattedSize MB" -ForegroundColor Green
Write-Host "📂 Upload this ZIP directly to your Hostinger Node.js / VPS File Manager!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
