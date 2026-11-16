Param(
	[Parameter(Mandatory = $false)]
	[string]$ToolFolder = (Join-Path $PSScriptRoot '../tools')
)

$ErrorActionPreference = 'Stop'
$installed = @(dotnet tool list --tool-path $ToolFolder)
if ($LASTEXITCODE -ne 0) { throw 'Failed to inspect local dotnet tools.' }
if ($installed -match '^sensenet\.io\.cli\s+1\.3\.0\s') { return }
if ($installed -match '^sensenet\.io\.cli\s') {
    dotnet tool update sensenet.io.cli --version 1.3.0 --tool-path $ToolFolder
} else {
    dotnet tool install sensenet.io.cli --version 1.3.0 --tool-path $ToolFolder
}
if ($LASTEXITCODE -ne 0) { throw 'Failed to install SnIO 1.3.0.' }
