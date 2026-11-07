$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path -LiteralPath '.env')) {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $secret = [Convert]::ToBase64String($bytes)
    (Get-Content -LiteralPath '.env.example' -Raw).Replace('SECRET_KEY=', "SECRET_KEY=$secret") | Set-Content -LiteralPath '.env' -Encoding utf8
    Write-Host 'Created local configuration. Demo seeding is enabled for an empty database.'
}
docker compose up --build -d
if ($LASTEXITCODE -ne 0) { throw 'Docker startup failed. Check Docker Desktop and the error above.' }
$backendAddress = docker compose port backend 8000
if ($LASTEXITCODE -ne 0) { throw 'Could not determine the backend address. Run docker compose ps.' }
Write-Host "RouteWise: http://localhost:4000 | API health: http://${backendAddress}/health"
