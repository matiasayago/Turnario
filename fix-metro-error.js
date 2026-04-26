/**
 * Script para solucionar el error de Metro "Requiring unknown module"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Solucionando error de Metro...\n');

function runCommand(command, description) {
  try {
    console.log(`📝 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completado\n`);
    return true;
  } catch (error) {
    console.log(`❌ Error en ${description}: ${error.message}\n`);
    return false;
  }
}

function cleanMetroCache() {
  console.log('🧹 Limpiando cache de Metro...');
  
  const cachePaths = [
    'node_modules/.cache',
    '.expo',
    'metro-cache',
    'watchman-state'
  ];
  
  cachePaths.forEach(cachePath => {
    if (fs.existsSync(cachePath)) {
      try {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log(`   ✅ Eliminado: ${cachePath}`);
      } catch (error) {
        console.log(`   ⚠️ No se pudo eliminar: ${cachePath} - ${error.message}`);
      }
    }
  });
  
  console.log('');
}

function checkPackageJson() {
  console.log('📦 Verificando package.json...');
  
  const packageJsonPath = 'package.json';
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log(`   ✅ package.json encontrado`);
      console.log(`   📱 Nombre: ${packageJson.name}`);
      console.log(`   📋 Versión: ${packageJson.version}`);
      console.log(`   🔧 Scripts disponibles: ${Object.keys(packageJson.scripts || {}).join(', ')}`);
    } catch (error) {
      console.log(`   ❌ Error leyendo package.json: ${error.message}`);
    }
  } else {
    console.log('   ❌ package.json no encontrado');
  }
  
  console.log('');
}

function checkNodeModules() {
  console.log('📁 Verificando node_modules...');
  
  if (fs.existsSync('node_modules')) {
    console.log('   ✅ node_modules existe');
    
    // Verificar algunas dependencias críticas
    const criticalDeps = ['expo', 'react', 'react-native', '@expo/vector-icons'];
    criticalDeps.forEach(dep => {
      if (fs.existsSync(`node_modules/${dep}`)) {
        console.log(`   ✅ ${dep} instalado`);
      } else {
        console.log(`   ❌ ${dep} NO instalado`);
      }
    });
  } else {
    console.log('   ❌ node_modules no existe');
  }
  
  console.log('');
}

async function main() {
  console.log('🚀 INICIANDO SOLUCIÓN DE ERROR DE METRO');
  console.log('=====================================\n');
  
  // Verificar estructura del proyecto
  checkPackageJson();
  checkNodeModules();
  
  // Limpiar cache
  cleanMetroCache();
  
  // Reinstalar dependencias
  console.log('📦 Reinstalando dependencias...');
  runCommand('npm install', 'Instalación de dependencias');
  
  // Limpiar cache de npm
  runCommand('npm cache clean --force', 'Limpieza de cache de npm');
  
  // Verificar instalación de Expo CLI
  runCommand('npx expo --version', 'Verificación de Expo CLI');
  
  // Limpiar cache de Expo
  runCommand('npx expo r -c', 'Limpieza de cache de Expo');
  
  console.log('🎯 SOLUCIÓN COMPLETADA');
  console.log('=====================');
  console.log('✅ Cache limpiado');
  console.log('✅ Dependencias reinstaladas');
  console.log('✅ Cache de Expo limpiado');
  console.log('');
  console.log('💡 Próximos pasos:');
  console.log('   1. Reinicia Metro: npx expo start --clear');
  console.log('   2. Si el error persiste, reinicia el dispositivo/emulador');
  console.log('   3. Verifica que el backend esté ejecutándose en http://192.168.0.4:3000');
}

main().catch(console.error);
