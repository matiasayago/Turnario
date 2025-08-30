const express = require('express');
const { body, validationResult } = require('express-validator');
const Clinic = require('../models/Clinic');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// @route   GET /api/clinics
// @desc    Obtener todas las clínicas activas
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { type, search, isActive = true, limit = 50, page = 1 } = req.query;
    
    let query = {};
    
    // Filtrar por estado activo/inactivo
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Filtrar por tipo de clínica
    if (type) {
      query.type = { $regex: type, $options: 'i' };
    }
    
    // Búsqueda por nombre o dirección
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const clinics = await Clinic.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    // Obtener total para paginación
    const total = await Clinic.countDocuments(query);
    
    res.json({
      success: true,
      data: clinics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener clínicas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clínicas'
    });
  }
});

// @route   GET /api/clinics/:id
// @desc    Obtener una clínica específica
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    res.json({
      success: true,
      data: clinic
    });
  } catch (error) {
    console.error('Error al obtener clínica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clínica'
    });
  }
});

// @route   POST /api/clinics
// @desc    Crear una nueva clínica (solo profesionales y administradores)
// @access  Private (Profesionales y Administradores)
router.post('/', requireRole(['professional', 'admin']), [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('address.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('La calle debe tener entre 5 y 200 caracteres'),
  body('address.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La ciudad debe tener entre 2 y 100 caracteres'),
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El estado debe tener entre 2 y 100 caracteres'),
  body('address.zipCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('El código postal debe tener entre 3 y 20 caracteres'),
  body('address.country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El país debe tener entre 2 y 100 caracteres'),
  body('contact.phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Número de teléfono inválido'),
  body('contact.email')
    .isEmail()
    .withMessage('Email inválido'),
  body('type')
    .isIn(['centro_médico', 'consultorio', 'hospital', 'clínica_privada', 'otro'])
    .withMessage('Tipo de clínica inválido'),
  body('specialties')
    .isArray({ min: 1 })
    .withMessage('Debe especificar al menos una especialidad'),
  body('specialties.*')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Cada especialidad debe tener entre 2 y 50 caracteres'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser un valor booleano')
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
      name, 
      address, 
      contact, 
      type, 
      specialties, 
      isActive = true,
      description,
      operatingHours,
      facilities
    } = req.body;

    // Verificar si ya existe una clínica con el mismo nombre en la misma ciudad
    const existingClinic = await Clinic.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      'address.city': address.city
    });
    
    if (existingClinic) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una clínica con ese nombre en esa ciudad'
      });
    }

    // Crear la clínica
    const clinicData = {
      name,
      address,
      contact,
      type,
      specialties,
      isActive,
      createdBy: req.user.userId
    };

    // Agregar campos opcionales si están presentes
    if (description) clinicData.description = description;
    if (operatingHours) clinicData.operatingHours = operatingHours;
    if (facilities) clinicData.facilities = facilities;

    const clinic = new Clinic(clinicData);
    await clinic.save();

    res.status(201).json({
      success: true,
      message: 'Clínica creada exitosamente',
      data: clinic
    });
  } catch (error) {
    console.error('Error al crear clínica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear clínica'
    });
  }
});

// @route   PUT /api/clinics/:id
// @desc    Actualizar una clínica existente
// @access  Private (Profesionales y Administradores)
router.put('/:id', requireRole(['professional', 'admin']), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('La calle debe tener entre 5 y 200 caracteres'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La ciudad debe tener entre 2 y 100 caracteres'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El estado debe tener entre 2 y 100 caracteres'),
  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('El código postal debe tener entre 3 y 20 caracteres'),
  body('address.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El país debe tener entre 2 y 100 caracteres'),
  body('contact.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Número de teléfono inválido'),
  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
  body('type')
    .optional()
    .isIn(['centro_médico', 'consultorio', 'hospital', 'clínica_privada', 'otro'])
    .withMessage('Tipo de clínica inválido'),
  body('specialties')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Debe especificar al menos una especialidad'),
  body('specialties.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Cada especialidad debe tener entre 2 y 50 caracteres'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser un valor booleano')
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

    // Verificar si la clínica existe
    const existingClinic = await Clinic.findById(id);
    if (!existingClinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    // Si se está cambiando el nombre, verificar que no exista otra con el mismo nombre en la misma ciudad
    if (updateData.name && updateData.name !== existingClinic.name) {
      const duplicateClinic = await Clinic.findOne({ 
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
        'address.city': updateData.address?.city || existingClinic.address.city
      });
      
      if (duplicateClinic) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra clínica con ese nombre en esa ciudad'
        });
      }
    }

    // Agregar información de modificación
    updateData.updatedBy = req.user.userId;
    updateData.updatedAt = new Date();

    // Actualizar la clínica
    const updatedClinic = await Clinic.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Clínica actualizada exitosamente',
      data: updatedClinic
    });
  } catch (error) {
    console.error('Error al actualizar clínica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar clínica'
    });
  }
});

