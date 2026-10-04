[CmdletBinding()]
param(
    [string]$DataPath='/Root/Content/demo',
    [ValidateRange(1024,65535)][int]$Port=3006
)
$ErrorActionPreference='Stop'
$settings=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'runtime/import.json') -Raw | ConvertFrom-Json
$repository=$settings.repositoryWriter.url
if (-not ([uri]$repository).IsLoopback) { throw 'The app starter only uses a loopback repository.' }
$values=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'runtime/docker.env') | ConvertFrom-StringData
$localEnv=@{
    PORT="$Port"; HOST='127.0.0.1'; BROWSER='none';
    REACT_APP_API_URL=$repository; REACT_APP_AUTH_URL="http://localhost:$($values.AUTH_PORT)";
    REACT_APP_CLIENT_ID='spa'; REACT_APP_SITE_HOST="http://localhost:$Port";
    REACT_APP_DATA_PATH=$DataPath; REACT_APP_LAYOUT_TYPE='Layout'; REACT_APP_WIDGET_TYPE='Widget';
    REACT_APP_PAGECONTAINER_PATH='/Root/Content/(layout)';
    REACT_APP_LOGO_PATH='/(structure)/Site/logo.png'; REACT_APP_OGIMAGE='/(structure)/Site/ogimage.png';
    REACT_APP_FB_APPID=''; REACT_APP_DISQUS_SHORTNAME='';
    REACT_APP_MAINTENANCE_TEMPLATE='maintenance'; REACT_APP_MAINTENANCE_SITE_NAME='Local site';
    REACT_APP_MAINTENANCE_TITLE='Local repository unavailable'; REACT_APP_MAINTENANCE_EMAIL='';
    REACT_APP_MAINTENANCE_TEXT='<p>Check the local SenseNet containers and import.</p>'
}
$previous=@{}
foreach($key in $localEnv.Keys) {
    $previous[$key]=[Environment]::GetEnvironmentVariable($key,'Process')
    [Environment]::SetEnvironmentVariable($key,$localEnv[$key],'Process')
}
Push-Location (Join-Path $PSScriptRoot '../..')
try {
    & npm.cmd start
    if ($LASTEXITCODE -ne 0) { throw 'The local React development server exited with an error.' }
} finally {
    Pop-Location
    foreach($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key,$previous[$key],'Process') }
}
