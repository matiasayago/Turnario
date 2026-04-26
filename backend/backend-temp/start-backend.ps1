# Script de PowerShell para iniciar el backend de Turnario
Write-Host "🚀 Iniciando Backend Turnario..." -ForegroundColor Green

# Verificar si Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "Por favor instala Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar si npm está instalado
try {
    $npmVersion = npm --version
    Write-Host "✅ npm detectado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar si el archivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Archivo .env no encontrado, copiando desde env.example..." -ForegroundColor Yellow
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Host "✅ Archivo .env creado" -ForegroundColor Green
    } else {
        Write-Host "❌ Archivo env.example no encontrado" -ForegroundColor Red
    }
}

# Verificar dependencias
Write-Host "🔍 Verificando dependencias..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencias ya instaladas" -ForegroundColor Green
}

# Verificar si el puerto 3000 está en uso
$portInUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Puerto 3000 está en uso. Intentando liberar..." -ForegroundColor Yellow
    $processId = $portInUse.OwningProcess
    try {
        Stop-Process -Id $processId -Force
        Write-Host "✅ Proceso liberado" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "❌ No se pudo liberar el puerto 3000" -ForegroundColor Red
        Write-Host "Por favor cierra manualmente el proceso que usa el puerto 3000" -ForegroundColor Yellow
        exit 1
    }
}

# Mostrar información del servidor
Write-Host "`n📋 Información del Servidor:" -ForegroundColor Cyan
Write-Host "   • Puerto: 3000" -ForegroundColor White
Write-Host "   • URL: http://localhost:3000" -ForegroundColor White
Write-Host "   • API: http://localhost:3000/api/v1" -ForegroundColor White
Write-Host "   • Health: http://localhost:3000/health" -ForegroundColor White
Write-Host "   • CORS: Configurado para Expo" -ForegroundColor White

Write-Host "`n🚀 Iniciando servidor..." -ForegroundColor Green
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host "`n" -ForegroundColor White

# Iniciar el servidor
try {
    node simple-test.js
} catch {
    Write-Host "`n❌ Error iniciando el servidor" -ForegroundColor Red
    Write-Host "Verifica que todas las dependencias estén instaladas correctamente" -ForegroundColor Yellow
    exit 1
}
