# Script de instalación de MongoDB para Windows
# Ejecutar como administrador

Write-Host "🚀 Instalador de MongoDB para Windows" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Verificar si MongoDB ya está instalado
$mongodbService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue

if ($mongodbService) {
    Write-Host "✅ MongoDB ya está instalado" -ForegroundColor Yellow
    Write-Host "Estado del servicio: $($mongodbService.Status)" -ForegroundColor Yellow
    
    if ($mongodbService.Status -eq "Stopped") {
        Write-Host "🔄 Iniciando servicio MongoDB..." -ForegroundColor Blue
        Start-Service -Name "MongoDB"
        Write-Host "✅ Servicio MongoDB iniciado" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "📋 Comandos útiles:" -ForegroundColor Cyan
    Write-Host "   Iniciar: net start MongoDB" -ForegroundColor White
    Write-Host "   Detener: net stop MongoDB" -ForegroundColor White
    Write-Host "   Estado: net start | findstr MongoDB" -ForegroundColor White
    Write-Host ""
    
    exit 0
}

Write-Host "📥 MongoDB no está instalado. Iniciando instalación..." -ForegroundColor Blue
Write-Host ""

# Crear directorio de datos si no existe
$dataDir = "C:\data\db"
if (!(Test-Path $dataDir)) {
    Write-Host "📁 Creando directorio de datos: $dataDir" -ForegroundColor Blue
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}

# Crear directorio de logs si no existe
$logDir = "C:\data\log"
if (!(Test-Path $logDir)) {
    Write-Host "📁 Creando directorio de logs: $logDir" -ForegroundColor Blue
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Descargar MongoDB Community Server
Write-Host "📥 Descargando MongoDB Community Server..." -ForegroundColor Blue
$downloadUrl = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.4-signed.msi"
$installerPath = "$env:TEMP\mongodb-installer.msi"

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "✅ Descarga completada" -ForegroundColor Green
} catch {
    Write-Host "❌ Error descargando MongoDB: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Instalación manual:" -ForegroundColor Yellow
    Write-Host "1. Ve a https://www.mongodb.com/try/download/community" -ForegroundColor White
    Write-Host "2. Selecciona Windows y descarga el instalador MSI" -ForegroundColor White
    Write-Host "3. Ejecuta el instalador con las opciones por defecto" -ForegroundColor White
    Write-Host "4. Asegúrate de instalar MongoDB Compass (opcional pero recomendado)" -ForegroundColor White
    exit 1
}

# Instalar MongoDB
Write-Host "🔧 Instalando MongoDB..." -ForegroundColor Blue
try {
    $installArgs = @(
        "/i", $installerPath,
        "/quiet",
        "/norestart",
        "INSTALLDIR=C:\Program Files\MongoDB\Server\7.0",
        "ADDLOCAL=all"
    )
    
    Start-Process -FilePath "msiexec.exe" -ArgumentList $installArgs -Wait
    Write-Host "✅ MongoDB instalado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error instalando MongoDB: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Limpiar archivo de instalación
Remove-Item $installerPath -Force -ErrorAction SilentlyContinue

# Crear archivo de configuración
Write-Host "📝 Creando archivo de configuración..." -ForegroundColor Blue
$configPath = "C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg"
$configContent = @"
systemLog:
  destination: file
  path: C:\data\log\mongod.log
  logAppend: true
storage:
  dbPath: C:\data\db
net:
  port: 27017
  bindIp: 127.0.0.1
"@

try {
    Set-Content -Path $configPath -Value $configContent -Encoding UTF8
    Write-Host "✅ Archivo de configuración creado" -ForegroundColor Green
} catch {
    Write-Host "⚠️ No se pudo crear el archivo de configuración: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Instalar como servicio de Windows
Write-Host "🔧 Instalando MongoDB como servicio..." -ForegroundColor Blue
try {
    $serviceArgs = @(
        "--install",
        "--serviceName", "MongoDB",
        "--serviceDisplayName", "MongoDB",
        "--serviceDescription", "MongoDB Database Server",
        "--config", $configPath
    )
    
    & "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" $serviceArgs
    Write-Host "✅ Servicio MongoDB instalado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error instalando servicio: $($_.Exception.Message)" -ForegroundColor Red
}

# Iniciar servicio
Write-Host "🚀 Iniciando servicio MongoDB..." -ForegroundColor Blue
try {
    Start-Service -Name "MongoDB"
    Write-Host "✅ Servicio MongoDB iniciado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error iniciando servicio: $($_.Exception.Message)" -ForegroundColor Red
}

# Verificar instalación
Write-Host ""
Write-Host "🔍 Verificando instalación..." -ForegroundColor Blue
Start-Sleep -Seconds 3

$service = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Host "✅ MongoDB está ejecutándose correctamente" -ForegroundColor Green
    Write-Host "📍 Puerto: 27017" -ForegroundColor Cyan
    Write-Host "📍 Base de datos: C:\data\db" -ForegroundColor Cyan
    Write-Host "📍 Logs: C:\data\log\mongod.log" -ForegroundColor Cyan
} else {
    Write-Host "❌ MongoDB no está ejecutándose" -ForegroundColor Red
    Write-Host "🔧 Intenta iniciar manualmente: net start MongoDB" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   Iniciar: net start MongoDB" -ForegroundColor White
Write-Host "   Detener: net stop MongoDB" -ForegroundColor White
Write-Host "   Estado: net start | findstr MongoDB" -ForegroundColor White
Write-Host "   Conectar: mongosh" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Instalación completada!" -ForegroundColor Green
Write-Host "Ahora puedes ejecutar: npm run setup-db" -ForegroundColor Yellow
