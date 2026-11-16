[CmdletBinding()]
param(
    [string]$BuildDirectory = '',
    [ValidateRange(1024,65535)][int]$Port = 3011
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($BuildDirectory)) {
    $BuildDirectory = Join-Path $PSScriptRoot '../../build'
}
$resolvedBuild = (Resolve-Path -LiteralPath $BuildDirectory).Path
foreach ($required in @('index.html', 'asset-manifest.json', 'static/js')) {
    if (-not (Test-Path -LiteralPath (Join-Path $resolvedBuild $required))) {
        throw 'A compiled production build is required; run the local build first.'
    }
}
if ((Test-Path -LiteralPath (Join-Path $resolvedBuild 'package.json')) -or
    (Test-Path -LiteralPath (Join-Path $resolvedBuild 'src')) -or
    (Test-Path -LiteralPath (Join-Path $resolvedBuild '.git')) -or
    @(Get-ChildItem -LiteralPath $resolvedBuild -Force -Filter '.env*').Count) {
    throw 'Refusing to serve a source directory or a build containing environment files.'
}
$manifest = Get-Content -LiteralPath (Join-Path $resolvedBuild 'asset-manifest.json') -Raw | ConvertFrom-Json
if (-not $manifest.entrypoints -or @($manifest.entrypoints | Where-Object {
    $_ -notmatch '^static/(js|css)/[a-zA-Z0-9._/-]+$' -or $_ -match '(^|/)\.\.(/|$)' -or
    -not (Test-Path -LiteralPath (Join-Path $resolvedBuild $_))
}).Count) {
    throw 'The build manifest contains missing or unexpected entry points.'
}
$previousBuild = $env:SN_MAGAZINE_PREVIEW_BUILD
$previousPort = $env:SN_MAGAZINE_PREVIEW_PORT
try {
    $env:SN_MAGAZINE_PREVIEW_BUILD = $resolvedBuild
    $env:SN_MAGAZINE_PREVIEW_PORT = "$Port"
    $compose = @('compose', '-f', (Join-Path $PSScriptRoot 'preview.compose.yml'))
    & docker @compose config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Preview Compose configuration is invalid.' }
    & docker @compose up -d --wait --wait-timeout 45 preview
    if ($LASTEXITCODE -ne 0) { throw 'Preview container did not become healthy.' }
} finally {
    $env:SN_MAGAZINE_PREVIEW_BUILD = $previousBuild
    $env:SN_MAGAZINE_PREVIEW_PORT = $previousPort
}
Write-Output "Docker Compose preview ready: http://localhost:$Port"
