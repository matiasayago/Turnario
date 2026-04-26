const Service = require('../models/Service');
const Category = require('../models/Category');
const User = require('../models/User');
const logger = require('../config/logger');

class ServiceController {
  /**
   * Obtener lista de servicios con filtros
   */
  static async getServices(req, res) {
    try {
      const {
        professionalId,
        categoryId,
        isActive,
        search,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };

      if (professionalId) filters.professionalId = professionalId;
      if (categoryId) filters.categoryId = categoryId;
      if (isActive !== undefined) filters.isActive = isActive;
      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }
      if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice) filters.price.$gte = parseFloat(minPrice);
        if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
      }

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [services, total] = await Promise.all([
        Service.find(filters)
          .populate('professionalId', 'fullName email phone avatar professionalInfo')
          .populate('categoryId', 'name description icon color')
          .sort(sortBy === 'name' ? { name: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'price' ? { price: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'duration' ? { duration: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'averageRating' ? { averageRating: sortOrder === 'desc' ? -1 : 1 } :
                { createdAt: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Service.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: services,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error in getServices:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener servicio específico
   */
  static async getServiceById(req, res) {
    try {
      const service = await Service.findById(req.params.id)
        .populate('professionalId', 'fullName email phone avatar professionalInfo')
        .populate('categoryId', 'name description icon color');

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      res.json({
        success: true,
        data: service
      });

    } catch (error) {
      logger.error('Error in getServiceById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nuevo servicio
   */
  static async createService(req, res) {
    try {
      const {
        name,
        description,
        categoryId,
        price,
        currency = 'USD',
        duration,
        isActive = true,
        tags,
        requirements,
        cancellationPolicy,
        metadata
      } = req.body;

      // Verificar que la categoría exista
      const category = await Category.findById(categoryId);
      if (!category || !category.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Categoría no encontrada o inactiva'
        });
      }

      // Verificar que el profesional exista y esté activo
      const professional = await User.findById(req.user._id);
      if (!professional || professional.userType !== 'professional' || !professional.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Solo los profesionales activos pueden crear servicios'
        });
      }

      // Crear el servicio
      const serviceData = {
        name,
        description,
        categoryId,
        professionalId: req.user._id,
        price: parseFloat(price),
        currency,
        duration: parseInt(duration),
        isActive,
        tags: tags || [],
        requirements: requirements || [],
        cancellationPolicy,
        metadata: metadata || {},
        createdBy: req.user._id
      };

      const service = new Service(serviceData);
      await service.save();

      // Log de la acción
      service.logAccess(req.user._id, 'service_created', {
        name,
        categoryId,
        price
      });

      // Populate para la respuesta
      const createdService = await Service.findById(service._id)
        .populate('professionalId', 'fullName email phone avatar professionalInfo')
        .populate('categoryId', 'name description icon color');

      res.status(201).json({
        success: true,
        message: 'Servicio creado exitosamente',
        data: createdService
      });

    } catch (error) {
      logger.error('Error in createService:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar servicio
   */
  static async updateService(req, res) {
    try {
      const service = await Service.findById(req.params.id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      // Verificar que el usuario sea el propietario del servicio o admin
      if (service.professionalId.toString() !== req.user._id.toString() && req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar este servicio'
        });
      }

      const {
        name,
        description,
        categoryId,
        price,
        currency,
        duration,
        tags,
        requirements,
        cancellationPolicy,
        metadata
      } = req.body;

      // Verificar que la categoría exista si se está cambiando
      if (categoryId && categoryId !== service.categoryId.toString()) {
        const category = await Category.findById(categoryId);
        if (!category || !category.isActive) {
          return res.status(400).json({
            success: false,
            message: 'Categoría no encontrada o inactiva'
          });
        }
      }

      // Actualizar campos permitidos
      const updateFields = [
        'name', 'description', 'categoryId', 'price', 'currency', 
        'duration', 'tags', 'requirements', 'cancellationPolicy', 'metadata'
      ];

      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'price') {
            service[field] = parseFloat(req.body[field]);
          } else if (field === 'duration') {
            service[field] = parseInt(req.body[field]);
          } else {
            service[field] = req.body[field];
          }
        }
      });

      service.lastModifiedBy = req.user._id;
      service.lastModifiedAt = new Date();
      await service.save();

      // Log de la acción
      service.logAccess(req.user._id, 'service_updated', {
        changes: req.body
      });

      // Populate para la respuesta
      const updatedService = await Service.findById(req.params.id)
        .populate('professionalId', 'fullName email phone avatar professionalInfo')
        .populate('categoryId', 'name description icon color');

      res.json({
        success: true,
        message: 'Servicio actualizado exitosamente',
        data: updatedService
      });

    } catch (error) {
      logger.error('Error in updateService:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar estado del servicio
   */
  static async updateServiceStatus(req, res) {
    try {
      const { isActive, reason } = req.body;

      const service = await Service.findById(req.params.id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      // Verificar permisos
      if (service.professionalId.toString() !== req.user._id.toString() && req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar este servicio'
        });
      }

      const oldStatus = service.isActive;
      service.isActive = isActive;
      service.lastModifiedBy = req.user._id;
      service.lastModifiedAt = new Date();

      // Agregar razón del cambio de estado
      if (reason) {
        service.statusHistory = service.statusHistory || [];
        service.statusHistory.push({
          isActive,
          reason,
          changedBy: req.user._id,
          changedAt: new Date()
        });
      }

      await service.save();

      // Log de la acción
      service.logAccess(req.user._id, 'service_status_changed', {
        oldStatus,
        newStatus: isActive,
        reason
      });

      res.json({
        success: true,
        message: `Estado del servicio cambiado a ${isActive ? 'activo' : 'inactivo'}`,
        data: {
          serviceId: service._id,
          oldStatus,
          newStatus: isActive,
          reason
        }
      });

    } catch (error) {
      logger.error('Error in updateServiceStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar servicio
   */
  static async deleteService(req, res) {
    try {
      const { reason } = req.body;

      const service = await Service.findById(req.params.id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      // Verificar permisos
      if (service.professionalId.toString() !== req.user._id.toString() && req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar este servicio'
        });
      }

      // Soft delete
      await service.softDelete(req.user._id, reason);

      // Log de la acción
      service.logAccess(req.user._id, 'service_deleted', {
        reason: reason || 'Sin razón especificada'
      });

      res.json({
        success: true,
        message: 'Servicio eliminado exitosamente'
      });

    } catch (error) {
      logger.error('Error in deleteService:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Buscar servicios
   */
  static async searchServices(req, res) {
    try {
      const {
        q,
        categoryId,
        professionalId,
        minPrice,
        maxPrice,
        minDuration,
        maxDuration,
        minRating,
        sortBy = 'relevance',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      if (!q && !categoryId && !professionalId) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar al menos un criterio de búsqueda'
        });
      }

      // Construir filtros
      const filters = { 
        isDeleted: false,
        isActive: true
      };

      if (categoryId) filters.categoryId = categoryId;
      if (professionalId) filters.professionalId = professionalId;
      if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice) filters.price.$gte = parseFloat(minPrice);
        if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
      }
      if (minDuration || maxDuration) {
        filters.duration = {};
        if (minDuration) filters.duration.$gte = parseInt(minDuration);
        if (maxDuration) filters.duration.$lte = parseInt(maxDuration);
      }
      if (minRating) {
        filters.averageRating = { $gte: parseFloat(minRating) };
      }

      // Búsqueda por texto
      if (q) {
        filters.$or = [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { tags: { $in: [new RegExp(q, 'i')] } }
        ];
      }

      // Calcular paginación
      const skip = (page - 1) * limit;

      // Determinar ordenamiento
      let sortOptions = {};
      if (sortBy === 'relevance' && q) {
        // Ordenar por relevancia (búsqueda de texto)
        sortOptions = { score: { $meta: 'textScore' } };
      } else if (sortBy === 'price') {
        sortOptions = { price: sortOrder === 'desc' ? -1 : 1 };
      } else if (sortBy === 'duration') {
        sortOptions = { duration: sortOrder === 'desc' ? -1 : 1 };
      } else if (sortBy === 'rating') {
        sortOptions = { averageRating: sortOrder === 'desc' ? -1 : 1 };
      } else {
        sortOptions = { createdAt: sortOrder === 'desc' ? -1 : 1 };
      }

      const [services, total] = await Promise.all([
        Service.find(filters)
          .populate('professionalId', 'fullName email phone avatar professionalInfo')
          .populate('categoryId', 'name description icon color')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit)),
        Service.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: services,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        searchInfo: {
          query: q,
          categoryId,
          professionalId,
          filters: {
            minPrice,
            maxPrice,
            minDuration,
            maxDuration,
            minRating
          }
        }
      });

    } catch (error) {
      logger.error('Error in searchServices:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener servicios por categoría
   */
  static async getServicesByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const {
        isActive,
        sortBy = 'name',
        sortOrder = 'asc',
        page = 1,
        limit = 20
      } = req.query;

      // Verificar que la categoría exista
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Construir filtros
      const filters = {
        categoryId,
        isDeleted: false
      };

      if (isActive !== undefined) filters.isActive = isActive;

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [services, total] = await Promise.all([
        Service.find(filters)
          .populate('professionalId', 'fullName email phone avatar professionalInfo')
          .populate('categoryId', 'name description icon color')
          .sort(sortBy === 'name' ? { name: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'price' ? { price: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'duration' ? { duration: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'rating' ? { averageRating: sortOrder === 'desc' ? -1 : 1 } :
                { name: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Service.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: {
          category: {
            id: category._id,
            name: category.name,
            description: category.description,
            icon: category.icon,
            color: category.color
          },
          services,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Error in getServicesByCategory:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener servicios por profesional
   */
  static async getServicesByProfessional(req, res) {
    try {
      const { professionalId } = req.params;
      const {
        isActive,
        categoryId,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Verificar que el profesional exista
      const professional = await User.findById(professionalId);
      if (!professional || professional.userType !== 'professional') {
        return res.status(404).json({
          success: false,
          message: 'Profesional no encontrado'
        });
      }

      // Construir filtros
      const filters = {
        professionalId,
        isDeleted: false
      };

      if (isActive !== undefined) filters.isActive = isActive;
      if (categoryId) filters.categoryId = categoryId;

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [services, total] = await Promise.all([
        Service.find(filters)
          .populate('professionalId', 'fullName email phone avatar professionalInfo')
          .populate('categoryId', 'name description icon color')
          .sort(sortBy === 'name' ? { name: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'price' ? { price: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'duration' ? { duration: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'rating' ? { averageRating: sortOrder === 'desc' ? -1 : 1 } :
                { createdAt: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Service.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: {
          professional: {
            id: professional._id,
            fullName: professional.fullName,
            email: professional.email,
            phone: professional.phone,
            avatar: professional.avatar,
            professionalInfo: professional.professionalInfo
          },
          services,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Error in getServicesByProfessional:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de servicios
   */
  static async getServiceStats(req, res) {
    try {
      const { dateFrom, dateTo, professionalId, categoryId } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };
      if (professionalId) filters.professionalId = professionalId;
      if (categoryId) filters.categoryId = categoryId;
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      const stats = await Service.getServiceStats(filters);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getServiceStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = ServiceController;
