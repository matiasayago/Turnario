const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { authenticateToken, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// Middleware para validar ObjectId
const validateObjectId = (value) => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

// GET /api/reviews - Obtener lista de reseñas (con filtros)
router.get('/', [
  query('professional').optional().custom(validateObjectId),
  query('client').optional().custom(validateObjectId),
  query('rating').optional().isInt({ min: 1, max: 5 }),
  query('isVerified').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['date', 'rating', 'helpful']),
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
      professional,
      client,
      rating,
      isVerified,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filters = {};

    if (professional) {
      filters.professional = professional;
    }

    if (client) {
      filters.client = client;
    }

    if (rating) {
      filters.rating = parseInt(rating);
    }

    if (isVerified !== undefined) {
      filters.isVerified = isVerified;
    }

    const skip = (page - 1) * limit;
    
    // Obtener reseñas de las citas
    const reviews = await Appointment.find({
      ...filters,
      'rating.score': { $exists: true, $ne: null }
    })
    .populate('client', 'fullName')
    .populate('professional', 'fullName professionalInfo.specialization')
    .populate('service', 'name category')
    .populate('clinic', 'name address')
    .select('rating client professional service clinic date')
    .sort({ [sortBy === 'date' ? 'date' : `rating.${sortBy}`]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Appointment.countDocuments({
      ...filters,
      'rating.score': { $exists: true, $ne: null }
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener reseñas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/reviews/:id - Obtener reseña específica
router.get('/:id', [
  query('id').custom(validateObjectId)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID de reseña inválido',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const appointment = await Appointment.findById(id)
      .populate('client', 'fullName')
      .populate('professional', 'fullName professionalInfo.specialization')
      .populate('service', 'name category')
      .populate('clinic', 'name address')
      .where({ 'rating.score': { $exists: true, $ne: null } });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Reseña no encontrada'
      });
    }

    res.json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error('Error al obtener reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/reviews - Crear nueva reseña
router.post('/', [
  authenticateToken,
  requireRole('client'),
  body('appointmentId').custom(validateObjectId),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isLength({ min: 1, max: 1000 }).trim(),
  body('anonymous').optional().isBoolean()
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
      appointmentId,
      rating,
      comment,
      anonymous = false
    } = req.body;

    // Verificar que la cita existe y pertenece al usuario
    const appointment = await Appointment.findById(appointmentId)
      .populate('client', 'fullName')
      .populate('professional', 'fullName professionalInfo.specialization')
      .populate('service', 'name category')
      .populate('clinic', 'name address');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    if (appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para reseñar esta cita'
      });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden reseñar citas completadas'
      });
    }

    if (appointment.rating && appointment.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'Esta cita ya ha sido reseñada'
      });
    }

    // Crear la reseña
    appointment.rating = {
      score: rating,
      comment: comment || '',
      date: new Date(),
      anonymous: anonymous
    };

    await appointment.save();

    // Actualizar estadísticas del profesional
    const professional = await User.findById(appointment.professional);
    if (professional) {
      const totalReviews = professional.professionalInfo.rating.totalReviews + 1;
      const newAverage = (
        (professional.professionalInfo.rating.average * professional.professionalInfo.rating.totalReviews + rating) / totalReviews
      );
      
      professional.professionalInfo.rating.average = newAverage;
      professional.professionalInfo.rating.totalReviews = totalReviews;
      await professional.save();
    }

    res.status(201).json({
      success: true,
      message: 'Reseña creada correctamente',
      data: appointment
    });

  } catch (error) {
    console.error('Error al crear reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/reviews/:id - Actualizar reseña
router.put('/:id', [
  authenticateToken,
  requireRole('client'),
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('comment').optional().isLength({ min: 1, max: 1000 }).trim(),
  body('anonymous').optional().isBoolean()
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
    
    const appointment = await Appointment.findById(id)
      .populate('client', 'fullName')
      .populate('professional', 'fullName professionalInfo.specialization')
      .populate('service', 'name category')
      .populate('clinic', 'name address');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    if (appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta reseña'
      });
    }

    if (!appointment.rating || !appointment.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'Esta cita no tiene reseña'
      });
    }

    // Guardar el rating anterior para recalcular estadísticas
    const oldRating = appointment.rating.score;

    // Actualizar la reseña
    if (updateData.rating !== undefined) {
      appointment.rating.score = updateData.rating;
    }
    if (updateData.comment !== undefined) {
      appointment.rating.comment = updateData.comment;
    }
    if (updateData.anonymous !== undefined) {
      appointment.rating.anonymous = updateData.anonymous;
    }

    appointment.rating.updatedAt = new Date();
    await appointment.save();

    // Recalcular estadísticas del profesional si cambió el rating
    if (updateData.rating !== undefined && updateData.rating !== oldRating) {
      const professional = await User.findById(appointment.professional);
      if (professional) {
        const totalReviews = professional.professionalInfo.rating.totalReviews;
        const newAverage = (
          (professional.professionalInfo.rating.average * totalReviews - oldRating + updateData.rating) / totalReviews
        );
        
        professional.professionalInfo.rating.average = newAverage;
        await professional.save();
      }
    }

    res.json({
      success: true,
      message: 'Reseña actualizada correctamente',
      data: appointment
    });

  } catch (error) {
    console.error('Error al actualizar reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/reviews/:id - Eliminar reseña
router.delete('/:id', [
  authenticateToken,
  requireRole('client')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    if (appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta reseña'
      });
    }

    if (!appointment.rating || !appointment.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'Esta cita no tiene reseña'
      });
    }

    // Guardar el rating para recalcular estadísticas
    const ratingToRemove = appointment.rating.score;

    // Eliminar la reseña
    appointment.rating = undefined;
    await appointment.save();

    // Recalcular estadísticas del profesional
    const professional = await User.findById(appointment.professional);
    if (professional) {
      const totalReviews = professional.professionalInfo.rating.totalReviews - 1;
      if (totalReviews > 0) {
        const newAverage = (
          (professional.professionalInfo.rating.average * (totalReviews + 1) - ratingToRemove) / totalReviews
        );
        professional.professionalInfo.rating.average = newAverage;
      } else {
        professional.professionalInfo.rating.average = 0;
      }
      professional.professionalInfo.rating.totalReviews = totalReviews;
      await professional.save();
    }

    res.json({
      success: true,
      message: 'Reseña eliminada correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/reviews/:id/helpful - Marcar reseña como útil
router.post('/:id/helpful', [
  authenticateToken,
  body('helpful').isBoolean()
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
    const { helpful } = req.body;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    if (!appointment.rating || !appointment.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'Esta cita no tiene reseña'
      });
    }

    // Inicializar contadores si no existen
    if (!appointment.rating.helpfulCount) {
      appointment.rating.helpfulCount = 0;
    }
    if (!appointment.rating.notHelpfulCount) {
      appointment.rating.notHelpfulCount = 0;
    }

    // Actualizar contadores
    if (helpful) {
      appointment.rating.helpfulCount += 1;
    } else {
      appointment.rating.notHelpfulCount += 1;
    }

    await appointment.save();

    res.json({
      success: true,
      message: 'Voto registrado correctamente',
      data: {
        helpfulCount: appointment.rating.helpfulCount,
        notHelpfulCount: appointment.rating.notHelpfulCount
      }
    });

  } catch (error) {
    console.error('Error al marcar reseña como útil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/reviews/professional/:professionalId - Obtener reseñas de un profesional
router.get('/professional/:professionalId', [
  query('professionalId').custom(validateObjectId),
  query('rating').optional().isInt({ min: 1, max: 5 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['date', 'rating', 'helpful']),
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

    const { professionalId } = req.params;
    const {
      rating,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Verificar que el profesional existe
    const professional = await User.findById(professionalId)
      .where({ userType: 'professional', isActive: true });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Profesional no encontrado'
      });
    }

    // Construir filtros
    const filters = {
      professional: professionalId,
      'rating.score': { $exists: true, $ne: null }
    };

    if (rating) {
      filters['rating.score'] = parseInt(rating);
    }

    const skip = (page - 1) * limit;
    
    const reviews = await Appointment.find(filters)
      .populate('client', 'fullName')
      .populate('service', 'name category')
      .populate('clinic', 'name address')
      .select('rating client service clinic date')
      .sort({ [sortBy === 'date' ? 'date' : `rating.${sortBy}`]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filters);

    // Calcular estadísticas
    const stats = await Appointment.aggregate([
      { $match: { professional: require('mongoose').Types.ObjectId(professionalId) } },
      { $group: {
        _id: '$rating.score',
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = 0;
    }
    stats.forEach(stat => {
      ratingDistribution[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: reviews,
      stats: {
        totalReviews: total,
        averageRating: professional.professionalInfo.rating.average,
        ratingDistribution
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener reseñas del profesional:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/reviews/client/:clientId - Obtener reseñas de un cliente
router.get('/client/:clientId', [
  authenticateToken,
  requireOwnership(User, 'clientId'),
  query('clientId').custom(validateObjectId),
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

    const { clientId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;
    
    const reviews = await Appointment.find({
      client: clientId,
      'rating.score': { $exists: true, $ne: null }
    })
    .populate('professional', 'fullName professionalInfo.specialization')
    .populate('service', 'name category')
    .populate('clinic', 'name address')
    .select('rating professional service clinic date')
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Appointment.countDocuments({
      client: clientId,
      'rating.score': { $exists: true, $ne: null }
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener reseñas del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/reviews/stats/overview - Estadísticas generales de reseñas
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Appointment.aggregate([
      { $match: { 'rating.score': { $exists: true, $ne: null } } },
      { $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating.score' },
        ratingDistribution: {
          $push: '$rating.score'
        }
      }}
    ]);

    if (stats.length === 0) {
      return res.json({
        success: true,
        data: {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: {}
        }
      });
    }

    const stat = stats[0];
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = stat.ratingDistribution.filter(r => r === i).length;
    }

    res.json({
      success: true,
      data: {
        totalReviews: stat.totalReviews,
        averageRating: Math.round(stat.averageRating * 100) / 100,
        ratingDistribution
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de reseñas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;

