[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$ExportRoot,
    [string]$SettingsFile = (Join-Path $PSScriptRoot 'runtime/import.json')
)
$ErrorActionPreference='Stop'
$source=(Resolve-Path -LiteralPath $ExportRoot).Path
if (-not (Test-Path -LiteralPath (Join-Path $source 'Content') -PathType Container)) {
    throw 'ExportRoot must be the exported Root directory containing Content/.'
}
$settings=Get-Content -LiteralPath $SettingsFile -Raw | ConvertFrom-Json
$url=[uri]$settings.repositoryWriter.url
if (-not $url.IsLoopback -or $url.Scheme -notin @('http','https')) { throw 'Private exports may only be imported into the local repository.' }
$headers=@{apikey=$settings.repositoryWriter.authentication.apiKey}
$query=[uri]::EscapeDataString('TypeIs:ContentType')
$types=Invoke-RestMethod -Uri "$($url.AbsoluteUri.TrimEnd('/'))/OData.svc/Root/System/Schema/ContentTypes?query=$query&`$select=Name&metadata=no&enableautofilters=off" -Headers $headers
$installed=@($types.d.results.Name)
$appTypes=@('Layout','Widget','WidgetContentView','WidgetContentCollection','WidgetSimpleText')
if (@($appTypes | Where-Object { $_ -notin $installed }).Count) {
    throw 'Import the public app baseline first with deploy/import.ps1.'
}
$staging=Join-Path $PSScriptRoot "runtime/private-import/$([guid]::NewGuid().ToString('N'))/Root"
New-Item -ItemType Directory -Path $staging -Force | Out-Null
# Copy only site content and its custom schema; preserve the installed platform, users and server settings.
Copy-Item -LiteralPath (Join-Path $source 'Content') -Destination $staging -Recurse
Copy-Item -LiteralPath (Join-Path $source 'Content.Content') -Destination $staging
$schema=Join-Path $source 'System/Schema/ContentTypes'
$required=New-Object 'System.Collections.Generic.HashSet[string]'
foreach($contentFile in Get-ChildItem -LiteralPath (Join-Path $source 'Content') -Recurse -Filter '*.Content') {
    $content=Get-Content -LiteralPath $contentFile.FullName -Raw | ConvertFrom-Json
    $required.Add($content.ContentType) | Out-Null
}
$definitions=@{}
foreach($file in Get-ChildItem -LiteralPath $schema -Recurse -Filter '*.xml') {
    [xml]$ctd=Get-Content -LiteralPath $file.FullName -Raw
    $definitions[$ctd.ContentType.name]=@{File=$file;Xml=$ctd}
}
# Include missing CTD ancestors, but never replace installed platform or app definitions.
$pending=@($required)
while($pending.Count) {
    $name=$pending[0]
    $pending=@($pending | Select-Object -Skip 1)
    if ($name -in $installed) { continue }
    if (-not $definitions.ContainsKey($name)) { throw "Missing exported content type: $name" }
    $parent=$definitions[$name].Xml.ContentType.parentType
    if ($parent -and $required.Add($parent)) { $pending += $parent }
}
$count=0
foreach($name in $required) {
    if ($name -in $installed) { continue }
    $file=$definitions[$name].File
    $relative=$file.FullName.Substring($source.Length).TrimStart([char[]]'\/')
    $target=Join-Path $staging $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath ([IO.Path]::ChangeExtension($file.FullName,'.Content')) -Destination ([IO.Path]::ChangeExtension($target,'.Content'))
    Copy-Item -LiteralPath $file.FullName -Destination $target
    $count++
}
Write-Output "Prepared private local staging with $count app/custom content types. Originals were preserved."
& (Join-Path $PSScriptRoot '../import.ps1') -PATFile $SettingsFile -SourceFolder $staging
Write-Output 'Private site content import finished. Staging and logs remain local and ignored.'
