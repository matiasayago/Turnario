// Exportar todos los hooks personalizados
export { useAppointments } from './useAppointmentsUniversal';
export { useAppointments as useAppointmentsCompat } from './useAppointmentsUniversal';
export { useNotifications } from './useNotifications';
export { useForm } from './useForm';
export { default as useTimeSlots } from './useTimeSlots';

// Re-exportar hooks de React si es necesario
export { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';




