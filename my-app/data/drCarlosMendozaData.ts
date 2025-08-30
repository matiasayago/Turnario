// Datos de prueba específicos para el Dr. Carlos Mendoza
export const drCarlosMendozaData = {
  // Información del profesional
  professional: {
    id: 'prof_002',
    name: 'Dr. Carlos Mendoza',
    service: 'Psicología',
    email: 'carlos.mendoza@turnario.com',
    phone: '+1234567890',
    specialization: 'Psicología Clínica y Terapia Cognitivo-Conductual',
    experience: '15 años',
    education: 'Doctorado en Psicología Clínica - Universidad de Buenos Aires',
    certifications: [
      'Terapia Cognitivo-Conductual',
      'EMDR (Eye Movement Desensitization and Reprocessing)',
      'Terapia de Aceptación y Compromiso (ACT)',
      'Psicología Forense'
    ],
    languages: ['Español', 'Inglés'],
    consultationFee: '$80 USD',
    rating: 4.9,
    totalReviews: 156
  },

  // Horarios de trabajo
  workingHours: {
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' }
  },

  // Configuración de citas
  appointmentSettings: {
    duration: 45, // minutos
    breakTime: { start: '12:00', end: '13:00' },
    maxAppointmentsPerDay: 16,
    advanceBookingDays: 30,
    cancellationPolicy: '24 horas de anticipación'
  },

  // Pacientes activos
  patients: [
    {
      id: '1',
      name: 'María González',
      age: '35',
      phone: '+1234567890',
      email: 'maria.gonzalez@email.com',
      diagnosis: 'Ansiedad y estrés laboral',
      treatmentPlan: 'Terapia cognitivo-conductual',
      sessionsCompleted: 8,
      lastVisit: '2024-01-10',
      nextAppointment: '2024-01-15',
      status: 'Activo',
      notes: 'Paciente responde bien al tratamiento, reducción del 60% en síntomas de ansiedad'
    },
    {
      id: '2',
      name: 'Carlos Ruiz',
      age: '42',
      phone: '+1234567891',
      email: 'carlos.ruiz@email.com',
      diagnosis: 'Depresión moderada',
      treatmentPlan: 'Terapia interpersonal + medicación',
      sessionsCompleted: 12,
      lastVisit: '2024-01-08',
      nextAppointment: '2024-01-16',
      status: 'Activo',
      notes: 'Mejora significativa en estado de ánimo, considerando reducir medicación'
    },
    {
      id: '3',
      name: 'Ana Martínez',
      age: '28',
      phone: '+1234567892',
      email: 'ana.martinez@email.com',
      diagnosis: 'Evaluación inicial',
      treatmentPlan: 'Pendiente de evaluación',
      sessionsCompleted: 1,
      lastVisit: '2024-01-05',
      nextAppointment: '2024-01-18',
      status: 'Nuevo',
      notes: 'Primera consulta, paciente refiere síntomas de ansiedad social'
    },
    {
      id: '4',
      name: 'Luis Rodríguez',
      age: '39',
      phone: '+1234567893',
      email: 'luis.rodriguez@email.com',
      diagnosis: 'Problemas de pareja',
      treatmentPlan: 'Terapia familiar sistémica',
      sessionsCompleted: 6,
      lastVisit: '2024-01-03',
      nextAppointment: '2024-01-20',
      status: 'Activo',
      notes: 'Progreso en comunicación, trabajo en habilidades de resolución de conflictos'
    },
    {
      id: '5',
      name: 'Patricia López',
      age: '45',
      phone: '+1234567894',
      email: 'patricia.lopez@email.com',
      diagnosis: 'Trastorno de ansiedad generalizada',
      treatmentPlan: 'Terapia de aceptación y compromiso',
      sessionsCompleted: 15,
      lastVisit: '2024-01-01',
      nextAppointment: '2024-01-22',
      status: 'Activo',
      notes: 'Excelente progreso, paciente ha desarrollado herramientas efectivas de manejo'
    },
    {
      id: '6',
      name: 'Roberto Silva',
      age: '31',
      phone: '+1234567895',
      email: 'roberto.silva@email.com',
      diagnosis: 'Trastorno de pánico',
      treatmentPlan: 'Terapia de exposición + relajación',
      sessionsCompleted: 10,
      lastVisit: '2023-12-28',
      nextAppointment: '2024-01-25',
      status: 'Activo',
      notes: 'Reducción del 80% en ataques de pánico, trabajo en prevención de recaídas'
    },
    {
      id: '7',
      name: 'Carmen Herrera',
      age: '38',
      phone: '+1234567896',
      email: 'carmen.herrera@email.com',
      diagnosis: 'Trastorno obsesivo-compulsivo',
      treatmentPlan: 'Terapia cognitivo-conductual + ERP',
      sessionsCompleted: 18,
      lastVisit: '2023-12-25',
      nextAppointment: '2024-01-26',
      status: 'Activo',
      notes: 'Progreso estable, reducción en compulsiones, trabajo en exposición gradual'
    },
    {
      id: '8',
      name: 'Fernando Vargas',
      age: '52',
      phone: '+1234567897',
      email: 'fernando.vargas@email.com',
      diagnosis: 'Trastorno de estrés postraumático',
      treatmentPlan: 'EMDR + terapia de procesamiento',
      sessionsCompleted: 22,
      lastVisit: '2023-12-20',
      nextAppointment: '2024-01-29',
      status: 'Activo',
      notes: 'Significativa reducción en síntomas de TEPT, trabajo en integración de experiencias'
    }
  ],

  // Citas pendientes
  pendingAppointments: [
    {
      id: '1',
      patientName: 'María González',
      service: 'Consulta Psicológica',
      date: '2024-01-15',
      time: '15:00 - 15:45',
      patientPhone: '+1234567890',
      patientEmail: 'maria.gonzalez@email.com',
      notes: 'Seguimiento de terapia para ansiedad y estrés laboral'
    },
    {
      id: '2',
      patientName: 'Carlos Ruiz',
      service: 'Consulta Psicológica',
      date: '2024-01-16',
      time: '10:00 - 10:45',
      patientPhone: '+1234567891',
      patientEmail: 'carlos.ruiz@email.com',
      notes: 'Seguimiento de terapia para depresión moderada'
    },
    {
      id: '3',
      patientName: 'Ana Martínez',
      service: 'Consulta Psicológica',
      date: '2024-01-17',
      time: '14:00 - 14:45',
      patientPhone: '+1234567892',
      patientEmail: 'ana.martinez@email.com',
      notes: 'Segunda sesión, evaluación inicial completada'
    },
    {
      id: '4',
      patientName: 'Luis Rodríguez',
      service: 'Consulta Psicológica',
      date: '2024-01-18',
      time: '11:00 - 11:45',
      patientPhone: '+1234567893',
      patientEmail: 'luis.rodriguez@email.com',
      notes: 'Seguimiento de terapia familiar sistémica'
    },
    {
      id: '5',
      patientName: 'Patricia López',
      service: 'Consulta Psicológica',
      date: '2024-01-19',
      time: '16:00 - 16:45',
      patientPhone: '+1234567894',
      patientEmail: 'patricia.lopez@email.com',
      notes: 'Consulta de seguimiento mensual'
    }
  ],

  // Citas confirmadas para hoy
  todayAppointments: [
    {
      id: '1',
      time: '09:00 - 09:45',
      patientName: 'María González',
      service: 'Consulta Psicológica',
      status: 'Confirmado'
    },
    {
      id: '2',
      time: '10:00 - 10:45',
      patientName: 'Carlos Ruiz',
      service: 'Consulta Psicológica',
      status: 'Confirmado'
    },
    {
      id: '3',
      time: '14:00 - 14:45',
      patientName: 'Ana Martínez',
      service: 'Consulta Psicológica',
      status: 'Pendiente'
    }
  ],

  // Estadísticas
  statistics: {
    totalPatients: 8,
    activePatients: 8,
    newPatientsThisMonth: 1,
    appointmentsThisWeek: 25,
    appointmentsThisMonth: 156,
    averageRating: 4.9,
    totalReviews: 156,
    completionRate: 98,
    patientSatisfaction: 95
  },

  // Consultorios configurados
  clinics: [
    {
      id: 'clinic_001',
      name: 'Consultorio Dr. Carlos Mendoza',
      address: 'Av. Corrientes 1234, Buenos Aires',
      phone: '+1234567890',
      email: 'consultorio@carlosmendoza.com',
      workingHours: {
        monday: { enabled: true, start: '08:00', end: '20:00' },
        tuesday: { enabled: true, start: '08:00', end: '20:00' },
        wednesday: { enabled: true, start: '08:00', end: '20:00' },
        thursday: { enabled: true, start: '08:00', end: '20:00' },
        friday: { enabled: true, start: '08:00', end: '20:00' },
        saturday: { enabled: true, start: '09:00', end: '18:00' },
        sunday: { enabled: false, start: '09:00', end: '13:00' }
      }
    },
    {
      id: 'clinic_002',
      name: 'Centro Médico Integral',
      address: 'Belgrano 567, Buenos Aires',
      phone: '+1234567891',
      email: 'info@centromedico.com',
      workingHours: {
        monday: { enabled: true, start: '07:00', end: '22:00' },
        tuesday: { enabled: true, start: '07:00', end: '22:00' },
        wednesday: { enabled: true, start: '07:00', end: '22:00' },
        thursday: { enabled: true, start: '07:00', end: '22:00' },
        friday: { enabled: true, start: '07:00', end: '22:00' },
        saturday: { enabled: true, start: '08:00', end: '20:00' },
        sunday: { enabled: true, start: '09:00', end: '18:00' }
      }
    }
  ],

  // Servicios ofrecidos
  services: [
    'Consulta Psicológica',
    'Terapia Cognitivo-Conductual',
    'EMDR',
    'Terapia de Aceptación y Compromiso',
    'Terapia Familiar Sistémica',
    'Evaluación Psicológica',
    'Psicología Forense'
  ],

  // Notas de sesiones recientes
  sessionNotes: [
    {
      patientId: '1',
      date: '2024-01-10',
      notes: 'Sesión productiva. María ha implementado exitosamente las técnicas de respiración y mindfulness. Reducción del 60% en síntomas de ansiedad. Tarea: práctica diaria de relajación muscular progresiva.',
      nextGoals: 'Trabajar en exposición gradual a situaciones laborales estresantes'
    },
    {
      patientId: '2',
      date: '2024-01-08',
      notes: 'Carlos muestra mejoría significativa en estado de ánimo. Ha retomado actividades que disfrutaba. Considerar reducción gradual de medicación en próxima consulta con psiquiatra.',
      nextGoals: 'Mantener rutina de actividades placenteras, trabajo en autoestima'
    },
    {
      patientId: '3',
      date: '2024-01-05',
      notes: 'Primera consulta con Ana. Evaluación inicial completada. Diagnóstico preliminar: ansiedad social. Paciente motivada para el tratamiento.',
      nextGoals: 'Completar evaluación completa, establecer plan de tratamiento'
    }
  ]
};

export default drCarlosMendozaData;

