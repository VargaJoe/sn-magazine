param(
    [string]$OutputDirectory = ''
)
$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot 'extensions/editorial/SnMagazine.Editorial.csproj'
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $PSScriptRoot 'runtime/editorial-extension/publish'
}
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$previousPackages = $env:NUGET_PACKAGES
$previousCache = $env:NUGET_HTTP_CACHE_PATH
try {
    # Keep restore writes in this checkout even in a restricted Windows shell.
    $env:NUGET_PACKAGES = Join-Path $PSScriptRoot 'runtime/editorial-extension/nuget/packages'
    $env:NUGET_HTTP_CACHE_PATH = Join-Path $PSScriptRoot 'runtime/editorial-extension/nuget/http-cache'
    dotnet build $project --configuration Release --output $OutputDirectory --nologo
    if ($LASTEXITCODE -ne 0) { throw 'Editorial extension build failed.' }
} finally {
    $env:NUGET_PACKAGES = $previousPackages
    $env:NUGET_HTTP_CACHE_PATH = $previousCache
}
Write-Output (Join-Path $OutputDirectory 'SnMagazine.Editorial.dll')
