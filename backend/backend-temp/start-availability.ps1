# Script para iniciar el backend con configuración de disponibilidad
# Ejecutar con: .\start-availability.ps1

Write-Host "🚀 Iniciando Backend Turnario con Disponibilidad..." -ForegroundColor Green

# Verificar si Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado. Por favor instala Node.js primero." -ForegroundColor Red
    exit 1
}

# Verificar si MongoDB está disponible
try {
    $mongoStatus = mongosh --eval "db.runCommand('ping')" --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MongoDB está disponible" -ForegroundColor Green
    } else {
        Write-Host "⚠️ MongoDB no está disponible. Asegúrate de que esté ejecutándose." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ No se pudo verificar MongoDB. Asegúrate de que esté ejecutándose." -ForegroundColor Yellow
}

# Verificar si existe el archivo .env
if (Test-Path ".env") {
    Write-Host "✅ Archivo .env encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️ Archivo .env no encontrado. Copiando desde env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✅ Archivo .env creado. Por favor configura las variables necesarias." -ForegroundColor Green
}

# Instalar dependencias si es necesario
if (Test-Path "node_modules") {
    Write-Host "✅ Dependencias ya instaladas" -ForegroundColor Green
} else {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencias instaladas correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
        exit 1
    }
}

# Crear directorio de logs si no existe
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    Write-Host "✅ Directorio de logs creado" -ForegroundColor Green
}

# Iniciar el servidor
Write-Host "🌐 Iniciando servidor con configuración de disponibilidad..." -ForegroundColor Cyan
Write-Host "📍 URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📚 API Docs: http://localhost:3000/api/v1/docs" -ForegroundColor Cyan
Write-Host "🔍 Health Check: http://localhost:3000/api/v1/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

# Ejecutar el servidor
node start-with-availability.js
