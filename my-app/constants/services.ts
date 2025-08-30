export const SERVICES = [
  // Psicología y Salud Mental
  'Consulta Psicológica',
  'Terapia Cognitivo-Conductual',
  'Terapia Psicoanalítica',
  'Terapia Familiar',
  'Terapia de Pareja',
  'Psicología Infantil',
  'Psicología Adolescente',
  'Psicología del Deporte',
  'Psicología Laboral',
  'Terapia de Grupo',
  'Evaluación Psicológica',
  'Intervención en Crisis',
  
  // Medicina General y Especialidades
  'Consulta Médica General',
  'Consulta de Pediatría',
  'Consulta de Geriatría',
  'Consulta de Ginecología',
  'Consulta de Cardiología',
  'Consulta de Dermatología',
  'Consulta de Endocrinología',
  'Consulta de Gastroenterología',
  'Consulta de Neurología',
  'Consulta de Oftalmología',
  'Consulta de Otorrinolaringología',
  'Consulta de Traumatología',
  'Consulta de Urología',
  'Consulta de Oncología',
  'Consulta de Reumatología',
  'Consulta de Neumología',
  
  // Terapias Físicas y Rehabilitación
  'Fisioterapia General',
  'Fisioterapia Deportiva',
  'Fisioterapia Neurológica',
  'Fisioterapia Respiratoria',
  'Fisioterapia Pediátrica',
  'Fisioterapia Geriátrica',
  'Rehabilitación Post-Quirúrgica',
  'Rehabilitación Neurológica',
  'Rehabilitación Cardíaca',
  'Rehabilitación Pulmonar',
  'Terapia Manual',
  'Punción Seca',
  'Electroterapia',
  'Hidroterapia',
  'Crioterapia',
  'Termoterapia',
  
  // Terapias Ocupacionales
  'Terapia Ocupacional General',
  'Terapia Ocupacional Pediátrica',
  'Terapia Ocupacional Geriátrica',
  'Terapia Ocupacional Neurológica',
  'Terapia Ocupacional Psiquiátrica',
  'Rehabilitación de Mano',
  'Adaptación del Hogar',
  'Evaluación de Conducción',
  'Terapia de Actividades de la Vida Diaria',
  
  // Terapias del Lenguaje y Comunicación
  'Terapia de Lenguaje',
  'Terapia de Habla',
  'Terapia de Voz',
  'Terapia de Deglución',
  'Terapia de Fluidez',
  'Terapia de Articulación',
  'Terapia de Comprensión',
  'Terapia de Expresión',
  'Terapia de Lectura y Escritura',
  'Terapia de Comunicación Aumentativa',
  
  // Nutrición y Dietética
  'Consulta Nutricional',
  'Nutrición Clínica',
  'Nutrición Pediátrica',
  'Nutrición Deportiva',
  'Nutrición Geriátrica',
  'Nutrición para Embarazadas',
  'Nutrición para Diabéticos',
  'Nutrición para Hipertensos',
  'Nutrición para Celíacos',
  'Nutrición para Alergias',
  'Planificación de Menús',
  'Educación Nutricional',
  
  // Psicopedagogía y Educación
  'Psicopedagogía General',
  'Evaluación Psicopedagógica',
  'Intervención en Dificultades de Aprendizaje',
  'Tratamiento de Dislexia',
  'Tratamiento de Discalculia',
  'Tratamiento de Disgrafía',
  'Intervención en TDAH',
  'Orientación Vocacional',
  'Técnicas de Estudio',
  'Apoyo Escolar',
  
  // Odontología
  'Consulta Odontológica General',
  'Limpieza Dental',
  'Tratamiento de Caries',
  'Endodoncia',
  'Ortodoncia',
  'Periodoncia',
  'Cirugía Oral',
  'Implantes Dentales',
  'Prótesis Dentales',
  'Odontopediatría',
  'Odontología Estética',
  'Blanqueamiento Dental',
  
  // Enfermería
  'Consulta de Enfermería',
  'Curación de Heridas',
  'Administración de Medicamentos',
  'Control de Signos Vitales',
  'Educación para la Salud',
  'Cuidados Paliativos',
  'Enfermería Pediátrica',
  'Enfermería Geriátrica',
  'Enfermería de Salud Mental',
  'Enfermería Comunitaria',
  
  // Terapias Alternativas
  'Acupuntura',
  'Quiropraxia',
  'Osteopatía',
  'Reflexología',
  'Aromaterapia',
  'Meditación',
  'Yoga Terapéutico',
  'Pilates Terapéutico',
  'Tai Chi',
  'Reiki',
  
  // Entrenamiento Personal
  'Entrenamiento Personal',
  'Entrenamiento Funcional',
  'Entrenamiento de Fuerza',
  'Entrenamiento Cardiovascular',
  'Entrenamiento de Flexibilidad',
  'Entrenamiento para Pérdida de Peso',
  'Entrenamiento para Ganancia Muscular',
  'Entrenamiento Deportivo',
  'Entrenamiento para Adultos Mayores',
  'Entrenamiento Prenatal',
  'Entrenamiento Postnatal',
  
  // Masajes
  'Masaje Terapéutico',
  'Masaje Deportivo',
  'Masaje Relajante',
  'Masaje Descontracturante',
  'Masaje Reductivo',
  'Masaje Circulatorio',
  'Masaje para Embarazadas',
  'Masaje Infantil',
  'Drenaje Linfático',
  'Masaje con Piedras Calientes',
] as const;