// @route   DELETE /api/clinics/:id
// @desc    Desactivar una clínica (soft delete)
// @access  Private (Profesionales y Administradores)
router.delete('/:id', requireRole(['professional', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    // Desactivar la clínica
    clinic.isActive = false;
    clinic.deactivatedAt = new Date();
    clinic.deactivatedBy = req.user.userId;
    await clinic.save();

    res.json({
      success: true,
      message: 'Clínica desactivada exitosamente'
    });
  } catch (error) {
    console.error('Error al desactivar clínica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar clínica'
    });
  }
});

// @route   POST /api/clinics/:id/reactivate
// @desc    Reactivar una clínica desactivada
// @access  Private (Profesionales y Administradores)
router.post('/:id/reactivate', requireRole(['professional', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    // Reactivar la clínica
    clinic.isActive = true;
    clinic.deactivatedAt = undefined;
    clinic.deactivatedBy = undefined;
    await clinic.save();

    res.json({
      success: true,
      message: 'Clínica reactivada exitosamente'
    });
  } catch (error) {
    console.error('Error al reactivar clínica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reactivar clínica'
    });
  }
});

// @route   GET /api/clinics/types/list
// @desc    Obtener lista de todos los tipos de clínica disponibles
// @access  Private
router.get('/types/list', async (req, res) => {
  try {
    const types = await Clinic.distinct('type');
    
    res.json({
      success: true,
      data: types.sort()
    });
  } catch (error) {
    console.error('Error al obtener tipos de clínica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de clínica'
    });
  }
});

// @route   GET /api/clinics/specialties/list
// @desc    Obtener lista de todas las especialidades disponibles
// @access  Private
router.get('/specialties/list', async (req, res) => {
  try {
    const specialties = await Clinic.distinct('specialties');
    
    res.json({
      success: true,
      data: specialties.sort()
    });
  } catch (error) {
    console.error('Error al obtener especialidades:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener especialidades'
    });
  }
});

// @route   GET /api/clinics/stats/overview
// @desc    Obtener estadísticas generales de clínicas (solo profesionales y administradores)
// @access  Private (Profesionales y Administradores)
router.get('/stats/overview', requireRole(['professional', 'admin']), async (req, res) => {
  try {
    const totalClinics = await Clinic.countDocuments();
    const activeClinics = await Clinic.countDocuments({ isActive: true });
    const inactiveClinics = await Clinic.countDocuments({ isActive: false });
    
    const clinicsByType = await Clinic.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const clinicsByCity = await Clinic.aggregate([
      {
        $group: {
          _id: '$address.city',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const recentClinics = await Clinic.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name type address.city isActive createdAt');

    res.json({
      success: true,
      data: {
        total: totalClinics,
        active: activeClinics,
        inactive: inactiveClinics,
        byType: clinicsByType,
        byCity: clinicsByCity,
        recent: recentClinics
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
});

// @route   GET /api/clinics/search/advanced
// @desc    Búsqueda avanzada de clínicas
// @access  Private
router.get('/search/advanced', async (req, res) => {
  try {
    const { 
      name, 
      type, 
      city, 
      state, 
      specialties,
      isActive = true,
      sortBy = 'name',
      sortOrder = 'asc',
      limit = 20,
      page = 1
    } = req.query;
    
    let query = { isActive: isActive === 'true' };
    
    // Filtros de búsqueda
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    
    if (type) {
      query.type = { $regex: type, $options: 'i' };
    }
    
    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
    }
    
    if (state) {
      query['address.state'] = { $regex: state, $options: 'i' };
    }
    
    if (specialties) {
      const specialtiesArray = specialties.split(',').map(s => s.trim());
      query.specialties = { $in: specialtiesArray };
    }

    // Ordenamiento
    let sortOptions = {};
    if (['name', 'type', 'address.city', 'createdAt'].includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.name = 1; // Ordenamiento por defecto
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const clinics = await Clinic.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
      
    // Obtener total para paginación
    const total = await Clinic.countDocuments(query);
    
    res.json({
      success: true,
      data: clinics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        name,
        type,
        city,
        state,
        specialties,
        isActive
      }
    });
  } catch (error) {
    console.error('Error en búsqueda avanzada:', error);
    res.status(500).json({
      success: false,
      message: 'Error en búsqueda avanzada'
    });
  }
});

// @route   GET /api/clinics/nearby
// @desc    Obtener clínicas cercanas por coordenadas (para implementación futura)
// @access  Private
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10, limit = 20 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitud y longitud son requeridas'
      });
    }

    // Por ahora, devolver clínicas activas ordenadas por nombre
    // En el futuro, implementar búsqueda por proximidad geográfica
    const clinics = await Clinic.find({ isActive: true })
      .sort({ name: 1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: clinics,
      message: 'Búsqueda por proximidad geográfica será implementada en futuras versiones'
    });
  } catch (error) {
    console.error('Error en búsqueda por proximidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error en búsqueda por proximidad'
    });
  }
});

module.exports = router;
