const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// @route   GET /api/users
// @desc    Obtener usuarios según el rol del usuario autenticado
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { userType, userId } = req.user;
    let users;

    if (userType === 'professional') {
      // Profesionales pueden ver todos los usuarios
      const { role, search, limit = 50, page = 1 } = req.query;
      
      let query = {};
      
      // Filtrar por rol si se especifica
      if (role && ['client', 'professional', 'admin'].includes(role)) {
        query.userType = role;
      }
      
      // Búsqueda por nombre o email
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      users = await User.find(query)
        .select('-password')
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(parseInt(limit));
        
      // Obtener total para paginación
      const total = await User.countDocuments(query);
      
      res.json({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } else {
      // Clientes solo pueden ver su propio perfil
      const user = await User.findById(userId).select('-password');
      res.json({
        success: true,
        data: [user]
      });
    }
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Obtener un usuario específico
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userType, userId } = req.user;

    // Verificar permisos
    if (userType === 'client' && id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este usuario'
      });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
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
      message: 'Error al obtener usuario'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Actualizar un usuario
// @access  Private
router.put('/:id', [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Número de teléfono inválido'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Dirección debe ser un objeto'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Calle debe tener entre 5 y 200 caracteres'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Ciudad debe tener entre 2 y 100 caracteres'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Estado debe tener entre 2 y 100 caracteres'),
  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Código postal debe tener entre 3 y 20 caracteres'),
  body('address.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('País debe tener entre 2 y 100 caracteres'),
  body('emergencyContact')
    .optional()
    .isObject()
    .withMessage('Contacto de emergencia debe ser un objeto'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre del contacto de emergencia debe tener entre 2 y 100 caracteres'),
  body('emergencyContact.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Teléfono del contacto de emergencia inválido'),
  body('emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Relación debe tener entre 2 y 50 caracteres'),
  body('medicalHistory')
    .optional()
    .isArray()
    .withMessage('Historial médico debe ser un array'),
  body('allergies')
    .optional()
    .isArray()
    .withMessage('Alergias debe ser un array'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres')
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
    const { userType, userId } = req.user;
    const updateData = req.body;

    // Verificar permisos
    if (userType === 'client' && id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar este usuario'
      });
    }

    // Solo administradores pueden cambiar el tipo de usuario
    if (updateData.userType && userType !== 'admin') {
      delete updateData.userType;
    }

    // Solo administradores pueden cambiar el estado
    if (updateData.isActive !== undefined && userType !== 'admin') {
      delete updateData.isActive;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Desactivar un usuario (soft delete)
// @access  Private (Solo administradores)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir desactivar administradores
    if (user.userType === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'No se puede desactivar un administrador'
      });
    }

    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivatedBy = req.user.userId;
    await user.save();

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar usuario'
    });
  }
});

// @route   POST /api/users/:id/reactivate
// @desc    Reactivar un usuario desactivado
// @access  Private (Solo administradores)
router.post('/:id/reactivate', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.isActive = true;
    user.deactivatedAt = undefined;
    user.deactivatedBy = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Usuario reactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al reactivar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reactivar usuario'
    });
  }
});

// @route   GET /api/users/profile/me
// @desc    Obtener el perfil del usuario autenticado
// @access  Private
router.get('/profile/me', async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
});

// @route   PUT /api/users/profile/me
// @desc    Actualizar el perfil del usuario autenticado
// @access  Private
router.put('/profile/me', [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Número de teléfono inválido'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Dirección debe ser un objeto'),
  body('emergencyContact')
    .optional()
    .isObject()
    .withMessage('Contacto de emergencia debe ser un objeto'),
  body('medicalHistory')
    .optional()
    .isArray()
    .withMessage('Historial médico debe ser un array'),
  body('allergies')
    .optional()
    .isArray()
    .withMessage('Alergias debe ser un array'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres')
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

    const { userId } = req.user;
    const updateData = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil'
    });
  }
});

// @route   POST /api/users/:id/change-password
// @desc    Cambiar contraseña de un usuario
// @access  Private
router.post('/:id/change-password', [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('La contraseña actual debe tener al menos 6 caracteres'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
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
    const { userType, userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    // Verificar permisos
    if (userType === 'client' && id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar la contraseña de este usuario'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Cambiar contraseña
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña'
    });
  }
});

// @route   GET /api/users/stats/overview
// @desc    Obtener estadísticas generales de usuarios (solo administradores)
// @access  Private (Solo administradores)
router.get('/stats/overview', requireRole('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    
    const usersByType = await User.aggregate([
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email userType createdAt');

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        byType: usersByType,
        recent: recentUsers
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

module.exports = router;
