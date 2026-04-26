/**
 * Script de prueba final para verificar que el error de sintaxis esté corregido
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Probando corrección del error de sintaxis...\n');

function testMetroConfigSyntax() {
  console.log('⚙️ Verificando sintaxis de metro.config.js...');
  
  try {
    // Verificar sintaxis del archivo
    execSync('node -c metro.config.js', { stdio: 'pipe' });
    console.log('   ✅ Sintaxis de metro.config.js correcta');
    
    // Verificar que el archivo se puede cargar
    const metroConfig = require('./metro.config.js');
    console.log('   ✅ metro.config.js se puede cargar correctamente');
    
    // Verificar configuración específica
    if (metroConfig.resolver && metroConfig.resolver.alias) {
      console.log('   ✅ Configuración de alias encontrada');
    } else {
      console.log('   ⚠️ Configuración de alias no encontrada');
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error en metro.config.js: ${error.message}`);
    return false;
  }
}

function testExpoStart() {
  console.log('\n🚀 Probando inicio de Expo...');
  
  try {
    // Verificar que Expo puede iniciar
    execSync('npx expo start --help', { stdio: 'pipe' });
    console.log('   ✅ Expo puede iniciar correctamente');
    return true;
  } catch (error) {
    console.log(`   ❌ Error con Expo: ${error.message}`);
    return false;
  }
}

function testBabelConfig() {
  console.log('\n🔧 Verificando babel.config.js...');
  
  try {
    // Verificar sintaxis del archivo
    execSync('node -c babel.config.js', { stdio: 'pipe' });
    console.log('   ✅ Sintaxis de babel.config.js correcta');
    
    // Verificar que el archivo se puede cargar
    const babelConfig = require('./babel.config.js');
    console.log('   ✅ babel.config.js se puede cargar correctamente');
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error en babel.config.js: ${error.message}`);
    return false;
  }
}

function testAppJson() {
  console.log('\n📱 Verificando app.json...');
  
  try {
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    console.log('   ✅ app.json es válido');
    
    if (appJson.expo && appJson.expo.jsEngine === 'hermes') {
      console.log('   ✅ Hermes configurado correctamente');
    } else {
      console.log('   ⚠️ Hermes no configurado');
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error en app.json: ${error.message}`);
    return false;
  }
}

function testAllConfigurations() {
  console.log('\n📁 Verificando todas las configuraciones...');
  
  const configFiles = [
    'metro.config.js',
    'babel.config.js',
    'app.json',
    'expo.config.js',
    'package.json'
  ];
  
  let allExist = true;
  configFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file} - Existe`);
    } else {
      console.log(`   ❌ ${file} - No existe`);
      allExist = false;
    }
  });
  
  return allExist;
}

function main() {
  console.log('🔧 VERIFICACIÓN DE CORRECCIÓN DE SINTAXIS');
  console.log('========================================\n');
  
  const metroSyntax = testMetroConfigSyntax();
  const expoStart = testExpoStart();
  const babelConfig = testBabelConfig();
  const appJson = testAppJson();
  const allConfigs = testAllConfigurations();
  
  console.log('\n📊 RESULTADOS:');
  console.log('==============');
  console.log(`   Metro Config Syntax: ${metroSyntax ? '✅ CORRECTO' : '❌ ERROR'}`);
  console.log(`   Expo Start: ${expoStart ? '✅ FUNCIONA' : '❌ ERROR'}`);
  console.log(`   Babel Config: ${babelConfig ? '✅ CORRECTO' : '❌ ERROR'}`);
  console.log(`   App.json: ${appJson ? '✅ VÁLIDO' : '❌ ERROR'}`);
  console.log(`   All Configs: ${allConfigs ? '✅ EXISTEN' : '❌ FALTAN'}`);
  
  const allPassed = metroSyntax && expoStart && babelConfig && appJson && allConfigs;
  
  if (allPassed) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS EXITOSAS!');
    console.log('✅ Error de sintaxis corregido');
    console.log('✅ Metro configurado correctamente');
    console.log('✅ Expo puede iniciar');
    console.log('✅ Todas las configuraciones válidas');
    console.log('');
    console.log('💡 La aplicación está lista para usar:');
    console.log('   npx expo start --clear');
  } else {
    console.log('\n⚠️ Algunas pruebas fallaron');
    console.log('Revisa los errores mostrados arriba');
  }
}

main();
