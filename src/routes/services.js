const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Service = require('../models/Service');
const User = require('../models/User');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// Middleware para validar ObjectId
const validateObjectId = (value) => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

// GET /api/services - Obtener lista de servicios (con filtros)
router.get('/', [
  query('category').optional().isString(),
  query('subcategory').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('maxDuration').optional().isInt({ min: 15, max: 480 }),
  query('professional').optional().custom(validateObjectId),
  query('clinic').optional().custom(validateObjectId),
  query('isActive').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['name', 'price', 'duration', 'rating', 'popularity']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const {
      category,
      subcategory,
      minPrice,
      maxPrice,
      maxDuration,
      professional,
      clinic,
      isActive = true,
      page = 1,
      limit = 20,
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Construir filtros
    const filters = {};

    if (category) {
      filters.category = { $regex: category, $options: 'i' };
    }

    if (subcategory) {
      filters.subcategory = { $regex: subcategory, $options: 'i' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filters['price.amount'] = {};
      if (minPrice !== undefined) filters['price.amount'].$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) filters['price.amount'].$lte = parseFloat(maxPrice);
    }

    if (maxDuration) {
      filters.duration = { $lte: parseInt(maxDuration) };
    }

    if (isActive !== undefined) {
      filters.isActive = isActive;
    }

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { subcategory: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Construir ordenamiento
    let sort = {};
    if (sortBy === 'price') {
      sort['price.amount'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'duration') {
      sort.duration = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'rating') {
      sort['stats.averageRating'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'popularity') {
      sort['stats.totalAppointments'] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.name = sortOrder === 'asc' ? 1 : -1;
    }

    const skip = (page - 1) * limit;
    
    let servicesQuery = Service.find(filters);

    // Si se especifica un profesional, filtrar por servicios que ofrece
    if (professional) {
      const professionalUser = await User.findById(professional)
        .select('professionalInfo.specialization')
        .where({ userType: 'professional', isActive: true });

      if (professionalUser) {
        filters.category = professionalUser.professionalInfo.specialization;
      }
    }

    // Si se especifica una clínica, filtrar por servicios disponibles
    if (clinic) {
      // Aquí se podría implementar lógica para filtrar por servicios de la clínica
      // Por ahora se mantiene el filtro general
    }

    const services = await servicesQuery
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(filters);

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
    console.error('Error al obtener servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/services/:id - Obtener servicio específico
router.get('/:id', [
  query('id').custom(validateObjectId)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID de servicio inválido',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const service = await Service.findById(id).where({ isActive: true });

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
    console.error('Error al obtener servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/services - Crear nuevo servicio (solo profesionales)
router.post('/', [
  authenticateToken,
  requireRole('professional'),
  body('name').isLength({ min: 2, max: 100 }).trim(),
  body('description').isLength({ min: 10, max: 500 }).trim(),
  body('category').isIn(['Medicina General', 'Cardiología', 'Pediatría', 'Dermatología', 'Ginecología', 'Ortopedia', 'Neurología', 'Psiquiatría', 'Psicología', 'Odontología', 'Kinesiología', 'Fisioterapia', 'Nutrición', 'Enfermería', 'Terapias Alternativas', 'Otros']),
  body('subcategory').optional().isLength({ min: 2, max: 100 }).trim(),
  body('duration').isInt({ min: 15, max: 480 }),
  body('price.amount').isFloat({ min: 0 }),
  body('price.currency').optional().isIn(['ARS', 'USD', 'EUR']),
  body('price.isNegotiable').optional().isBoolean(),
  body('requiresPreparation').optional().isBoolean(),
  body('preparationInstructions').optional().isLength({ max: 1000 }),
  body('requirements.minimumAge').optional().isInt({ min: 0 }),
  body('requirements.maximumAge').optional().isInt({ min: 0 }),
  body('requirements.gender').optional().isIn(['any', 'male', 'female']),
  body('requirements.medicalHistory').optional().isBoolean(),
  body('requirements.fasting').optional().isBoolean(),
  body('requirements.fastingHours').optional().isInt({ min: 0 }),
  body('availableHours').isObject(),
  body('capacity.maxAppointmentsPerDay').optional().isInt({ min: 1 }),
  body('capacity.maxAppointmentsPerSlot').optional().isInt({ min: 1 }),
  body('capacity.advanceBookingDays').optional().isInt({ min: 1 }),
  body('capacity.cancellationHours').optional().isInt({ min: 0 }),
  body('tags').optional().isArray(),
  body('keywords').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const serviceData = req.body;

    // Validar horarios disponibles
    for (const [day, schedule] of Object.entries(serviceData.availableHours)) {
      if (schedule.enabled) {
        const start = new Date(`2000-01-01T${schedule.start}:00`);
        const end = new Date(`2000-01-01T${schedule.end}:00`);
        
        if (end <= start) {
          return res.status(400).json({
            success: false,
            message: `La hora de fin debe ser posterior a la de inicio para ${day}`
          });
        }
      }
    }

    // Crear el servicio
    const service = new Service(serviceData);
    await service.save();

    res.status(201).json({
      success: true,
      message: 'Servicio creado correctamente',
      data: service
    });

  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/services/:id - Actualizar servicio
router.put('/:id', [
  authenticateToken,
  requireRole('professional'),
  body('name').optional().isLength({ min: 2, max: 100 }).trim(),
  body('description').optional().isLength({ min: 10, max: 500 }).trim(),
  body('subcategory').optional().isLength({ min: 2, max: 100 }).trim(),
  body('duration').optional().isInt({ min: 15, max: 480 }),
  body('price.amount').optional().isFloat({ min: 0 }),
  body('price.currency').optional().isIn(['ARS', 'USD', 'EUR']),
  body('price.isNegotiable').optional().isBoolean(),
  body('requiresPreparation').optional().isBoolean(),
  body('preparationInstructions').optional().isLength({ max: 1000 }),
  body('requirements').optional().isObject(),
  body('availableHours').optional().isObject(),
  body('capacity').optional().isObject(),
  body('tags').optional().isArray(),
  body('keywords').optional().isArray(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Campos que no se pueden modificar
    delete updateData.category;
    delete updateData.stats;

    // Validar horarios si se actualizan
    if (updateData.availableHours) {
      for (const [day, schedule] of Object.entries(updateData.availableHours)) {
        if (schedule.enabled) {
          const start = new Date(`2000-01-01T${schedule.start}:00`);
          const end = new Date(`2000-01-01T${schedule.end}:00`);
          
          if (end <= start) {
            return res.status(400).json({
              success: false,
              message: `La hora de fin debe ser posterior a la de inicio para ${day}`
            });
          }
        }
      }
    }

    const service = await Service.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Servicio actualizado correctamente',
      data: service
    });

  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/services/:id - Desactivar servicio (soft delete)
router.delete('/:id', [
  authenticateToken,
  requireRole('professional')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Servicio desactivado correctamente',
      data: service
    });

  } catch (error) {
    console.error('Error al desactivar servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/services/categories - Obtener categorías disponibles
router.get('/categories', async (req, res) => {
  try {
    const categories = await Service.getCategories();

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/services/popular - Obtener servicios populares
router.get('/popular', [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('category').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { limit = 10, category } = req.query;

    let services;
    if (category) {
      services = await Service.find({ 
        category: { $regex: category, $options: 'i' },
        isActive: true 
      })
      .sort({ 'stats.totalAppointments': -1, 'stats.averageRating': -1 })
      .limit(parseInt(limit));
    } else {
      services = await Service.getPopularServices(parseInt(limit));
    }

    res.json({
      success: true,
      data: services
    });

  } catch (error) {
    console.error('Error al obtener servicios populares:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/services/search - Búsqueda avanzada de servicios
router.get('/search/advanced', [
  query('query').isString().isLength({ min: 1 }),
  query('category').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('maxDuration').optional().isInt({ min: 15, max: 480 }),
  query('city').optional().isString(),
  query('professional').optional().custom(validateObjectId),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const {
      query: searchQuery,
      category,
      minPrice,
      maxPrice,
      maxDuration,
      city,
      professional,
      page = 1,
      limit = 20
    } = req.query;

    // Construir filtros de búsqueda
    const filters = { isActive: true };

    // Búsqueda por texto
    if (searchQuery) {
      filters.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { tags: { $in: [new RegExp(searchQuery, 'i')] } },
        { keywords: { $in: [new RegExp(searchQuery, 'i')] } }
      ];
    }

    if (category) {
      filters.category = { $regex: category, $options: 'i' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filters['price.amount'] = {};
      if (minPrice !== undefined) filters['price.amount'].$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) filters['price.amount'].$lte = parseFloat(maxPrice);
    }

    if (maxDuration) {
      filters.duration = { $lte: parseInt(maxDuration) };
    }

    const skip = (page - 1) * limit;
    
    let servicesQuery = Service.find(filters);

    // Si se especifica una ciudad, buscar servicios de profesionales en esa ciudad
    if (city) {
      const professionalsInCity = await User.find({
        userType: 'professional',
        'address.city': { $regex: city, $options: 'i' },
        isActive: true
      }).select('_id');

      if (professionalsInCity.length > 0) {
        // Aquí se podría implementar lógica para filtrar servicios por profesionales en la ciudad
        // Por ahora se mantiene el filtro general
      }
    }

    // Si se especifica un profesional, filtrar por servicios que ofrece
    if (professional) {
      const professionalUser = await User.findById(professional)
        .select('professionalInfo.specialization')
        .where({ userType: 'professional', isActive: true });

      if (professionalUser) {
        filters.category = professionalUser.professionalInfo.specialization;
      }
    }

    const services = await servicesQuery
      .sort({ 'stats.averageRating': -1, 'stats.totalAppointments': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(filters);

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
    console.error('Error en búsqueda avanzada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/services/:id/update-stats - Actualizar estadísticas del servicio
router.post('/:id/update-stats', [
  authenticateToken,
  requireRole('professional')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    await service.updateStats();

    res.json({
      success: true,
      message: 'Estadísticas actualizadas correctamente',
      data: service
    });

  } catch (error) {
    console.error('Error al actualizar estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/services/:id/availability - Verificar disponibilidad del servicio
router.get('/:id/availability', [
  query('id').custom(validateObjectId),
  query('date').isISO8601(),
  query('time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { date, time } = req.query;
    
    const service = await Service.findById(id).where({ isActive: true });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    const isAvailable = service.checkAvailability(new Date(date), time);

    res.json({
      success: true,
      data: {
        available: isAvailable,
        service: service.name,
        date,
        time
      }
    });

  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;

