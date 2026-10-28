#!/bin/bash
set -euo pipefail
export SQLCMDPASSWORD="$MSSQL_SA_PASSWORD"
exec /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -d SnMagazineLocal -b -v LocalApiKey="$SN_LOCAL_API_KEY" <<'SQL'
IF NOT EXISTS (SELECT 1 FROM AccessTokens WHERE Value = '$(LocalApiKey)' AND UserId = 1)
    INSERT INTO AccessTokens (UserId, Value, Feature, CreationDate, ExpirationDate)
    VALUES (1, '$(LocalApiKey)', 'apikey', GETUTCDATE(), '9999-12-31T23:59:59');
SQL
