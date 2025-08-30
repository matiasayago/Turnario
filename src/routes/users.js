const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// Middleware para validar ObjectId
const validateObjectId = (value) => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

// GET /api/users - Obtener lista de usuarios (con filtros)
router.get('/', [
  authenticateToken,
  query('userType').optional().isIn(['client', 'professional', 'admin']),
  query('specialization').optional().isString(),
  query('city').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('isActive').optional().isBoolean()
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
      userType,
      specialization,
      city,
      page = 1,
      limit = 20,
      search,
      isActive
    } = req.query;

    // Construir filtros
    const filters = {};
    
    if (userType) filters.userType = userType;
    if (isActive !== undefined) filters.isActive = isActive;
    
    if (specialization) {
      filters['professionalInfo.specialization'] = { $regex: specialization, $options: 'i' };
    }
    
    if (city) {
      filters['address.city'] = { $regex: city, $options: 'i' };
    }
    
    if (search) {
      filters.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'professionalInfo.specialization': { $regex: search, $options: 'i' } }
      ];
    }

    // Calcular paginación
    const skip = (page - 1) * limit;
    
    // Ejecutar consulta
    const users = await User.find(filters)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('professionalInfo.specialization', 'name');

    const total = await User.countDocuments(filters);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/:id - Obtener usuario específico
router.get('/:id', [
  authenticateToken,
  body('id').custom(validateObjectId)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const user = await User.findById(id)
      .select('-password')
      .populate('professionalInfo.specialization', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar permisos (solo el propio usuario o admin puede ver datos completos)
    if (req.user.userType !== 'admin' && req.user._id.toString() !== id) {
      // Para usuarios no admin, devolver solo perfil público
      const publicProfile = user.userType === 'professional' 
        ? user.getProfessionalProfile()
        : user.getPublicProfile();
      
      return res.json({
        success: true,
        data: publicProfile
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', [
  authenticateToken,
  requireOwnership(User, 'id'),
  body('fullName').optional().isLength({ min: 2, max: 100 }).trim(),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/),
  body('dateOfBirth').optional().isISO8601(),
  body('address.street').optional().isLength({ min: 2, max: 100 }),
  body('address.city').optional().isLength({ min: 2, max: 50 }),
  body('address.state').optional().isLength({ min: 2, max: 50 }),
  body('address.zipCode').optional().isLength({ min: 2, max: 10 }),
  body('preferences.language').optional().isIn(['es', 'en']),
  body('preferences.timezone').optional().isString(),
  body('preferences.notifications.email').optional().isBoolean(),
  body('preferences.notifications.push').optional().isBoolean(),
  body('preferences.notifications.sms').optional().isBoolean()
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
    delete updateData.email;
    delete updateData.userType;
    delete updateData.password;
    delete updateData.isActive;
    delete updateData.isVerified;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: user
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/users/:id - Desactivar usuario (soft delete)
router.delete('/:id', [
  authenticateToken,
  requireRole('admin')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario desactivado correctamente',
      data: user
    });

  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/specialization/:specialization - Buscar profesionales por especialización
router.get('/specialization/:specialization', [
  query('city').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
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

    const { specialization } = req.params;
    const { city, page = 1, limit = 20 } = req.query;

    const filters = {
      userType: 'professional',
      isActive: true,
      'professionalInfo.specialization': { $regex: specialization, $options: 'i' }
    };

    if (city) {
      filters['address.city'] = { $regex: city, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    
    const professionals = await User.find(filters)
      .select('fullName professionalInfo address stats')
      .sort({ 'stats.rating.average': -1, 'stats.rating.totalReviews': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filters);

    res.json({
      success: true,
      data: professionals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al buscar profesionales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/city/:city - Buscar profesionales por ciudad
router.get('/city/:city', [
  query('specialization').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
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

    const { city } = req.params;
    const { specialization, page = 1, limit = 20 } = req.query;

    const filters = {
      userType: 'professional',
      isActive: true,
      'address.city': { $regex: city, $options: 'i' }
    };

    if (specialization) {
      filters['professionalInfo.specialization'] = { $regex: specialization, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    
    const professionals = await User.find(filters)
      .select('fullName professionalInfo address stats')
      .sort({ 'stats.rating.average': -1, 'stats.rating.totalReviews': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filters);

    res.json({
      success: true,
      data: professionals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al buscar profesionales por ciudad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/users/:id/verify - Verificar usuario (solo admin)
router.post('/:id/verify', [
  authenticateToken,
  requireRole('admin')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByIdAndUpdate(
      id,
      { isVerified: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario verificado correctamente',
      data: user
    });

  } catch (error) {
    console.error('Error al verificar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/stats/overview - Estadísticas generales (solo admin)
router.get('/stats/overview', [
  authenticateToken,
  requireRole('admin')
], async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          verifiedCount: {
            $sum: { $cond: ['$isVerified', 1, 0] }
          }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const totalActive = await User.countDocuments({ isActive: true });
    const totalVerified = await User.countDocuments({ isVerified: true });

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: totalActive,
        verified: totalVerified,
        byType: stats
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;

