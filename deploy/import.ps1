[CmdletBinding()]
param(
    [string]$TargetRepo,
    [string]$TargetClientId,
    [string]$TargetClientSecret,
    [string]$TargetApiKey,
    [string]$TargetPath = '/',
    [string]$SourceFolder = (Join-Path $PSScriptRoot 'package/Root'),
    [string]$PATFile = (Join-Path $PSScriptRoot 'local/runtime/import.json'),
    [string]$execFile = (Join-Path $PSScriptRoot 'tools/snio.exe'),
    [string[]]$Skip,
    [switch]$CreateOnly,
    [switch]$PrepareTool
)
$ErrorActionPreference = 'Stop'
if ($PATFile) {
    $config = Get-Content -LiteralPath $PATFile -Raw | ConvertFrom-Json
    if (-not $TargetRepo) { $TargetRepo=$config.repositoryWriter.url }
    if (-not $TargetApiKey) { $TargetApiKey=$config.repositoryWriter.authentication.apiKey }
    if (-not $TargetClientId) { $TargetClientId=$config.repositoryWriter.authentication.clientId }
    if (-not $TargetClientSecret) { $TargetClientSecret=$config.repositoryWriter.authentication.clientSecret }
}
$uri = $null
if (-not [uri]::TryCreate($TargetRepo, [UriKind]::Absolute, [ref]$uri) -or
    $uri.Scheme -notin @('http','https') -or -not $uri.IsLoopback -or $uri.UserInfo -or $uri.Query -or $uri.Fragment) {
    throw 'This development importer only accepts a loopback HTTP(S) repository. Remote imports require a separate deployment workflow.'
}
if (-not $TargetApiKey -and (-not $TargetClientId -or -not $TargetClientSecret)) {
    throw 'An API key or client credentials are required in the local configuration.'
}
$source = (Resolve-Path -LiteralPath $SourceFolder).Path
if (-not (Test-Path -LiteralPath $source -PathType Container)) {
    throw 'SourceFolder must be an exported directory, not a .Content sidecar file.'
}
if ($PrepareTool -or -not (Test-Path -LiteralPath $execFile -PathType Leaf)) {
    & (Join-Path $PSScriptRoot 'scripts/install-snio.ps1') -ToolFolder (Split-Path -Parent $execFile)
}
$tool = (Resolve-Path -LiteralPath $execFile).Path
$logFolder=Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Path $logFolder -Force | Out-Null
$runId=[guid]::NewGuid().ToString('N')
$privateConfig=Join-Path $logFolder "$runId.json"
$logFile=Join-Path $logFolder "$runId.log"
@{ repositoryWriter=@{ url=$TargetRepo; path=$TargetPath; authentication=@{ apiKey=$TargetApiKey; clientId=$TargetClientId; clientSecret=$TargetClientSecret } } } |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $privateConfig -Encoding utf8
$arguments=@('IMPORT','--DISPLAY:LEVEL','Errors','-CONFIG', $privateConfig, '-SOURCE', '-PATH', $source)
if ($Skip) { $arguments += '-SKIP'; $arguments += $Skip }
$arguments += @('-TARGET', '-URL', $TargetRepo, '-PATH', $TargetPath)
if ($CreateOnly) { $arguments += '-CREATEONLY' }
Write-Output "Importing local content to $TargetRepo$TargetPath"
Push-Location $PSScriptRoot
try {
    & $tool @arguments *> $logFile
    $exitCode=$LASTEXITCODE
    $result=Get-Content -LiteralPath $logFile -Raw
    if ($exitCode -ne 0 -or $result -match '(?im)^\s*(ERROR|Cannot create the application|Unhandled exception)' -or $result -match '(?i)(failed|errors)\s*:\s*[1-9]') {
        throw "Local import failed. Inspect the private log: $logFile"
    }
    Write-Output "Local import completed. Private log: $logFile"
} finally {
    Pop-Location
    Remove-Item -LiteralPath $privateConfig -Force
}
