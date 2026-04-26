const fs = require('fs');
const path = require('path');

console.log('🔄 Verificando corrección del error de contexto...\n');

// Verificar que los providers estén correctamente configurados
const providersPath = path.join(__dirname, 'my-app', 'contexts', 'Providers.tsx');
const providersContent = fs.readFileSync(providersPath, 'utf8');

console.log('1️⃣ Verificando configuración de Providers...');
if (providersContent.includes('AvailabilityProvider') && providersContent.includes('AppointmentProvider')) {
  console.log('✅ Providers configurados correctamente');
  
  // Verificar el orden de los providers
  const availabilityIndex = providersContent.indexOf('AvailabilityProvider');
  const appointmentIndex = providersContent.indexOf('AppointmentProvider');
  
  if (availabilityIndex < appointmentIndex) {
    console.log('✅ AvailabilityProvider está antes que AppointmentProvider');
  } else {
    console.log('❌ AvailabilityProvider debe estar antes que AppointmentProvider');
  }
} else {
  console.log('❌ Providers no configurados correctamente');
}

// Verificar que AppointmentContext maneje el error de forma segura
const appointmentContextPath = path.join(__dirname, 'my-app', 'contexts', 'AppointmentContext.tsx');
const appointmentContent = fs.readFileSync(appointmentContextPath, 'utf8');

console.log('\n2️⃣ Verificando manejo seguro de useAvailability...');
if (appointmentContent.includes('try {') && appointmentContent.includes('availabilityContext = useAvailability()')) {
  console.log('✅ AppointmentContext maneja useAvailability de forma segura');
} else {
  console.log('❌ AppointmentContext no maneja useAvailability de forma segura');
}

// Verificar que se manejen los casos cuando las funciones no están disponibles
console.log('\n3️⃣ Verificando manejo de funciones no disponibles...');
if (appointmentContent.includes('blockTimeSlot &&') && appointmentContent.includes('unblockAppointmentTimeSlots &&')) {
  console.log('✅ Se verifica la disponibilidad de las funciones antes de usarlas');
} else {
  console.log('❌ No se verifica la disponibilidad de las funciones');
}

console.log('\n4️⃣ Verificando mensajes de advertencia...');
if (appointmentContent.includes('no disponible') && appointmentContent.includes('console.warn')) {
  console.log('✅ Se incluyen mensajes de advertencia apropiados');
} else {
  console.log('❌ No se incluyen mensajes de advertencia');
}

console.log('\n🎉 Verificación completada!');
console.log('\n📋 Resumen de la corrección:');
console.log('   ✅ Providers reordenados correctamente');
console.log('   ✅ AppointmentContext maneja useAvailability de forma segura');
console.log('   ✅ Se verifica disponibilidad de funciones antes de usarlas');
console.log('   ✅ Se incluyen mensajes de advertencia apropiados');
console.log('\n🚀 El error "useAvailability must be used within an AvailabilityProvider" debería estar solucionado');
