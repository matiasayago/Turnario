import { ValidationResult, ValidationError } from '../types';

// Validaciones de email
export const validateEmail = (email: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!email) {
    errors.push({ field: 'email', message: 'El email es requerido' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'El formato del email no es válido' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validaciones de contraseña
export const validatePassword = (password: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!password) {
    errors.push({ field: 'password', message: 'La contraseña es requerida' });
  } else if (password.length < 6) {
    errors.push({ field: 'password', message: 'La contraseña debe tener al menos 6 caracteres' });
  } else if (!/(?=.*[a-z])/.test(password)) {
    errors.push({ field: 'password', message: 'La contraseña debe contener al menos una letra minúscula' });
  } else if (!/(?=.*[A-Z])/.test(password)) {
    errors.push({ field: 'password', message: 'La contraseña debe contener al menos una letra mayúscula' });
  } else if (!/(?=.*\d)/.test(password)) {
    errors.push({ field: 'password', message: 'La contraseña debe contener al menos un número' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validaciones de nombre
export const validateName = (name: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!name) {
    errors.push({ field: 'name', message: 'El nombre es requerido' });
  } else if (name.length < 2) {
    errors.push({ field: 'name', message: 'El nombre debe tener al menos 2 caracteres' });
  } else if (name.length > 50) {
    errors.push({ field: 'name', message: 'El nombre no puede exceder 50 caracteres' });
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
    errors.push({ field: 'name', message: 'El nombre solo puede contener letras y espacios' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validaciones de teléfono
export const validatePhone = (phone: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (phone && !/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(phone)) {
    errors.push({ field: 'phone', message: 'El formato del teléfono no es válido' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validaciones de fecha
export const validateDate = (date: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!date) {
    errors.push({ field: 'date', message: 'La fecha es requerida' });
  } else {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      errors.push({ field: 'date', message: 'No se pueden seleccionar fechas pasadas' });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validaciones de hora
export const validateTime = (time: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!time) {
    errors.push({ field: 'time', message: 'La hora es requerida' });
  } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    errors.push({ field: 'time', message: 'El formato de hora debe ser HH:MM' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validaciones de precio
export const validatePrice = (price: number): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (price === undefined || price === null) {
    errors.push({ field: 'price', message: 'El precio es requerido' });
  } else if (price < 0) {
    errors.push({ field: 'price', message: 'El precio no puede ser negativo' });
  } else if (price > 10000) {
    errors.push({ field: 'price', message: 'El precio no puede exceder $10,000' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validaciones de duración
export const validateDuration = (duration: number): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (duration === undefined || duration === null) {
    errors.push({ field: 'duration', message: 'La duración es requerida' });
  } else if (duration < 15) {
    errors.push({ field: 'duration', message: 'La duración mínima es 15 minutos' });
  } else if (duration > 480) {
    errors.push({ field: 'duration', message: 'La duración máxima es 8 horas' });
  } else if (duration % 15 !== 0) {
    errors.push({ field: 'duration', message: 'La duración debe ser múltiplo de 15 minutos' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validaciones de notas
export const validateNotes = (notes: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (notes && notes.length > 500) {
    errors.push({ field: 'notes', message: 'Las notas no pueden exceder 500 caracteres' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validación de formulario de registro
export const validateRegistrationForm = (formData: {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone?: string;
  userType: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Validar email
  const emailValidation = validateEmail(formData.email);
  errors.push(...emailValidation.errors);
  
  // Validar contraseña
  const passwordValidation = validatePassword(formData.password);
  errors.push(...passwordValidation.errors);
  
  // Validar confirmación de contraseña
  if (formData.password !== formData.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Las contraseñas no coinciden' });
  }
  
  // Validar nombre
  const nameValidation = validateName(formData.name);
  errors.push(...nameValidation.errors);
  
  // Validar teléfono (opcional)
  if (formData.phone) {
    const phoneValidation = validatePhone(formData.phone);
    errors.push(...phoneValidation.errors);
  }
  
  // Validar tipo de usuario
  if (!formData.userType) {
    errors.push({ field: 'userType', message: 'Debe seleccionar un tipo de usuario' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validación de formulario de login
export const validateLoginForm = (formData: {
  email: string;
  password: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Validar email
  const emailValidation = validateEmail(formData.email);
  errors.push(...emailValidation.errors);
  
  // Validar contraseña
  if (!formData.password) {
    errors.push({ field: 'password', message: 'La contraseña es requerida' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validación de formulario de cita
export const validateAppointmentForm = (formData: {
  date: string;
  time: string;
  duration: number;
  notes?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Validar fecha
  const dateValidation = validateDate(formData.date);
  errors.push(...dateValidation.errors);
  
  // Validar hora
  const timeValidation = validateTime(formData.time);
  errors.push(...timeValidation.errors);
  
  // Validar duración
  const durationValidation = validateDuration(formData.duration);
  errors.push(...durationValidation.errors);
  
  // Validar notas
  if (formData.notes) {
    const notesValidation = validateNotes(formData.notes);
    errors.push(...notesValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validación de formulario de perfil
export const validateProfileForm = (formData: {
  name: string;
  phone?: string;
  bio?: string;
  specialty?: string;
  price?: number;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Validar nombre
  const nameValidation = validateName(formData.name);
  errors.push(...nameValidation.errors);
  
  // Validar teléfono
  if (formData.phone) {
    const phoneValidation = validatePhone(formData.phone);
    errors.push(...phoneValidation.errors);
  }
  
  // Validar bio
  if (formData.bio && formData.bio.length > 1000) {
    errors.push({ field: 'bio', message: 'La biografía no puede exceder 1000 caracteres' });
  }
  
  // Validar especialidad
  if (formData.specialty && formData.specialty.length > 100) {
    errors.push({ field: 'specialty', message: 'La especialidad no puede exceder 100 caracteres' });
  }
  
  // Validar precio
  if (formData.price !== undefined) {
    const priceValidation = validatePrice(formData.price);
    errors.push(...priceValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Función helper para obtener el primer error de un campo específico
export const getFieldError = (errors: ValidationError[], fieldName: string): string | null => {
  const fieldError = errors.find(error => error.field === fieldName);
  return fieldError ? fieldError.message : null;
};

// Función helper para verificar si un campo tiene errores
export const hasFieldError = (errors: ValidationError[], fieldName: string): boolean => {
  return errors.some(error => error.field === fieldName);
};

