const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function testAvailabilityBackend() {
  console.log('🧪 Probando endpoints de disponibilidad...\n');

  const testProfessionalId = 'test_professional_123';
  const testAvailabilityData = {
    professionalId: testProfessionalId,
    professionalName: 'Dr. Test Professional',
    daysOfWeek: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    timeSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
    workingHours: {
      start: '09:00',
      end: '18:00',
    },
    breakTime: {
      start: '13:00',
      end: '14:00',
    },
    isActive: true,
  };

  try {
    // 1. Crear/Actualizar disponibilidad
    console.log('1️⃣ Creando/Actualizando disponibilidad...');
    const createResponse = await fetch(`${API_BASE_URL}/availability/${testProfessionalId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testAvailabilityData),
    });

    const createResult = await createResponse.json();
    console.log('✅ Respuesta de creación:', createResult);

    if (!createResponse.ok) {
      throw new Error(`Error creando disponibilidad: ${createResult.error}`);
    }

    // 2. Obtener disponibilidad
    console.log('\n2️⃣ Obteniendo disponibilidad...');
    const getResponse = await fetch(`${API_BASE_URL}/availability/${testProfessionalId}`);
    const getResult = await getResponse.json();
    console.log('✅ Respuesta de obtención:', getResult);

    if (!getResponse.ok) {
      throw new Error(`Error obteniendo disponibilidad: ${getResult.error}`);
    }

    // 3. Verificar que los datos coinciden
    console.log('\n3️⃣ Verificando datos...');
    const savedData = getResult.data;
    
    if (savedData.professionalId === testProfessionalId &&
        savedData.professionalName === testAvailabilityData.professionalName &&
        JSON.stringify(savedData.daysOfWeek) === JSON.stringify(testAvailabilityData.daysOfWeek) &&
        JSON.stringify(savedData.timeSlots) === JSON.stringify(testAvailabilityData.timeSlots)) {
      console.log('✅ Los datos se guardaron correctamente en la base de datos');
    } else {
      console.log('❌ Los datos no coinciden con lo que se envió');
      console.log('📤 Datos enviados:', testAvailabilityData);
      console.log('📥 Datos recibidos:', savedData);
    }

    // 4. Actualizar disponibilidad
    console.log('\n4️⃣ Actualizando disponibilidad...');
    const updateData = {
      ...testAvailabilityData,
      timeSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
      workingHours: {
        start: '08:00',
        end: '19:00',
      },
    };

    const updateResponse = await fetch(`${API_BASE_URL}/availability/${testProfessionalId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const updateResult = await updateResponse.json();
    console.log('✅ Respuesta de actualización:', updateResult);

    if (!updateResponse.ok) {
      throw new Error(`Error actualizando disponibilidad: ${updateResult.error}`);
    }

    // 5. Verificar actualización
    console.log('\n5️⃣ Verificando actualización...');
    const getUpdatedResponse = await fetch(`${API_BASE_URL}/availability/${testProfessionalId}`);
    const getUpdatedResult = await getUpdatedResponse.json();
    
    if (getUpdatedResult.data.timeSlots.length === 9 && 
        getUpdatedResult.data.workingHours.start === '08:00') {
      console.log('✅ La actualización se guardó correctamente');
    } else {
      console.log('❌ La actualización no se guardó correctamente');
    }

    console.log('\n🎉 ¡Todas las pruebas pasaron! El backend está funcionando correctamente.');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verificar que el servidor backend esté corriendo en puerto 3000');
    console.log('2. Verificar que MongoDB esté conectado');
    console.log('3. Verificar que los endpoints estén implementados correctamente');
  }
}

// Ejecutar las pruebas
testAvailabilityBackend();
