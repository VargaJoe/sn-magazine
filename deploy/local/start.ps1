[CmdletBinding()]
param(
    [ValidateRange(1024,65535)][int]$RepositoryPort = 51016,
    [ValidateRange(1024,65535)][int]$AuthPort = 51017,
    [switch]$SkipImport,
    [switch]$WithSample
)
$ErrorActionPreference = 'Stop'
$runtime = Join-Path $PSScriptRoot 'runtime'
$envFile = Join-Path $runtime 'docker.env'
$settingsFile = Join-Path $runtime 'import.json'
$compose = @('compose', '--env-file', $envFile, '-f', (Join-Path $PSScriptRoot 'compose.yml'))
function Invoke-Docker([string[]]$Arguments) {
    & docker @compose @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Local SenseNet Docker command failed.' }
}
if (-not (Test-Path -LiteralPath $envFile)) {
    $existingVolumes = @(& docker volume ls --filter 'label=com.docker.compose.project=sn-magazine-local' --format '{{.Name}}')
    if ($LASTEXITCODE -ne 0) { throw 'Docker must be available before local initialization.' }
    if ($existingVolumes.Count) {
        throw 'This singleton local repository already has Docker volumes. Restore its original runtime credentials and use the original checkout; no data was reset.'
    }
    if ($RepositoryPort -eq $AuthPort) { throw 'Repository and authentication ports must differ.' }
    New-Item -ItemType Directory -Path $runtime -Force | Out-Null
    function New-LocalSecret {
        $bytes = New-Object byte[] 32
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    }
    $key = New-LocalSecret
    @("SQL_PASSWORD=Sn9!$(New-LocalSecret)", "LOCAL_API_KEY=$key", "LOCAL_HEALTH_KEY=$(New-LocalSecret)",
      "REPOSITORY_PORT=$RepositoryPort", "AUTH_PORT=$AuthPort") | Set-Content -LiteralPath $envFile -Encoding utf8
    @{ repositoryWriter = @{ url="http://127.0.0.1:$RepositoryPort"; authentication=@{ apiKey=$key } } } |
        ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $settingsFile -Encoding utf8
} elseif ($PSBoundParameters.ContainsKey('RepositoryPort') -or $PSBoundParameters.ContainsKey('AuthPort')) {
    throw 'Ports are fixed by runtime/docker.env after initialization. Reuse this singleton instance and its saved configuration.'
}
$settings = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json
$repositoryUri = [uri]$settings.repositoryWriter.url
if ($repositoryUri.Scheme -eq 'http' -and $repositoryUri.Host -eq 'localhost') {
    # Avoid IPv6-first connection delays against the IPv4-only Docker binding.
    $builder = [UriBuilder]$repositoryUri
    $builder.Host = '127.0.0.1'
    $settings.repositoryWriter.url = $builder.Uri.AbsoluteUri.TrimEnd('/')
    $settings | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $settingsFile -Encoding utf8
}
$repoUrl = $settings.repositoryWriter.url
if (-not ([uri]$repoUrl).IsLoopback) { throw 'Local runtime configuration must use a loopback repository.' }
Invoke-Docker @('config', '--quiet')
Invoke-Docker @('up', '-d')
function Wait-Repository {
    for ($i=0; $i -lt 90; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "$repoUrl/" -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) { return }
        } catch { }
        Start-Sleep -Seconds 2
    }
    throw 'Local SenseNet did not become ready. Inspect docker compose logs locally.'
}
Write-Output 'Waiting for the local repository installation...'
Wait-Repository
Invoke-Docker @('exec', '-T', 'sql', 'bash', '/local/bootstrap-key.sh')
# The bootstrap inserts directly into this private database. Reload the API key cache.
Invoke-Docker @('restart', 'repository')
Wait-Repository
if (-not $SkipImport) {
    & (Join-Path $PSScriptRoot '../import.ps1') -PATFile $settingsFile
}
if ($WithSample) {
    & (Join-Path $PSScriptRoot '../import.ps1') -PATFile $settingsFile -SourceFolder (Join-Path $PSScriptRoot 'sample/Root')
}
Write-Output "Local SenseNet ready: $repoUrl (credentials remain in ignored runtime/)."
