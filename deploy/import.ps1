Param(
	[Parameter(Mandatory = $false)]
	[string]$TargetRepo,
	[Parameter(Mandatory = $false)]
	[string]$TargetClientId,
	[Parameter(Mandatory = $false)]
	[string]$TargetClientSecret,
    [Parameter(Mandatory = $false)] 
	[string]$TargetPath = "/",
    [Parameter(Mandatory = $false)] 
	[string]$SourceFolder = "./package/Root",
	[Parameter(Mandatory = $false)]
	[string]$PATFile = "./settings/secret-local.json",
	[Parameter(Mandatory = $false)]
	[string]$execFile = "./tools/SnIO.exe"
)

# install snio tool
if ($PrepareTool -or -not (Test-Path $execFile -PathType Leaf)) {
	$toolFolder = Split-Path -Path $execFile -Parent
    & $PSScriptRoot/scripts/install-snio.ps1 -ToolFolder $toolFolder
}

# if PATFile is set, read json with client and secret from file
if ($PATFile) {
	Write-Output "Loading configuration from $PATFile..."
	$PAT = Get-Content $PATFile | ConvertFrom-Json

	if (-not $TargetRepo) { $TargetRepo = $PAT.repositoryWriter.url	}
	if (-not $TargetClientId) {	$TargetClientId = $PAT.repositoryWriter.authentication.clientid }
	if (-not $TargetClientSecret) { $TargetClientSecret = $PAT.repositoryWriter.authentication.clientsecret }
} else {
	Write-Output "No config file provided."
}

$params = "IMPORT", "--DISPLAY:LEVEL", "Verbose", "eol",
	"-SOURCE", $SourceFolder,
	"-TARGET", $TargetRepo, $TargetPath, "-CLIENTID", $TargetClientId, "-CLIENTSECRET", $TargetClientSecret, "eol"

Write-Output "$execFile $($params -replace "eol", "$($eolChar)`r`n`t")"
& $execFile $($params | where-object {$_ -ne "eol"})