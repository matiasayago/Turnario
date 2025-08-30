const express = require('express');
const { body, validationResult } = require('express-validator');
const Service = require('../models/Service');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// @route   GET /api/services
// @desc    Obtener todos los servicios activos
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { category, search, isActive = true, limit = 50, page = 1 } = req.query;
    
    let query = {};
    
    // Filtrar por estado activo/inactivo
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Filtrar por categoría
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }
    
    // Búsqueda por nombre o descripción
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const services = await Service.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    // Obtener total para paginación
    const total = await Service.countDocuments(query);
    
    res.json({
      success: true,
      data: services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios'
    });
  }
});

// @route   GET /api/services/:id
// @desc    Obtener un servicio específico
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);
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
      message: 'Error al obtener servicio'
    });
  }
});

// @route   POST /api/services
// @desc    Crear un nuevo servicio (solo profesionales y administradores)
// @access  Private (Profesionales y Administradores)
router.post('/', requireRole(['professional', 'admin']), [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
  body('duration')
    .isInt({ min: 15, max: 480 })
    .withMessage('La duración debe estar entre 15 y 480 minutos'),
  body('price.amount')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('price.currency')
    .isIn(['ARS', 'USD', 'EUR'])
    .withMessage('Moneda debe ser ARS, USD o EUR'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('La categoría debe tener entre 2 y 50 caracteres'),
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

    const { name, description, duration, price, category, isActive = true } = req.body;

    // Verificar si ya existe un servicio con el mismo nombre
    const existingService = await Service.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un servicio con ese nombre'
      });
    }

    // Crear el servicio
    const serviceData = {
      name,
      description,
      duration,
      price,
      category,
      isActive,
      createdBy: req.user.userId
    };

    const service = new Service(serviceData);
    await service.save();

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: service
    });
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear servicio'
    });
  }
});

// @route   PUT /api/services/:id
// @desc    Actualizar un servicio existente
// @access  Private (Profesionales y Administradores)
router.put('/:id', requireRole(['professional', 'admin']), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('La duración debe estar entre 15 y 480 minutos'),
  body('price.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('price.currency')
    .optional()
    .isIn(['ARS', 'USD', 'EUR'])
    .withMessage('Moneda debe ser ARS, USD o EUR'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('La categoría debe tener entre 2 y 50 caracteres'),
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

    // Verificar si el servicio existe
    const existingService = await Service.findById(id);
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
    if (updateData.name && updateData.name !== existingService.name) {
      const duplicateService = await Service.findOne({ 
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') } 
      });
      
      if (duplicateService) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro servicio con ese nombre'
        });
      }
    }

    // Agregar información de modificación
    updateData.updatedBy = req.user.userId;
    updateData.updatedAt = new Date();

    // Actualizar el servicio
    const updatedService = await Service.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar servicio'
    });
  }
});

// @route   DELETE /api/services/:id
// @desc    Desactivar un servicio (soft delete)
// @access  Private (Profesionales y Administradores)
router.delete('/:id', requireRole(['professional', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Desactivar el servicio
    service.isActive = false;
    service.deactivatedAt = new Date();
    service.deactivatedBy = req.user.userId;
    await service.save();

    res.json({
      success: true,
      message: 'Servicio desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al desactivar servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar servicio'
    });
  }
});

// @route   POST /api/services/:id/reactivate
// @desc    Reactivar un servicio desactivado
// @access  Private (Profesionales y Administradores)
router.post('/:id/reactivate', requireRole(['professional', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Reactivar el servicio
    service.isActive = true;
    service.deactivatedAt = undefined;
    service.deactivatedBy = undefined;
    await service.save();

    res.json({
      success: true,
      message: 'Servicio reactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al reactivar servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reactivar servicio'
    });
  }
});

// @route   GET /api/services/categories/list
// @desc    Obtener lista de todas las categorías disponibles
// @access  Private
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Service.distinct('category');
    
    res.json({
      success: true,
      data: categories.sort()
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías'
    });
  }
});

// @route   GET /api/services/stats/overview
// @desc    Obtener estadísticas generales de servicios (solo profesionales y administradores)
// @access  Private (Profesionales y Administradores)
router.get('/stats/overview', requireRole(['professional', 'admin']), async (req, res) => {
  try {
    const totalServices = await Service.countDocuments();
    const activeServices = await Service.countDocuments({ isActive: true });
    const inactiveServices = await Service.countDocuments({ isActive: false });
    
    const servicesByCategory = await Service.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price.amount' },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const recentServices = await Service.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name category price isActive createdAt');

    res.json({
      success: true,
      data: {
        total: totalServices,
        active: activeServices,
        inactive: inactiveServices,
        byCategory: servicesByCategory,
        recent: recentServices
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

// @route   GET /api/services/search/advanced
// @desc    Búsqueda avanzada de servicios
// @access  Private
router.get('/search/advanced', async (req, res) => {
  try {
    const { 
      name, 
      category, 
      minPrice, 
      maxPrice, 
      minDuration, 
      maxDuration,
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
    
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }
    
    if (minPrice || maxPrice) {
      query['price.amount'] = {};
      if (minPrice) query['price.amount'].$gte = parseFloat(minPrice);
      if (maxPrice) query['price.amount'].$lte = parseFloat(maxPrice);
    }
    
    if (minDuration || maxDuration) {
      query.duration = {};
      if (minDuration) query.duration.$gte = parseInt(minDuration);
      if (maxDuration) query.duration.$lte = parseInt(maxDuration);
    }

    // Ordenamiento
    let sortOptions = {};
    if (['name', 'price.amount', 'duration', 'category', 'createdAt'].includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.name = 1; // Ordenamiento por defecto
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const services = await Service.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
      
    // Obtener total para paginación
    const total = await Service.countDocuments(query);
    
    res.json({
      success: true,
      data: services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        name,
        category,
        minPrice,
        maxPrice,
        minDuration,
        maxDuration,
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

module.exports = router;
