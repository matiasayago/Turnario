import api, { createAuthHeaders } from './api';
import authService from './authService';

export interface Service {
  _id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  currency: string;
  duration: number; // en minutos
  isActive: boolean;
  requiresDeposit: boolean;
  depositAmount?: number;
  depositPercentage?: number;
  maxAdvanceBooking: number; // días
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  cancellationHours: number;
  requirements?: string[];
  contraindications?: string[];
  preparation?: string[];
  aftercare?: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  currency?: string;
  duration: number;
  requiresDeposit?: boolean;
  depositAmount?: number;
  depositPercentage?: number;
  maxAdvanceBooking?: number;
  cancellationPolicy?: Service['cancellationPolicy'];
  cancellationHours?: number;
  requirements?: string[];
  contraindications?: string[];
  preparation?: string[];
  aftercare?: string[];
  tags?: string[];
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  price?: number;
  currency?: string;
  duration?: number;
  requiresDeposit?: boolean;
  depositAmount?: number;
  depositPercentage?: number;
  maxAdvanceBooking?: number;
  cancellationPolicy?: Service['cancellationPolicy'];
  cancellationHours?: number;
  requirements?: string[];
  contraindications?: string[];
  preparation?: string[];
  aftercare?: string[];
  tags?: string[];
}

export interface ServiceFilters {
  category?: string;
  subcategory?: string;
  priceMin?: number;
  priceMax?: number;
  durationMin?: number;
  durationMax?: number;
  isActive?: boolean;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface ServiceStats {
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<string, number>;
  byPriceRange: Record<string, number>;
  averagePrice: number;
  averageDuration: number;
}

export interface ServiceCategory {
  name: string;
  subcategories: string[];
  serviceCount: number;
}

class ServiceService {
  // Obtener todos los servicios
  async getAllServices(filters: ServiceFilters = {}): Promise<Service[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const queryParams = new URLSearchParams();
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, v));
              } else {
                queryParams.append(key, value.toString());
              }
            }
          });

          const endpoint = `/services?${queryParams.toString()}`;
          const response = await api.get<Service[]>(endpoint, createAuthHeaders(token));

          return response;
        } catch (backendError) {
          console.warn('Error obteniendo servicios del backend, usando fallback:', backendError);
          // Si falla el backend, continuar con el fallback
        }
      }

      // Fallback: datos de servicios para testing
      console.log('📱 Usando servicios de fallback para testing');
      return this.getFallbackServices(filters);
      
    } catch (error) {
      console.error('Get all services error:', error);
      // En caso de error, devolver servicios de fallback
      return this.getFallbackServices(filters);
    }
  }

  // Obtener servicio por ID
  async getServiceById(serviceId: string): Promise<Service> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const response = await api.get<Service>(`/services/${serviceId}`, createAuthHeaders(token));
          return response;
        } catch (backendError) {
          console.warn('Error obteniendo servicio del backend, usando fallback:', backendError);
        }
      }

      // Fallback: buscar en servicios locales
      const fallbackServices = this.getFallbackServices();
      const service = fallbackServices.find(s => s._id === serviceId);
      if (service) {
        return service;
      }
      
      throw new Error('Servicio no encontrado');
      
    } catch (error) {
      console.error('Get service error:', error);
      throw error;
    }
  }

  // Crear nuevo servicio
  async createService(serviceData: CreateServiceRequest): Promise<Service> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<Service>('/services', serviceData, createAuthHeaders(token));

      return response;
    } catch (error) {
      console.error('Create service error:', error);
      throw error;
    }
  }

  // Actualizar servicio
  async updateService(serviceId: string, updateData: UpdateServiceRequest): Promise<Service> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.put<Service>(`/services/${serviceId}`, updateData, createAuthHeaders(token));

      return response;
    } catch (error) {
      console.error('Update service error:', error);
      throw error;
    }
  }

  // Desactivar servicio
  async deactivateService(serviceId: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.delete<{ message: string }>(`/services/${serviceId}`, createAuthHeaders(token));

      return response;
    } catch (error) {
      console.error('Deactivate service error:', error);
      throw error;
    }
  }

  // Reactivar servicio
  async reactivateService(serviceId: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string }>(`/services/${serviceId}/reactivate`, {}, createAuthHeaders(token));

      return response;
    } catch (error) {
      console.error('Reactivate service error:', error);
      throw error;
    }
  }

  // Obtener categorías de servicios
  async getServiceCategories(): Promise<ServiceCategory[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const response = await api.get<{ categories: ServiceCategory[] }>('/services/categories/list', createAuthHeaders(token));
          return response.categories;
        } catch (backendError) {
          console.warn('Error obteniendo categorías del backend, usando fallback:', backendError);
        }
      }

      // Fallback: categorías de servicios locales
      const fallbackServices = this.getFallbackServices();
      const categoryMap = new Map<string, Set<string>>();
      
      fallbackServices.forEach(service => {
        if (!categoryMap.has(service.category)) {
          categoryMap.set(service.category, new Set());
        }
        if (service.subcategory) {
          categoryMap.get(service.category)!.add(service.subcategory);
        }
      });
      
      return Array.from(categoryMap.entries()).map(([name, subcategories]) => ({
        name,
        subcategories: Array.from(subcategories),
        serviceCount: fallbackServices.filter(s => s.category === name).length
      }));
      
    } catch (error) {
      console.error('Get service categories error:', error);
      throw error;
    }
  }

  // Obtener estadísticas de servicios
  async getServiceStats(): Promise<ServiceStats> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const response = await api.get<ServiceStats>('/services/stats/overview', createAuthHeaders(token));
          return response;
        } catch (backendError) {
          console.warn('Error obteniendo estadísticas del backend, usando fallback:', backendError);
        }
      }

      // Fallback: calcular estadísticas de servicios locales
      const fallbackServices = this.getFallbackServices();
      const total = fallbackServices.length;
      const active = fallbackServices.filter(s => s.isActive).length;
      const inactive = total - active;
      
      const byCategory: Record<string, number> = {};
      fallbackServices.forEach(service => {
        byCategory[service.category] = (byCategory[service.category] || 0) + 1;
      });
      
      const prices = fallbackServices.map(s => s.price);
      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      const durations = fallbackServices.map(s => s.duration);
      const averageDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
      
      const byPriceRange: Record<string, number> = {
        '0-2000': fallbackServices.filter(s => s.price <= 2000).length,
        '2001-5000': fallbackServices.filter(s => s.price > 2000 && s.price <= 5000).length,
        '5001+': fallbackServices.filter(s => s.price > 5000).length
      };
      
      return {
        total,
        active,
        inactive,
        byCategory,
        byPriceRange,
        averagePrice,
        averageDuration
      };
      
    } catch (error) {
      console.error('Get service stats error:', error);
      throw error;
    }
  }

  // Buscar servicios
  async searchServices(query: string, filters: ServiceFilters = {}): Promise<Service[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar buscar en el backend
      if (token) {
        try {
          const searchParams = new URLSearchParams();
          searchParams.append('q', query);
          
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                value.forEach(v => searchParams.append(key, v));
              } else {
                searchParams.append(key, value.toString());
              }
            }
          });

          const endpoint = `/services/search?${searchParams.toString()}`;
          const response = await api.get<Service[]>(endpoint, createAuthHeaders(token));

          return response;
        } catch (backendError) {
          console.warn('Error buscando servicios en el backend, usando fallback:', backendError);
        }
      }

      // Fallback: buscar en servicios locales
      const fallbackServices = this.getFallbackServices();
      const searchTerm = query.toLowerCase();
      
      return fallbackServices.filter(service => 
        service.name.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm) ||
        service.category.toLowerCase().includes(searchTerm) ||
        service.subcategory?.toLowerCase().includes(searchTerm) ||
        service.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
      
    } catch (error) {
      console.error('Search services error:', error);
      return [];
    }
  }

  // Obtener servicios por categoría
  async getServicesByCategory(category: string): Promise<Service[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const response = await api.get<Service[]>(`/services/by-category?category=${category}`, createAuthHeaders(token));
          return response;
        } catch (backendError) {
          console.warn('Error obteniendo servicios por categoría del backend, usando fallback:', backendError);
        }
      }

      // Fallback: filtrar servicios locales por categoría
      return this.getFallbackServices({ category });
      
    } catch (error) {
      console.error('Get services by category error:', error);
      throw error;
    }
  }

  // Obtener servicios por subcategoría
  async getServicesBySubcategory(subcategory: string, filters: Omit<ServiceFilters, 'subcategory'> = {}): Promise<Service[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('subcategory', subcategory);
          
          // Agregar filtros adicionales
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, v.toString()));
              } else {
                queryParams.append(key, value.toString());
              }
            }
          });
          
          const endpoint = `/services/by-subcategory?${queryParams.toString()}`;
          
          const response = await api.get<Service[]>(endpoint, createAuthHeaders(token));
          return response;
        } catch (backendError) {
          console.warn('Error obteniendo servicios por subcategoría del backend, usando fallback:', backendError);
        }
      }

      // Fallback: filtrar servicios locales por subcategoría
      const fallbackServices = this.getFallbackServices();
      return fallbackServices.filter(s => s.subcategory === subcategory);
      
    } catch (error) {
      console.error('Get services by subcategory error:', error);
      throw error;
    }
  }

  // Obtener servicios por rango de precio
  async getServicesByPriceRange(minPrice: number, maxPrice: number, filters: Omit<ServiceFilters, 'priceMin' | 'priceMax'> = {}): Promise<Service[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('priceMin', minPrice.toString());
          queryParams.append('priceMax', maxPrice.toString());
          
          // Agregar filtros adicionales
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, v.toString()));
              } else {
                queryParams.append(key, value.toString());
              }
            }
          });
          
          const endpoint = `/services/by-price-range?${queryParams.toString()}`;
          
          const response = await api.get<Service[]>(endpoint, createAuthHeaders(token));
          return response;
        } catch (backendError) {
          console.warn('Error obteniendo servicios por rango de precio del backend, usando fallback:', backendError);
        }
      }

      // Fallback: filtrar servicios locales por rango de precio
      const fallbackServices = this.getFallbackServices();
      return fallbackServices.filter(s => s.price >= minPrice && s.price <= maxPrice);
      
    } catch (error) {
      console.error('Get services by price range error:', error);
      throw error;
    }
  }

  // Obtener servicios por duración
  async getServicesByDuration(minDuration: number, maxDuration: number, filters: Omit<ServiceFilters, 'durationMin' | 'durationMax'> = {}): Promise<Service[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('durationMin', minDuration.toString());
          queryParams.append('durationMax', maxDuration.toString());
          
          // Agregar filtros adicionales
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, v.toString()));
              } else {
                queryParams.append(key, value.toString());
              }
            }
          });
          
          const endpoint = `/services/by-duration?${queryParams.toString()}`;
          
          const response = await api.get<Service[]>(endpoint, createAuthHeaders(token));
          return response;
        } catch (backendError) {
          console.warn('Error obteniendo servicios por duración del backend, usando fallback:', backendError);
        }
      }

      // Fallback: filtrar servicios locales por duración
      const fallbackServices = this.getFallbackServices();
      return fallbackServices.filter(s => s.duration >= minDuration && s.duration <= maxDuration);
      
    } catch (error) {
      console.error('Get services by duration error:', error);
      throw error;
    }
  }

  // Obtener servicios por tags
  async getServicesByTags(tags: string[], filters: Omit<ServiceFilters, 'tags'> = {}): Promise<Service[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams();
      tags.forEach(tag => queryParams.append('tags', tag));
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/services/by-tags?${queryParams.toString()}`;
      const response = await api.get<Service[]>(endpoint, createAuthHeaders(token));

      return response;
    } catch (error) {
      console.error('Get services by tags error:', error);
      throw error;
    }
  }

  // Obtener servicios populares
  async getPopularServices(limit: number = 10): Promise<Service[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<Service[]>(`/services/popular?limit=${limit}`, createAuthHeaders(token));

      return response;
    } catch (error) {
      console.error('Get popular services error:', error);
      throw error;
    }
  }

  // Obtener servicios por profesional
  async getServicesByProfessional(professionalId: string): Promise<Service[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const response = await api.get<Service[]>(`/services/professional/${professionalId}`, createAuthHeaders(token));
          return response;
        } catch (backendError) {
          console.warn('Error obteniendo servicios por profesional del backend, usando fallback:', backendError);
        }
      }

      // Fallback: para testing, devolver todos los servicios
      return this.getFallbackServices();
      
    } catch (error) {
      console.error('Get services by professional error:', error);
      throw error;
    }
  }

  // Obtener servicios por clínica
  async getServicesByClinic(clinicId: string): Promise<Service[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const response = await api.get<Service[]>(`/services/clinic/${clinicId}`, createAuthHeaders(token));
          return response;
        } catch (backendError) {
          console.warn('Error obteniendo servicios por clínica del backend, usando fallback:', backendError);
        }
      }

      // Fallback: para testing, devolver todos los servicios
      return this.getFallbackServices();
      
    } catch (error) {
      console.error('Get services by clinic error:', error);
      throw error;
    }
  }

  // Método privado para obtener servicios de fallback
  private getFallbackServices(filters: ServiceFilters = {}): Service[] {
    const fallbackServices: Service[] = [
      {
        _id: 'service_001',
        name: 'Consulta Psicológica',
        description: 'Sesión de terapia psicológica individual',
        category: 'Psicología',
        subcategory: 'Terapia Individual',
        price: 5000,
        currency: 'ARS',
        duration: 60,
        isActive: true,
        requiresDeposit: true,
        depositAmount: 1000,
        depositPercentage: 20,
        maxAdvanceBooking: 30,
        cancellationPolicy: 'moderate',
        cancellationHours: 24,
        requirements: ['Primera consulta gratuita'],
        contraindications: [],
        preparation: ['Llegar 10 minutos antes'],
        aftercare: ['Ejercicios de respiración'],
        tags: ['psicología', 'terapia', 'salud mental'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        _id: 'service_002',
        name: 'Consulta Médica General',
        description: 'Consulta médica de medicina general',
        category: 'Medicina',
        subcategory: 'Medicina General',
        price: 8000,
        currency: 'ARS',
        duration: 30,
        isActive: true,
        requiresDeposit: false,
        depositAmount: 0,
        depositPercentage: 0,
        maxAdvanceBooking: 15,
        cancellationPolicy: 'flexible',
        cancellationHours: 2,
        requirements: ['Traer estudios previos si los tiene'],
        contraindications: [],
        preparation: ['Ayuno de 8 horas si es necesario'],
        aftercare: ['Seguir indicaciones médicas'],
        tags: ['medicina', 'consulta', 'general'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        _id: 'service_003',
        name: 'Corte de Cabello',
        description: 'Corte y peinado profesional',
        category: 'Belleza',
        subcategory: 'Peluquería',
        price: 3000,
        currency: 'ARS',
        duration: 45,
        isActive: true,
        requiresDeposit: false,
        depositAmount: 0,
        depositPercentage: 0,
        maxAdvanceBooking: 7,
        cancellationPolicy: 'flexible',
        cancellationHours: 1,
        requirements: ['Cabello limpio'],
        contraindications: [],
        preparation: ['Lavar el cabello antes'],
        aftercare: ['Mantener el peinado'],
        tags: ['belleza', 'peluquería', 'corte'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        _id: 'service_004',
        name: 'Entrenamiento Personal',
        description: 'Sesión de entrenamiento personalizado',
        category: 'Fitness',
        subcategory: 'Entrenamiento Personal',
        price: 4000,
        currency: 'ARS',
        duration: 60,
        isActive: true,
        requiresDeposit: true,
        depositAmount: 800,
        depositPercentage: 20,
        maxAdvanceBooking: 14,
        cancellationPolicy: 'strict',
        cancellationHours: 12,
        requirements: ['Ropa deportiva cómoda'],
        contraindications: ['Lesiones recientes'],
        preparation: ['Hidratarse bien'],
        aftercare: ['Estirar después del entrenamiento'],
        tags: ['fitness', 'entrenamiento', 'personal'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        _id: 'service_005',
        name: 'Clase de Yoga',
        description: 'Clase grupal de yoga para todos los niveles',
        category: 'Fitness',
        subcategory: 'Yoga',
        price: 2500,
        currency: 'ARS',
        duration: 90,
        isActive: true,
        requiresDeposit: false,
        depositAmount: 0,
        depositPercentage: 0,
        maxAdvanceBooking: 7,
        cancellationPolicy: 'moderate',
        cancellationHours: 6,
        requirements: ['Mat de yoga'],
        contraindications: ['Embarazo avanzado'],
        preparation: ['No comer 2 horas antes'],
        aftercare: ['Beber agua'],
        tags: ['fitness', 'yoga', 'clase grupal'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    ];

    // Aplicar filtros básicos
    let filteredServices = fallbackServices;

    if (filters.category) {
      filteredServices = filteredServices.filter(s => 
        s.category.toLowerCase().includes(filters.category!.toLowerCase())
      );
    }

    if (filters.subcategory) {
      filteredServices = filteredServices.filter(s => 
        s.subcategory?.toLowerCase().includes(filters.subcategory!.toLowerCase())
      );
    }

    if (filters.isActive !== undefined) {
      filteredServices = filteredServices.filter(s => s.isActive === filters.isActive);
    }

    if (filters.priceMin !== undefined) {
      filteredServices = filteredServices.filter(s => s.price >= filters.priceMin!);
    }

    if (filters.priceMax !== undefined) {
      filteredServices = filteredServices.filter(s => s.price <= filters.priceMax!);
    }

    return filteredServices;
  }
}

export default new ServiceService();

