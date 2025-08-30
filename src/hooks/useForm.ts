import { useState, useCallback, useRef } from 'react';
import { ValidationResult, ValidationError } from '../types';

export interface FormField {
  value: string | number | boolean;
  error: string | null;
  touched: boolean;
  required?: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

export interface UseFormOptions {
  initialValues: Record<string, any>;
  validationSchema?: (values: Record<string, any>) => ValidationResult;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export const useForm = ({
  initialValues,
  validationSchema,
  onSubmit,
  validateOnChange = false,
  validateOnBlur = true,
}: UseFormOptions) => {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);

  // Inicializar campos del formulario
  const initializeFields = useCallback(() => {
    const fields: FormState = {};
    const initialErrors: Record<string, string | null> = {};
    const initialTouched: Record<string, boolean> = {};

    Object.keys(initialValues).forEach(key => {
      fields[key] = {
        value: initialValues[key],
        error: null,
        touched: false,
        required: validationSchema ? true : false,
      };
      initialErrors[key] = null;
      initialTouched[key] = false;
    });

    setValues(initialValues);
    setErrors(initialErrors);
    setTouched(initialTouched);
  }, [initialValues, validationSchema]);

  // Validar campo individual
  const validateField = useCallback((name: string, value: any): string | null => {
    if (!validationSchema) return null;

    const fieldValues = { ...values, [name]: value };
    const validation = validationSchema(fieldValues);
    const fieldError = validation.errors.find(error => error.field === name);
    
    return fieldError ? fieldError.message : null;
  }, [validationSchema, values]);

  // Validar todo el formulario
  const validateForm = useCallback((): ValidationResult => {
    if (!validationSchema) {
      return { isValid: true, errors: [] };
    }

    return validationSchema(values);
  }, [validationSchema, values]);

  // Actualizar valor de campo
  const setFieldValue = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }

    // Validar en tiempo real si está habilitado
    if (validateOnChange) {
      const fieldError = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: fieldError }));
    }
  }, [errors, validateOnChange, validateField]);

  // Marcar campo como tocado
  const setFieldTouched = useCallback((name: string, touched: boolean = true) => {
    setTouched(prev => ({ ...prev, [name]: touched }));
    
    // Validar al perder el foco si está habilitado
    if (validateOnBlur && touched) {
      const fieldError = validateField(name, values[name]);
      setErrors(prev => ({ ...prev, [name]: fieldError }));
    }
  }, [validateOnBlur, validateField, values]);

  // Obtener valor de campo
  const getFieldValue = useCallback((name: string) => {
    return values[name];
  }, [values]);

  // Obtener error de campo
  const getFieldError = useCallback((name: string) => {
    return errors[name];
  }, [errors]);

  // Verificar si campo ha sido tocado
  const isFieldTouched = useCallback((name: string) => {
    return touched[name] || false;
  }, [touched]);

  // Verificar si campo tiene error
  const hasFieldError = useCallback((name: string) => {
    return !!errors[name];
  }, [errors]);

  // Verificar si campo es válido
  const isFieldValid = useCallback((name: string) => {
    return !errors[name];
  }, [errors]);

  // Limpiar error de campo
  const clearFieldError = useCallback((name: string) => {
    setErrors(prev => ({ ...prev, [name]: null }));
  }, []);

  // Limpiar todos los errores
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Limpiar formulario
  const resetForm = useCallback(() => {
    initializeFields();
    clearErrors();
    setIsSubmitting(false);
    setIsValid(false);
  }, [initializeFields, clearErrors]);

  // Establecer errores manualmente
  const setErrors = useCallback((newErrors: Record<string, string | null>) => {
    setErrors(newErrors);
  }, []);

  // Establecer valores manualmente
  const setValues = useCallback((newValues: Record<string, any>) => {
    setValues(newValues);
  }, []);

  // Verificar si el formulario es válido
  const checkFormValidity = useCallback(() => {
    const validation = validateForm();
    setIsValid(validation.isValid);
    return validation.isValid;
  }, [validateForm]);

  // Manejar envío del formulario
  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    // Marcar todos los campos como tocados
    const allTouched: Record<string, boolean> = {};
    Object.keys(values).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    // Validar formulario
    const validation = validateForm();
    setErrors(validation.errors.reduce((acc, error) => {
      acc[error.field] = error.message;
      return acc;
    }, {} as Record<string, string>));

    if (!validation.isValid) {
      setIsValid(false);
      return;
    }

    setIsValid(true);
    setIsSubmitting(true);

    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, onSubmit]);

  // Manejar cambio de campo
  const handleChange = useCallback((name: string, value: any) => {
    setFieldValue(name, value);
  }, [setFieldValue]);

  // Manejar pérdida de foco
  const handleBlur = useCallback((name: string) => {
    setFieldTouched(name, true);
  }, [setFieldTouched]);

  // Obtener estado del formulario
  const getFormState = useCallback(() => {
    return {
      values,
      errors,
      touched,
      isSubmitting,
      isValid,
    };
  }, [values, errors, touched, isSubmitting, isValid]);

  // Verificar si el formulario ha sido modificado
  const isDirty = useCallback(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  // Obtener campos con errores
  const getFieldsWithErrors = useCallback(() => {
    return Object.keys(errors).filter(key => errors[key]);
  }, [errors]);

  // Obtener campos requeridos
  const getRequiredFields = useCallback(() => {
    return Object.keys(initialValues).filter(key => {
      const field = initialValues[key];
      return field && typeof field === 'object' && field.required;
    });
  }, [initialValues]);

  // Verificar si todos los campos requeridos están completos
  const areRequiredFieldsComplete = useCallback(() => {
    const requiredFields = getRequiredFields();
    return requiredFields.every(field => {
      const value = values[field];
      return value !== undefined && value !== null && value !== '';
    });
  }, [getRequiredFields, values]);

  // Inicializar formulario al montar
  React.useEffect(() => {
    initializeFields();
  }, [initializeFields]);

  // Verificar validez cuando cambian los valores o errores
  React.useEffect(() => {
    checkFormValidity();
  }, [values, errors, checkFormValidity]);

  return {
    // Estado
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    
    // Acciones
    setFieldValue,
    setFieldTouched,
    setFieldError: clearFieldError,
    clearErrors,
    resetForm,
    setErrors,
    setValues,
    
    // Getters
    getFieldValue,
    getFieldError,
    isFieldTouched,
    hasFieldError,
    isFieldValid,
    getFormState,
    getFieldsWithErrors,
    getRequiredFields,
    
    // Validación
    validateField,
    validateForm,
    checkFormValidity,
    
    // Utilidades
    isDirty,
    areRequiredFieldsComplete,
    
    // Event handlers
    handleSubmit,
    handleChange,
    handleBlur,
    
    // Referencias
    formRef,
  };
};




