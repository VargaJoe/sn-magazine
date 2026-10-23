git clone https://github.com/kavics/SnIOCleaner
dotnet publish ./SnIOCleaner/src/SnIOCleaner -o ./tools/SnIOCleaner

$date = Get-Date -Format "yyMMddHHss"
& ./tools/SnIOCleaner/SnIOCleaner.exe -source "./export" -target "./export-mini-$($date)" -minimal