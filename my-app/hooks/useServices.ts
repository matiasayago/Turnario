// @ts-nocheck � beta
import { useState, useEffect, useCallback } from 'react';
import { serviceService, Service, showApiError } from '../services';

interface UseServicesReturn {
  services: Service[];
  activeServices: Service[];
  loading: boolean;
  error: string | null;
  refreshServices: () => Promise<void>;
  getServiceById: (id: string) => Promise<Service | null>;
  getServicesByCategory: (category: string) => Promise<Service[]>;
  searchServices: (searchTerm: string) => Promise<Service[]>;
  getCategories: () => Promise<string[]>;
}

export const useServices = (): UseServicesReturn => {
  const [services, setServices] = useState<Service[]>([]);
  const [activeServices, setActiveServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar todos los servicios
  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allServices = await serviceService.getAllServices();
      setServices(allServices);
      
      // Filtrar servicios activos
      const active = allServices.filter(service => service.isActive);
      setActiveServices(active);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      showApiError(err, 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para refrescar servicios
  const refreshServices = useCallback(async () => {
    await loadServices();
  }, [loadServices]);

  // Función para obtener servicio por ID
  const getServiceById = useCallback(async (id: string): Promise<Service | null> => {
    try {
      return await serviceService.getServiceById(id);
    } catch (err) {
      console.error('Error obteniendo servicio por ID:', err);
      return null;
    }
  }, []);

  // Función para obtener servicios por categoría
  const getServicesByCategory = useCallback(async (category: string): Promise<Service[]> => {
    try {
      return await serviceService.getServicesByCategory(category);
    } catch (err) {
      console.error('Error obteniendo servicios por categoría:', err);
      return [];
    }
  }, []);

  // Función para buscar servicios
  const searchServices = useCallback(async (searchTerm: string): Promise<Service[]> => {
    try {
      if (!searchTerm.trim()) {
        return activeServices;
      }
      
      return await serviceService.searchServicesByName(searchTerm);
    } catch (err) {
      console.error('Error en búsqueda de servicios:', err);
      return [];
    }
  }, [activeServices]);

  // Función para obtener categorías
  const getCategories = useCallback(async (): Promise<string[]> => {
    try {
      return await serviceService.getCategories();
    } catch (err) {
      console.error('Error obteniendo categorías:', err);
      return [];
    }
  }, []);

  // Cargar servicios al montar el componente
  useEffect(() => {
    loadServices();
  }, [loadServices]);

  return {
    services,
    activeServices,
    loading,
    error,
    refreshServices,
    getServiceById,
    getServicesByCategory,
    searchServices,
    getCategories,
  };
};

export default useServices;

