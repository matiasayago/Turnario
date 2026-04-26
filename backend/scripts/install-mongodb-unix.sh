#!/bin/bash

# Script de instalación de MongoDB para macOS y Linux
# Ejecutar con permisos de administrador

echo "🚀 Instalador de MongoDB para Unix (macOS/Linux)"
echo "================================================"
echo ""

# Detectar el sistema operativo
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
else
    echo "❌ Sistema operativo no soportado: $OSTYPE"
    exit 1
fi

echo "📋 Sistema detectado: $OS"
echo ""

# Verificar si MongoDB ya está instalado
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB ya está instalado"
    echo "📍 Versión: $(mongod --version | head -n1)"
    
    # Verificar si el servicio está ejecutándose
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB está ejecutándose"
    else
        echo "🔄 Iniciando MongoDB..."
        if [[ "$OS" == "macos" ]]; then
            brew services start mongodb-community
        else
            sudo systemctl start mongod
        fi
    fi
    
    echo ""
    echo "📋 Comandos útiles:"
    if [[ "$OS" == "macos" ]]; then
        echo "   Iniciar: brew services start mongodb-community"
        echo "   Detener: brew services stop mongodb-community"
        echo "   Estado: brew services list | grep mongodb"
    else
        echo "   Iniciar: sudo systemctl start mongod"
        echo "   Detener: sudo systemctl stop mongod"
        echo "   Estado: sudo systemctl status mongod"
    fi
    echo "   Conectar: mongosh"
    echo ""
    
    exit 0
fi

echo "📥 MongoDB no está instalado. Iniciando instalación..."
echo ""

if [[ "$OS" == "macos" ]]; then
    # Instalación para macOS usando Homebrew
    echo "🍺 Instalando MongoDB usando Homebrew..."
    
    # Verificar si Homebrew está instalado
    if ! command -v brew &> /dev/null; then
        echo "📥 Instalando Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Agregar el tap de MongoDB
    echo "📦 Agregando tap de MongoDB..."
    brew tap mongodb/brew
    
    # Instalar MongoDB
    echo "🔧 Instalando MongoDB Community Server..."
    brew install mongodb-community
    
    # Crear directorio de datos
    echo "📁 Creando directorio de datos..."
    sudo mkdir -p /usr/local/var/mongodb
    sudo chown $(whoami) /usr/local/var/mongodb
    
    # Crear directorio de logs
    echo "📁 Creando directorio de logs..."
    sudo mkdir -p /usr/local/var/log/mongodb
    sudo chown $(whoami) /usr/local/var/log/mongodb
    
    # Iniciar MongoDB
    echo "🚀 Iniciando MongoDB..."
    brew services start mongodb-community
    
elif [[ "$OS" == "linux" ]]; then
    # Instalación para Linux (Ubuntu/Debian)
    echo "🐧 Instalando MongoDB para Linux..."
    
    # Importar clave pública
    echo "🔑 Importando clave pública de MongoDB..."
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
    
    # Crear archivo de lista
    echo "📝 Creando archivo de lista..."
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    # Actualizar lista de paquetes
    echo "🔄 Actualizando lista de paquetes..."
    sudo apt-get update
    
    # Instalar MongoDB
    echo "🔧 Instalando MongoDB Community Server..."
    sudo apt-get install -y mongodb-org
    
    # Habilitar y iniciar servicio
    echo "🚀 Habilitando e iniciando servicio MongoDB..."
    sudo systemctl enable mongod
    sudo systemctl start mongod
fi

# Verificar instalación
echo ""
echo "🔍 Verificando instalación..."
sleep 3

if command -v mongod &> /dev/null; then
    echo "✅ MongoDB instalado exitosamente"
    echo "📍 Versión: $(mongod --version | head -n1)"
    
    # Verificar si está ejecutándose
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB está ejecutándose"
        echo "📍 Puerto: 27017"
        echo "📍 Base de datos: /data/db (Linux) o /usr/local/var/mongodb (macOS)"
    else
        echo "⚠️ MongoDB no está ejecutándose"
        echo "🔧 Intenta iniciar manualmente:"
        if [[ "$OS" == "macos" ]]; then
            echo "   brew services start mongodb-community"
        else
            echo "   sudo systemctl start mongod"
        fi
    fi
else
    echo "❌ Error en la instalación de MongoDB"
    exit 1
fi

echo ""
echo "📋 Comandos útiles:"
if [[ "$OS" == "macos" ]]; then
    echo "   Iniciar: brew services start mongodb-community"
    echo "   Detener: brew services stop mongodb-community"
    echo "   Estado: brew services list | grep mongodb"
else
    echo "   Iniciar: sudo systemctl start mongod"
    echo "   Detener: sudo systemctl stop mongod"
    echo "   Estado: sudo systemctl status mongod"
fi
echo "   Conectar: mongosh"
echo ""

echo "🎉 Instalación completada!"
echo "Ahora puedes ejecutar: npm run setup-db"
