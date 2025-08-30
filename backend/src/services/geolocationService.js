const geolib = require('geolib');
const Clinic = require('../models/Clinic');
const User = require('../models/User');

class GeolocationService {
  constructor() {
    this.defaultRadius = 50000; // 50km por defecto
    this.maxRadius = 200000; // 200km máximo
  }

  // Calcular distancia entre dos puntos
  calculateDistance(point1, point2) {
    try {
      if (!point1 || !point2 || !point1.latitude || !point1.longitude || !point2.latitude || !point2.longitude) {
        return null;
      }

      return geolib.getDistance(
        { latitude: point1.latitude, longitude: point1.longitude },
        { latitude: point2.latitude, longitude: point2.longitude }
      );
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  }

  // Encontrar clínicas cercanas a una ubicación
  async findNearbyClinics(location, radius = null, filters = {}) {
    try {
      const searchRadius = radius || this.defaultRadius;
      
      if (searchRadius > this.maxRadius) {
        throw new Error(`Radius cannot exceed ${this.maxRadius / 1000}km`);
      }

      // Construir query base
      let query = {
        isActive: true,
        deletedAt: null,
        'address.coordinates': {
          $exists: true,
          $ne: null
        }
      };

      // Aplicar filtros adicionales
      if (filters.specialty) {
        query.specialties = { $in: [filters.specialty] };
      }

      if (filters.clinicType) {
        query.clinicType = filters.clinicType;
      }

      if (filters.city) {
        query['address.city'] = { $regex: filters.city, $options: 'i' };
      }

      if (filters.state) {
        query['address.state'] = { $regex: filters.state, $options: 'i' };
      }

      // Obtener todas las clínicas que cumplan los filtros
      const clinics = await Clinic.find(query)
        .populate('specialties', 'name')
        .populate('clinicType', 'name')
        .lean();

      // Filtrar por distancia y ordenar
      const clinicsWithDistance = clinics
        .map(clinic => {
          const distance = this.calculateDistance(location, clinic.address.coordinates);
          return {
            ...clinic,
            distance: distance,
            distanceKm: distance ? (distance / 1000).toFixed(2) : null
          };
        })
        .filter(clinic => clinic.distance !== null && clinic.distance <= searchRadius)
        .sort((a, b) => a.distance - b.distance);

      return clinicsWithDistance;

    } catch (error) {
      console.error('Error finding nearby clinics:', error);
      throw error;
    }
  }

  // Encontrar clínicas cercanas a un usuario
  async findClinicsNearUser(userId, radius = null, filters = {}) {
    try {
      const user = await User.findById(userId).select('address.coordinates');
      
      if (!user || !user.address?.coordinates) {
        throw new Error('User location not available');
      }

      return await this.findNearbyClinics(user.address.coordinates, radius, filters);

    } catch (error) {
      console.error('Error finding clinics near user:', error);
      throw error;
    }
  }

  // Encontrar clínicas en un área específica (rectángulo)
  async findClinicsInArea(bounds, filters = {}) {
    try {
      const { north, south, east, west } = bounds;
      
      // Validar coordenadas
      if (north < south || east < west) {
        throw new Error('Invalid bounds: north must be greater than south, east must be greater than west');
      }

      let query = {
        isActive: true,
        deletedAt: null,
        'address.coordinates': {
          $exists: true,
          $ne: null,
          $geoWithin: {
            $box: [
              [west, south], // bottom-left
              [east, north]  // top-right
            ]
          }
        }
      };

      // Aplicar filtros adicionales
      if (filters.specialty) {
        query.specialties = { $in: [filters.specialty] };
      }

      if (filters.clinicType) {
        query.clinicType = filters.clinicType;
      }

      const clinics = await Clinic.find(query)
        .populate('specialties', 'name')
        .populate('clinicType', 'name')
        .lean();

      return clinics;

    } catch (error) {
      console.error('Error finding clinics in area:', error);
      throw error;
    }
  }

  // Obtener ruta entre dos puntos
  getRoute(origin, destination, mode = 'driving') {
    try {
      // Esta función simula el cálculo de ruta
      // En producción, se integraría con Google Maps API o similar
      
      const distance = this.calculateDistance(origin, destination);
      if (!distance) return null;

      // Tiempo estimado basado en el modo de transporte
      const averageSpeeds = {
        driving: 50, // km/h en ciudad
        walking: 5,  // km/h
        cycling: 15, // km/h
        transit: 25  // km/h
      };

      const speed = averageSpeeds[mode] || averageSpeeds.driving;
      const timeMinutes = Math.round((distance / 1000) / speed * 60);

      return {
        distance: distance,
        distanceKm: (distance / 1000).toFixed(2),
        duration: timeMinutes,
        durationFormatted: `${timeMinutes} min`,
        mode: mode,
        origin: origin,
        destination: destination
      };

    } catch (error) {
      console.error('Error calculating route:', error);
      return null;
    }
  }

  // Obtener clínicas con mejor ruta desde una ubicación
  async findClinicsWithBestRoute(location, maxDistance = null, filters = {}) {
    try {
      const clinics = await this.findNearbyClinics(location, maxDistance, filters);
      
      // Calcular rutas para cada clínica
      const clinicsWithRoute = clinics.map(clinic => {
        const route = this.getRoute(location, clinic.address.coordinates);
        return {
          ...clinic,
          route: route
        };
      });

      // Ordenar por tiempo de viaje
      return clinicsWithRoute.sort((a, b) => {
        if (!a.route || !b.route) return 0;
        return a.route.duration - b.route.duration;
      });

    } catch (error) {
      console.error('Error finding clinics with best route:', error);
      throw error;
    }
  }

  // Agrupar clínicas por área geográfica
  async groupClinicsByArea(location, radius = null, groupRadius = 5000) {
    try {
      const clinics = await this.findNearbyClinics(location, radius);
      const groups = [];
      const processed = new Set();

      clinics.forEach(clinic => {
        if (processed.has(clinic._id.toString())) return;

        const group = [clinic];
        processed.add(clinic._id.toString());

        // Buscar clínicas cercanas a esta clínica
        clinics.forEach(otherClinic => {
          if (clinic._id.toString() === otherClinic._id.toString()) return;
          if (processed.has(otherClinic._id.toString())) return;

          const distance = this.calculateDistance(
            clinic.address.coordinates,
            otherClinic.address.coordinates
          );

          if (distance && distance <= groupRadius) {
            group.push(otherClinic);
            processed.add(otherClinic._id.toString());
          }
        });

        if (group.length > 0) {
          // Calcular centro del grupo
          const center = this.calculateGroupCenter(group);
          groups.push({
            center: center,
            clinics: group,
            count: group.length,
            radius: groupRadius
          });
        }
      });

      return groups.sort((a, b) => b.count - a.count);

    } catch (error) {
      console.error('Error grouping clinics by area:', error);
      throw error;
    }
  }

  // Calcular centro de un grupo de clínicas
  calculateGroupCenter(clinics) {
    try {
      const coordinates = clinics
        .map(clinic => clinic.address.coordinates)
        .filter(coord => coord && coord.latitude && coord.longitude);

      if (coordinates.length === 0) return null;

      const center = geolib.getCenter(coordinates);
      return {
        latitude: center.latitude,
        longitude: center.longitude
      };

    } catch (error) {
      console.error('Error calculating group center:', error);
      return null;
    }
  }

  // Obtener estadísticas de clínicas por área
  async getClinicStatsByArea(location, radius = null) {
    try {
      const clinics = await this.findNearbyClinics(location, radius);
      
      const stats = {
        total: clinics.length,
        bySpecialty: {},
        byType: {},
        byCity: {},
        averageDistance: 0,
        closest: null,
        farthest: null
      };

      let totalDistance = 0;

      clinics.forEach(clinic => {
        // Contar por especialidad
        if (clinic.specialties) {
          clinic.specialties.forEach(specialty => {
            const specialtyName = specialty.name || specialty;
            stats.bySpecialty[specialtyName] = (stats.bySpecialty[specialtyName] || 0) + 1;
          });
        }

        // Contar por tipo de clínica
        if (clinic.clinicType) {
          const typeName = clinic.clinicType.name || clinic.clinicType;
          stats.byType[typeName] = (stats.byType[typeName] || 0) + 1;
        }

        // Contar por ciudad
        if (clinic.address?.city) {
          stats.byCity[clinic.address.city] = (stats.byCity[clinic.address.city] || 0) + 1;
        }

        // Calcular distancias
        if (clinic.distance) {
          totalDistance += clinic.distance;
          
          if (!stats.closest || clinic.distance < stats.closest.distance) {
            stats.closest = clinic;
          }
          
          if (!stats.farthest || clinic.distance > stats.farthest.distance) {
            stats.farthest = clinic;
          }
        }
      });

      stats.averageDistance = stats.total > 0 ? totalDistance / stats.total : 0;

      return stats;

    } catch (error) {
      console.error('Error getting clinic stats by area:', error);
      throw error;
    }
  }

  // Validar coordenadas
  validateCoordinates(latitude, longitude) {
    try {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        return false;
      }
      
      if (lat < -90 || lat > 90) {
        return false;
      }
      
      if (lng < -180 || lng > 180) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Convertir dirección a coordenadas (geocoding)
  async geocodeAddress(address) {
    try {
      // Esta función simula el geocoding
      // En producción, se integraría con Google Maps Geocoding API o similar
      
      const addressString = [
        address.street,
        address.number,
        address.city,
        address.state,
        address.country
      ].filter(Boolean).join(', ');

      // Simular coordenadas para Buenos Aires
      if (addressString.toLowerCase().includes('buenos aires')) {
        return {
          latitude: -34.6118,
          longitude: -58.3960,
          formattedAddress: addressString
        };
      }

      // Simular coordenadas para Córdoba
      if (addressString.toLowerCase().includes('córdoba')) {
        return {
          latitude: -31.4167,
          longitude: -64.1833,
          formattedAddress: addressString
        };
      }

      // Simular coordenadas para Rosario
      if (addressString.toLowerCase().includes('rosario')) {
        return {
          latitude: -32.9468,
          longitude: -60.6393,
          formattedAddress: addressString
        };
      }

      // Coordenadas por defecto (centro de Argentina)
      return {
        latitude: -34.6118,
        longitude: -58.3960,
        formattedAddress: addressString
      };

    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  // Obtener clínicas en un radio específico con información de ruta
  async findClinicsInRadius(location, radius, filters = {}) {
    try {
      const clinics = await this.findNearbyClinics(location, radius, filters);
      
      return clinics.map(clinic => {
        const route = this.getRoute(location, clinic.address.coordinates);
        return {
          ...clinic,
          route: route,
          estimatedTime: route ? route.durationFormatted : 'N/A',
          estimatedDistance: route ? route.distanceKm + ' km' : 'N/A'
        };
      });

    } catch (error) {
      console.error('Error finding clinics in radius:', error);
      throw error;
    }
  }

  // Obtener clínicas más populares en un área
  async findPopularClinicsInArea(location, radius = null, limit = 10) {
    try {
      const clinics = await this.findNearbyClinics(location, radius);
      
      // Ordenar por popularidad (rating, número de citas, etc.)
      const sortedClinics = clinics.sort((a, b) => {
        const scoreA = (a.rating || 0) * 0.6 + (a.totalAppointments || 0) * 0.4;
        const scoreB = (b.rating || 0) * 0.6 + (b.totalAppointments || 0) * 0.4;
        return scoreB - scoreA;
      });

      return sortedClinics.slice(0, limit);

    } catch (error) {
      console.error('Error finding popular clinics:', error);
      throw error;
    }
  }
}

module.exports = GeolocationService;
