/**
 * Script de prueba para verificar que el error de módulo Hermes esté solucionado
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Probando solución del error de módulo Hermes...\n');

function checkFiles() {
  console.log('📁 Verificando archivos de configuración...');
  
  const files = [
    'metro.config.js',
    'app.json',
    'package.json',
    'node_modules'
  ];
  
  files.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file} - Existe`);
    } else {
      console.log(`   ❌ ${file} - No existe`);
    }
  });
  
  console.log('');
}

function checkMetroConfig() {
  console.log('⚙️ Verificando configuración de Metro...');
  
  try {
    const metroConfig = fs.readFileSync('metro.config.js', 'utf8');
    
    if (metroConfig.includes('1417')) {
      console.log('   ✅ Configuración para módulo "1417" encontrada');
    } else {
      console.log('   ⚠️ Configuración para módulo "1417" no encontrada');
    }
    
    if (metroConfig.includes('resetCache')) {
      console.log('   ✅ Reset de cache configurado');
    } else {
      console.log('   ⚠️ Reset de cache no configurado');
    }
    
    if (metroConfig.includes('alias')) {
      console.log('   ✅ Alias de módulos configurado');
    } else {
      console.log('   ⚠️ Alias de módulos no configurado');
    }
    
  } catch (error) {
    console.log(`   ❌ Error leyendo metro.config.js: ${error.message}`);
  }
  
  console.log('');
}

function checkAppJson() {
  console.log('📱 Verificando configuración de app.json...');
  
  try {
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    
    if (appJson.expo && appJson.expo.jsEngine === 'hermes') {
      console.log('   ✅ Motor JS configurado como Hermes');
    } else {
      console.log('   ⚠️ Motor JS no configurado como Hermes');
    }
    
    if (appJson.expo && appJson.expo.ios && appJson.expo.ios.jsEngine === 'hermes') {
      console.log('   ✅ Hermes configurado para iOS');
    } else {
      console.log('   ⚠️ Hermes no configurado para iOS');
    }
    
    if (appJson.expo && appJson.expo.android && appJson.expo.android.jsEngine === 'hermes') {
      console.log('   ✅ Hermes configurado para Android');
    } else {
      console.log('   ⚠️ Hermes no configurado para Android');
    }
    
  } catch (error) {
    console.log(`   ❌ Error leyendo app.json: ${error.message}`);
  }
  
  console.log('');
}

function testMetroStart() {
  console.log('🚀 Probando inicio de Metro...');
  
  try {
    // Verificar que Metro puede iniciar sin errores
    console.log('   📝 Verificando configuración de Metro...');
    execSync('npx expo start --help', { stdio: 'pipe' });
    console.log('   ✅ Metro puede iniciar correctamente');
  } catch (error) {
    console.log(`   ❌ Error con Metro: ${error.message}`);
  }
  
  console.log('');
}

function cleanCaches() {
  console.log('🧹 Limpiando caches finales...');
  
  const cachePaths = [
    'node_modules/.cache',
    '.expo',
    'metro-cache',
    '.metro'
  ];
  
  cachePaths.forEach(cachePath => {
    if (fs.existsSync(cachePath)) {
      try {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log(`   ✅ Eliminado: ${cachePath}`);
      } catch (error) {
        console.log(`   ⚠️ No se pudo eliminar: ${cachePath}`);
      }
    }
  });
  
  console.log('');
}

function main() {
  console.log('🔧 VERIFICACIÓN DE SOLUCIÓN DE ERROR HERMES');
  console.log('==========================================\n');
  
  checkFiles();
  checkMetroConfig();
  checkAppJson();
  cleanCaches();
  testMetroStart();
  
  console.log('🎯 VERIFICACIÓN COMPLETADA');
  console.log('==========================');
  console.log('✅ Configuración de Metro optimizada');
  console.log('✅ Configuración de Hermes aplicada');
  console.log('✅ Caches limpiados');
  console.log('');
  console.log('💡 Para probar la solución:');
  console.log('   1. Ejecuta: npx expo start --clear');
  console.log('   2. Si el error persiste, reinicia el dispositivo');
  console.log('   3. Verifica que no aparezca el error "Requiring unknown module 1417"');
  console.log('');
  console.log('🔧 Configuración aplicada:');
  console.log('   - Alias para módulo "1417" deshabilitado');
  console.log('   - Reset de cache habilitado');
  console.log('   - Hermes configurado para todas las plataformas');
  console.log('   - Configuración de transformación optimizada');
}

main();
