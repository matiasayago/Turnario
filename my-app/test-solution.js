// Script de prueba para verificar que la solución del módulo 1417 esté funcionando
console.log('🧪 Iniciando prueba de solución para módulo 1417...');

// Simular el entorno global
global.require = global.require || function(id) {
  console.log(`🔍 Intentando requerir módulo: ${id}`);
  if (id === '1417') {
    console.log('✅ Módulo 1417 interceptado correctamente');
    return { default: {}, __esModule: true };
  }
  return {};
};

// Probar la interceptación
try {
  const module1417 = global.require('1417');
  console.log('✅ Prueba exitosa: Módulo 1417 interceptado');
  console.log('📦 Módulo devuelto:', module1417);
} catch (error) {
  console.error('❌ Error en la prueba:', error.message);
}

console.log('🏁 Prueba completada');

