const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const Service = require('../models/Service');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// Middleware para validar ObjectId
const validateObjectId = (value) => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

// GET /api/clinics - Obtener lista de consultorios (con filtros)
router.get('/', [
  query('type').optional().isIn(['consultorio', 'clínica', 'hospital', 'centro_médico', 'laboratorio', 'imagenología']),
  query('specialty').optional().isString(),
  query('city').optional().isString(),
  query('isActive').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['name', 'rating', 'distance']),
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
      type,
      specialty,
      city,
      isActive = true,
      page = 1,
      limit = 20,
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Construir filtros
    const filters = {};

    if (type) {
      filters.type = type;
    }

    if (specialty) {
      filters.specialties = { $in: [new RegExp(specialty, 'i')] };
    }

    if (city) {
      filters['address.city'] = { $regex: city, $options: 'i' };
    }

    if (isActive !== undefined) {
      filters.isActive = isActive;
    }

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } }
      ];
    }

    // Construir ordenamiento
    let sort = {};
    if (sortBy === 'rating') {
      sort['stats.averageRating'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'distance') {
      // Para ordenamiento por distancia se necesitaría implementar geolocalización
      sort.name = 1;
    } else {
      sort.name = sortOrder === 'asc' ? 1 : -1;
    }

    const skip = (page - 1) * limit;
    
    const clinics = await Clinic.find(filters)
      .populate('professionals.professional', 'fullName professionalInfo.specialization')
      .populate('services.service', 'name category duration price')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Clinic.countDocuments(filters);

    res.json({
      success: true,
      data: clinics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener consultorios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/clinics/:id - Obtener consultorio específico
router.get('/:id', [
  query('id').custom(validateObjectId)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID de consultorio inválido',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const clinic = await Clinic.findById(id)
      .where({ isActive: true })
      .populate('professionals.professional', 'fullName professionalInfo email phone')
      .populate('services.service', 'name description category duration price requirements');

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Consultorio no encontrado'
      });
    }

    res.json({
      success: true,
      data: clinic
    });

  } catch (error) {
    console.error('Error al obtener consultorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/clinics - Crear nuevo consultorio
router.post('/', [
  authenticateToken,
  requireRole('professional'),
  body('name').isLength({ min: 2, max: 100 }).trim(),
  body('description').optional().isLength({ max: 1000 }).trim(),
  body('contact.phone').isLength({ min: 8, max: 20 }).trim(),
  body('contact.email').optional().isEmail().normalizeEmail(),
  body('contact.website').optional().isURL(),
  body('address.street').isLength({ min: 2, max: 100 }).trim(),
  body('address.city').isLength({ min: 2, max: 50 }).trim(),
  body('address.state').isLength({ min: 2, max: 50 }).trim(),
  body('address.zipCode').optional().isLength({ min: 2, max: 10 }),
  body('address.country').optional().isLength({ min: 2, max: 50 }),
  body('type').isIn(['consultorio', 'clínica', 'hospital', 'centro_médico', 'laboratorio', 'imagenología']),
  body('specialties').isArray({ min: 1 }),
  body('specialties.*').isIn(['Medicina General', 'Cardiología', 'Pediatría', 'Dermatología', 'Ginecología', 'Ortopedia', 'Neurología', 'Psiquiatría', 'Psicología', 'Odontología', 'Kinesiología', 'Fisioterapia', 'Nutrición', 'Enfermería', 'Terapias Alternativas', 'Otros']),
  body('operatingHours').isObject(),
  body('operatingHours.*.enabled').isBoolean(),
  body('operatingHours.*.start').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('operatingHours.*.end').matches(/^([01]?[0-3]):[0-5][0-9]$/),
  body('facilities').optional().isObject(),
  body('policies.appointmentDuration').optional().isInt({ min: 15, max: 480 }),
  body('policies.advanceBookingDays').optional().isInt({ min: 1, max: 365 }),
  body('policies.cancellationHours').optional().isInt({ min: 0, max: 168 }),
  body('policies.noShowPolicy').optional().isIn(['none', 'warning', 'fine', 'blacklist']),
  body('policies.paymentPolicy').optional().isIn(['cash', 'card', 'transfer', 'insurance', 'mixed'])
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

    const clinicData = req.body;

    // Validar horarios operativos
    for (const [day, schedule] of Object.entries(clinicData.operatingHours)) {
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

    // Agregar al profesional creador como propietario
    clinicData.professionals = [{
      professional: req.user._id,
      role: 'owner',
      permissions: ['manage_appointments', 'manage_patients', 'manage_schedule', 'manage_billing', 'view_reports']
    }];

    // Crear el consultorio
    const clinic = new Clinic(clinicData);
    await clinic.save();

    // Poblar referencias para la respuesta
    await clinic.populate('professionals.professional', 'fullName professionalInfo.specialization');

    res.status(201).json({
      success: true,
      message: 'Consultorio creado correctamente',
      data: clinic
    });

  } catch (error) {
    console.error('Error al crear consultorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/clinics/:id - Actualizar consultorio
router.put('/:id', [
  authenticateToken,
  requireRole('professional'),
  body('name').optional().isLength({ min: 2, max: 100 }).trim(),
  body('description').optional().isLength({ max: 1000 }).trim(),
  body('contact.phone').optional().isLength({ min: 8, max: 20 }).trim(),
  body('contact.email').optional().isEmail().normalizeEmail(),
  body('contact.website').optional().isURL(),
  body('address.street').optional().isLength({ min: 2, max: 100 }).trim(),
  body('address.city').optional().isLength({ min: 2, max: 50 }).trim(),
  body('address.state').optional().isLength({ min: 2, max: 50 }).trim(),
  body('address.zipCode').optional().isLength({ min: 2, max: 10 }),
  body('address.country').optional().isLength({ min: 2, max: 50 }),
  body('specialties').optional().isArray({ min: 1 }),
  body('operatingHours').optional().isObject(),
  body('facilities').optional().isObject(),
  body('policies').optional().isObject()
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
    delete updateData.type;
    delete updateData.stats;

    // Validar horarios si se actualizan
    if (updateData.operatingHours) {
      for (const [day, schedule] of Object.entries(updateData.operatingHours)) {
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

    const clinic = await Clinic.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('professionals.professional', 'fullName professionalInfo.specialization');

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Consultorio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Consultorio actualizado correctamente',
      data: clinic
    });

  } catch (error) {
    console.error('Error al actualizar consultorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/clinics/:id - Desactivar consultorio (soft delete)
router.delete('/:id', [
  authenticateToken,
  requireRole('professional')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    const clinic = await Clinic.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Consultorio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Consultorio desactivado correctamente',
      data: clinic
    });

  } catch (error) {
    console.error('Error al desactivar consultorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/clinics/:id/professionals - Agregar profesional al consultorio
router.post('/:id/professionals', [
  authenticateToken,
  requireRole('professional'),
  body('professionalId').custom(validateObjectId),
  body('role').optional().isIn(['owner', 'partner', 'employee', 'contractor']),
  body('permissions').optional().isArray(),
  body('permissions.*').optional().isIn(['manage_appointments', 'manage_patients', 'manage_schedule', 'manage_billing', 'view_reports'])
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
    const { professionalId, role = 'employee', permissions = [] } = req.body;
    
    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Consultorio no encontrado'
      });
    }

    // Verificar que el profesional existe y es activo
    const professional = await User.findById(professionalId)
      .where({ userType: 'professional', isActive: true });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Profesional no encontrado o inactivo'
      });
    }

    // Verificar que no esté ya agregado
    const existingProfessional = clinic.professionals.find(
      p => p.professional.toString() === professionalId
    );

    if (existingProfessional) {
      return res.status(400).json({
        success: false,
        message: 'El profesional ya está agregado a este consultorio'
      });
    }

    clinic.addProfessional(professionalId, role, permissions);
    await clinic.save();

    await clinic.populate('professionals.professional', 'fullName professionalInfo.specialization');

    res.json({
      success: true,
      message: 'Profesional agregado correctamente',
      data: clinic
    });

  } catch (error) {
    console.error('Error al agregar profesional:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/clinics/:id/professionals/:professionalId - Remover profesional del consultorio
router.delete('/:id/professionals/:professionalId', [
  authenticateToken,
  requireRole('professional')
], async (req, res) => {
  try {
    const { id, professionalId } = req.params;
    
    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Consultorio no encontrado'
      });
    }

    clinic.removeProfessional(professionalId);
    await clinic.save();

    await clinic.populate('professionals.professional', 'fullName professionalInfo.specialization');

    res.json({
      success: true,
      message: 'Profesional removido correctamente',
      data: clinic
    });

  } catch (error) {
    console.error('Error al remover profesional:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/clinics/:id/services - Agregar servicio al consultorio
router.post('/:id/services', [
  authenticateToken,
  requireRole('professional'),
  body('serviceId').custom(validateObjectId),
  body('customPrice.amount').optional().isFloat({ min: 0 }),
  body('customPrice.currency').optional().isIn(['ARS', 'USD', 'EUR']),
  body('customDuration').optional().isInt({ min: 15, max: 480 }),
  body('notes').optional().isString()
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
    const { serviceId, customPrice, customDuration, notes = '' } = req.body;
    
    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Consultorio no encontrado'
      });
    }

    // Verificar que el servicio existe y es activo
    const service = await Service.findById(serviceId).where({ isActive: true });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado o inactivo'
      });
    }

    // Verificar que no esté ya agregado
    const existingService = clinic.services.find(
      s => s.service.toString() === serviceId
    );

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'El servicio ya está agregado a este consultorio'
      });
    }

    clinic.addService(serviceId, customPrice, customDuration, notes);
    await clinic.save();

    await clinic.populate('services.service', 'name category duration price');

    res.json({
      success: true,
      message: 'Servicio agregado correctamente',
      data: clinic
    });

  } catch (error) {
    console.error('Error al agregar servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/clinics/:id/services/:serviceId - Remover servicio del consultorio
router.delete('/:id/services/:serviceId', [
  authenticateToken,
  requireRole('professional')
], async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    
    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Consultorio no encontrado'
      });
    }

    clinic.removeService(serviceId);
    await clinic.save();

    await clinic.populate('services.service', 'name category duration price');

    res.json({
      success: true,
      message: 'Servicio removido correctamente',
      data: clinic
    });

  } catch (error) {
    console.error('Error al remover servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/clinics/:id/schedule - Obtener horarios del consultorio
router.get('/:id/schedule', [
  query('id').custom(validateObjectId),
  query('date').optional().isISO8601(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
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
    const { date, startDate, endDate } = req.query;
    
    const clinic = await Clinic.findById(id)
      .select('operatingHours professionals')
      .where({ isActive: true });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Consultorio no encontrado'
      });
    }

    // Obtener horarios de los profesionales
    const professionalIds = clinic.professionals
      .filter(p => p.isActive)
      .map(p => p.professional);

    const professionals = await User.find({
      _id: { $in: professionalIds }
    }).select('professionalInfo.workingHours');

    res.json({
      success: true,
      data: {
        clinicHours: clinic.operatingHours,
        professionalHours: professionals.map(p => ({
          professionalId: p._id,
          workingHours: p.professionalInfo.workingHours
        }))
      }
    });

  } catch (error) {
    console.error('Error al obtener horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/clinics/:id/availability - Verificar disponibilidad del consultorio
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
    
    const clinic = await Clinic.findById(id).where({ isActive: true });
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Consultorio no encontrado'
      });
    }

    const isAvailable = clinic.checkAvailability(new Date(date), time);

    res.json({
      success: true,
      data: {
        available: isAvailable,
        clinic: clinic.name,
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

// GET /api/clinics/search/nearby - Buscar consultorios cercanos
router.get('/search/nearby', [
  query('latitude').isFloat({ min: -90, max: 90 }),
  query('longitude').isFloat({ min: -180, max: 180 }),
  query('maxDistance').optional().isInt({ min: 1000, max: 100000 }),
  query('type').optional().isIn(['consultorio', 'clínica', 'hospital', 'centro_médico', 'laboratorio', 'imagenología']),
  query('specialty').optional().isString()
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
      latitude,
      longitude,
      maxDistance = 10000,
      type,
      specialty
    } = req.query;

    const filters = { isActive: true };

    if (type) {
      filters.type = type;
    }

    if (specialty) {
      filters.specialties = { $in: [new RegExp(specialty, 'i')] };
    }

    const clinics = await Clinic.findByNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(maxDistance)
    );

    res.json({
      success: true,
      data: clinics
    });

  } catch (error) {
    console.error('Error en búsqueda por proximidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;

