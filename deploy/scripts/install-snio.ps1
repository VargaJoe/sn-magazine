Param(
	[Parameter(Mandatory = $false)]
	[string]$ToolFolder = "./tools"
)

dotnet tool install sensenet.io.cli --tool-path $($ToolFolder)
