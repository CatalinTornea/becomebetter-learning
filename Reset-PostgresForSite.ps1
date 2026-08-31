$ErrorActionPreference = "Stop"

$serviceName = "postgresql-x64-18"
$dataDir = "C:\Program Files\PostgreSQL\18\data"
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$createdb = "C:\Program Files\PostgreSQL\18\bin\createdb.exe"
$pgHba = Join-Path $dataDir "pg_hba.conf"
$backup = "$pgHba.codex-backup"
$newPassword = "catalin24"
$database = "learning"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  throw "Ruleaza acest script din PowerShell deschis cu Run as Administrator."
}

if (-not (Test-Path $pgHba)) {
  throw "Nu gasesc pg_hba.conf la: $pgHba"
}

if (-not (Test-Path $psql)) {
  throw "Nu gasesc psql.exe la: $psql"
}

Copy-Item -LiteralPath $pgHba -Destination $backup -Force

try {
  $text = Get-Content -LiteralPath $pgHba -Raw
  $text = $text -replace 'host\s+all\s+all\s+127\.0\.0\.1/32\s+scram-sha-256', 'host    all             all             127.0.0.1/32            trust'
  $text = $text -replace 'host\s+all\s+all\s+::1/128\s+scram-sha-256', 'host    all             all             ::1/128                 trust'
  Set-Content -LiteralPath $pgHba -Value $text -NoNewline

  Restart-Service $serviceName
  Start-Sleep -Seconds 3

  & $psql -h localhost -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$newPassword';"

  $exists = & $psql -h localhost -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$database';"
  if ($exists.Trim() -ne "1") {
    & $createdb -h localhost -U postgres -O postgres $database
  }
}
finally {
  Copy-Item -LiteralPath $backup -Destination $pgHba -Force
  Restart-Service $serviceName
  Start-Sleep -Seconds 3
}

Write-Host "Gata. PostgreSQL foloseste acum parola '$newPassword', iar baza '$database' exista."
