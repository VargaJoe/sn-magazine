# build-docker-images.ps1
# PowerShell script to build and push Docker images for multiple architectures
# Supports AMD64, ARM64, and multi-architecture builds

param(
    [switch]$SkipPush,
    [string]$Registry = "vargajoe/sn-magazine"
)

Write-Host "Building Docker images for $Registry" -ForegroundColor Green

# Ensure we're in the project root directory
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot

# Check if Docker Buildx is available
try {
    $buildxVersion = docker buildx version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Buildx not available"
    }
    Write-Host "Docker Buildx is available" -ForegroundColor Green
} catch {
    Write-Error "Docker Buildx is required but not available. Please install Docker Desktop or enable Buildx."
    exit 1
}

# Function to build and optionally push an image
function Build-Image {
    param(
        [string]$Platform,
        [string]$Tag,
        [string]$Description
    )

    Write-Host "Building $Description image ($Platform)..." -ForegroundColor Yellow

    $buildCommand = "docker buildx build --platform $Platform -t $Registry`:$Tag"
    if (-not $SkipPush) {
        $buildCommand += " --push"
    }
    $buildCommand += " ."

    Write-Host "Running: $buildCommand" -ForegroundColor Gray

    try {
        Invoke-Expression $buildCommand
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully built $Description image" -ForegroundColor Green
        } else {
            throw "Build failed for $Description"
        }
    } catch {
        Write-Error "Failed to build $Description image: $_"
        exit 1
    }
}

# Build AMD64 image
Build-Image -Platform "linux/amd64" -Tag "preview-amd64" -Description "AMD64"

# Build ARM64 image
Build-Image -Platform "linux/arm64" -Tag "preview-arm64" -Description "ARM64"

# Build multi-architecture image
Write-Host "Building multi-architecture image (AMD64 + ARM64)..." -ForegroundColor Yellow
$multiBuildCommand = "docker buildx build --platform linux/amd64,linux/arm64 -t $Registry`:preview"
if (-not $SkipPush) {
    $multiBuildCommand += " --push"
}
$multiBuildCommand += " ."

Write-Host "Running: $multiBuildCommand" -ForegroundColor Gray

try {
    Invoke-Expression $multiBuildCommand
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully built multi-architecture image" -ForegroundColor Green
    } else {
        throw "Multi-architecture build failed"
    }
} catch {
    Write-Error "Failed to build multi-architecture image: $_"
    exit 1
}

Write-Host "All Docker images built successfully!" -ForegroundColor Green
if ($SkipPush) {
    Write-Host "Note: Images were built locally but not pushed. Use without -SkipPush to push to registry." -ForegroundColor Yellow
}