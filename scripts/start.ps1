$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
& "$projectRoot\.venv\Scripts\python.exe" -m flask --app backend.app:create_app db upgrade -d backend/migrations
if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
& "$projectRoot\.venv\Scripts\waitress-serve.exe" --listen=127.0.0.1:5000 --call backend.app:create_app