export type ServiceType = typeof SERVICES[number];

// Función para obtener servicios filtrados por categoría
export const getServicesByCategory = (category: string) => {
  const categories: { [key: string]: string[] } = {
    'Psicología y Salud Mental': SERVICES.filter(service => 
      service.includes('Psicología') || 
      service.includes('Terapia') || 
      service.includes('Evaluación') ||
      service.includes('Intervención')
    ),
    'Medicina': SERVICES.filter(service => 
      service.includes('Consulta de') || 
      service.includes('Consulta Médica')
    ),
    'Fisioterapia': SERVICES.filter(service => 
      service.includes('Fisioterapia') || 
      service.includes('Rehabilitación')
    ),
    'Terapia Ocupacional': SERVICES.filter(service => 
      service.includes('Terapia Ocupacional')
    ),
    'Terapia del Lenguaje': SERVICES.filter(service => 
      service.includes('Terapia de') && 
      (service.includes('Lenguaje') || service.includes('Habla') || service.includes('Voz'))
    ),
    'Nutrición': SERVICES.filter(service => 
      service.includes('Nutrición') || 
      service.includes('Consulta Nutricional')
    ),
    'Psicopedagogía': SERVICES.filter(service => 
      service.includes('Psicopedagogía') || 
      service.includes('Evaluación Psicopedagógica')
    ),
    'Odontología': SERVICES.filter(service => 
      service.includes('Odontología') || 
      service.includes('Dental')
    ),
    'Enfermería': SERVICES.filter(service => 
      service.includes('Enfermería') || 
      service.includes('Curación')
    ),
    'Terapias Alternativas': SERVICES.filter(service => 
      ['Acupuntura', 'Quiropraxia', 'Osteopatía', 'Reflexología', 'Aromaterapia', 'Meditación', 'Yoga Terapéutico', 'Pilates Terapéutico', 'Tai Chi', 'Reiki'].includes(service)
    ),
    'Entrenamiento': SERVICES.filter(service => 
      service.includes('Entrenamiento')
    ),
    'Masajes': SERVICES.filter(service => 
      service.includes('Masaje') || 
      service.includes('Drenaje')
    ),
  };
  
  return categories[category] || [];
};

// Función para buscar servicios por texto
export const searchServices = (query: string) => {
  const lowercaseQuery = (query || '').toLowerCase();
  return SERVICES.filter(service => 
    service && service.toLowerCase().includes(lowercaseQuery)
  );
};

