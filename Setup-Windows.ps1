$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$envFile = Join-Path $PSScriptRoot 'backend\.env'
if (-not (Test-Path $envFile)) {
    $content = Get-Content (Join-Path $PSScriptRoot 'backend\.env.example') -Raw
    $randomBytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($randomBytes)
    $rng.Dispose()
    $secret = [Convert]::ToBase64String($randomBytes).Replace('+','').Replace('/','').Replace('=','')
    $content = $content.Replace('CHANGE_ME_TO_LONG_RANDOM_STRING_AT_LEAST_32_CHARACTERS',$secret)
    [System.IO.File]::WriteAllText($envFile,$content)
    Write-Host '[OK] backend/.env dibuat dengan JWT_SECRET acak.' -ForegroundColor Green
} else {
    Write-Host '[INFO] backend/.env sudah ada, tidak ditimpa.' -ForegroundColor Cyan
}
Write-Host "`n[1] Pastikan Node.js dan npm terpasang, lalu jalankan installer dependency..." -ForegroundColor Yellow
npm run install:all
if ($LASTEXITCODE -ne 0) { throw 'Install npm gagal. Periksa internet dan versi Node.js.' }
Write-Host "`n[2] Buka XAMPP, jalankan MySQL, lalu import database/001_schema.sql kemudian database/002_seed_products.sql lewat phpMyAdmin." -ForegroundColor Yellow
Write-Host '[3] Edit backend/.env untuk DB_USER, DB_PASSWORD, ADMIN_EMAIL dan ADMIN_PASSWORD.'
Write-Host '[4] Buat admin: npm run admin --prefix backend'
Write-Host '[5] Jalankan: .\Start-Windows.ps1' -ForegroundColor Green
