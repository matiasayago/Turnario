const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Clinic = require('../models/Clinic');
const Service = require('../models/Service');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// Middleware para validar ObjectId
const validateObjectId = (value) => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

// GET /api/professionals - Obtener lista de profesionales
router.get('/', [
  query('specialization').optional().isString(),
  query('city').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('search').optional().isString(),
  query('isVerified').optional().isBoolean()
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
      specialization,
      city,
      page = 1,
      limit = 20,
      search,
      isVerified
    } = req.query;

    const filters = {
      userType: 'professional',
      isActive: true
    };

    if (specialization) {
      filters['professionalInfo.specialization'] = { $regex: specialization, $options: 'i' };
    }

    if (city) {
      filters['address.city'] = { $regex: city, $options: 'i' };
    }

    if (isVerified !== undefined) {
      filters.isVerified = isVerified;
    }

    if (search) {
      filters.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { 'professionalInfo.specialization': { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const professionals = await User.find(filters)
      .select('fullName professionalInfo address stats isVerified')
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
    console.error('Error al obtener profesionales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/professionals/:id - Obtener perfil completo del profesional
router.get('/:id', [
  query('id').custom(validateObjectId)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID de profesional inválido',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const professional = await User.findById(id)
      .select('-password')
      .where({ userType: 'professional', isActive: true });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Profesional no encontrado'
      });
    }

    // Obtener estadísticas adicionales
    const stats = await Appointment.aggregate([
      {
        $match: {
          professional: professional._id,
          status: { $in: ['completed', 'cancelled', 'no_show'] }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const professionalProfile = professional.getProfessionalProfile();
    professionalProfile.stats = {
      ...professionalProfile.stats,
      appointmentStats: stats
    };

    res.json({
      success: true,
      data: professionalProfile
    });

  } catch (error) {
    console.error('Error al obtener profesional:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/professionals/:id/profile - Actualizar perfil profesional
router.put('/:id/profile', [
  authenticateToken,
  requireOwnership(User, 'id'),
  requireRole('professional'),
  body('professionalInfo.license').optional().isString(),
  body('professionalInfo.specialization').optional().isString(),
  body('professionalInfo.experience').optional().isInt({ min: 0 }),
  body('professionalInfo.education').optional().isArray(),
  body('professionalInfo.certifications').optional().isArray(),
  body('professionalInfo.languages').optional().isArray(),
  body('professionalInfo.consultationFee').optional().isFloat({ min: 0 }),
  body('address').optional().isObject(),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/),
  body('preferences').optional().isObject()
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

    // Validar que solo se actualicen campos permitidos
    const allowedFields = [
      'professionalInfo',
      'address',
      'phone',
      'preferences'
    ];

    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field]) {
        filteredData[field] = updateData[field];
      }
    });

    const professional = await User.findByIdAndUpdate(
      id,
      { $set: filteredData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Profesional no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: professional
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/professionals/:id/schedule - Obtener horarios del profesional
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

    const professional = await User.findById(id)
      .select('professionalInfo.workingHours')
      .where({ userType: 'professional', isActive: true });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Profesional no encontrado'
      });
    }

    // Obtener citas existentes para el período
    let appointmentFilter = { professional: id };
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      appointmentFilter.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate && endDate) {
      appointmentFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const appointments = await Appointment.find(appointmentFilter)
      .select('date startTime endTime status')
      .sort({ date: 1, startTime: 1 });

    // Obtener consultorios del profesional
    const clinics = await Clinic.find({
      'professionals.professional': id,
      'professionals.isActive': true
    }).select('operatingHours');

    res.json({
      success: true,
      data: {
        workingHours: professional.professionalInfo.workingHours,
        appointments,
        clinics
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

// PUT /api/professionals/:id/schedule - Actualizar horarios del profesional
router.put('/:id/schedule', [
  authenticateToken,
  requireOwnership(User, 'id'),
  requireRole('professional'),
  body('workingHours').isObject(),
  body('workingHours.*.enabled').isBoolean(),
  body('workingHours.*.start').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('workingHours.*.end').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('workingHours.*.breaks').optional().isArray()
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
    const { workingHours } = req.body;

    // Validar que las horas de fin sean posteriores a las de inicio
    for (const [day, schedule] of Object.entries(workingHours)) {
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

    const professional = await User.findByIdAndUpdate(
      id,
      { 'professionalInfo.workingHours': workingHours },
      { new: true, runValidators: true }
    ).select('-password');

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Profesional no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Horarios actualizados correctamente',
      data: professional.professionalInfo.workingHours
    });

  } catch (error) {
    console.error('Error al actualizar horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/professionals/:id/patients - Obtener pacientes del profesional
router.get('/:id/patients', [
  authenticateToken,
  requireOwnership(User, 'id'),
  requireRole('professional'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString()
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
    const { page = 1, limit = 20, search } = req.query;

    // Obtener pacientes únicos que han tenido citas con este profesional
    const patients = await Appointment.aggregate([
      {
        $match: {
          professional: require('mongoose').Types.ObjectId(id),
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$client',
          lastAppointment: { $max: '$date' },
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: ['$status', 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'patientInfo'
        }
      },
      {
        $unwind: '$patientInfo'
      },
      {
        $project: {
          _id: '$patientInfo._id',
          fullName: '$patientInfo.fullName',
          email: '$patientInfo.email',
          phone: '$patientInfo.phone',
          dateOfBirth: '$patientInfo.dateOfBirth',
          lastAppointment: 1,
          totalAppointments: 1,
          completedAppointments: 1
        }
      },
      {
        $sort: { lastAppointment: -1 }
      }
    ]);

    // Aplicar búsqueda si se especifica
    let filteredPatients = patients;
    if (search) {
      filteredPatients = patients.filter(patient =>
        patient.fullName && patient.fullName.toLowerCase().includes((search || '').toLowerCase()) ||
        patient.email && patient.email.toLowerCase().includes((search || '').toLowerCase())
      );
    }

    // Aplicar paginación
    const total = filteredPatients.length;
    const skip = (page - 1) * limit;
    const paginatedPatients = filteredPatients.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paginatedPatients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/professionals/:id/stats - Obtener estadísticas del profesional
router.get('/:id/stats', [
  authenticateToken,
  requireOwnership(User, 'id'),
  requireRole('professional'),
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
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Estadísticas de citas
    const appointmentStats = await Appointment.aggregate([
      {
        $match: {
          professional: require('mongoose').Types.ObjectId(id),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Estadísticas por mes
    const monthlyStats = await Appointment.aggregate([
      {
        $match: {
          professional: require('mongoose').Types.ObjectId(id),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: ['$status', 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Ingresos totales
    const totalEarnings = await Appointment.aggregate([
      {
        $match: {
          professional: require('mongoose').Types.ObjectId(id),
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$billing.amount' }
        }
      }
    ]);

    // Pacientes únicos
    const uniquePatients = await Appointment.distinct('client', {
      professional: id,
      ...dateFilter
    });

    res.json({
      success: true,
      data: {
        appointmentStats,
        monthlyStats,
        totalEarnings: totalEarnings[0]?.total || 0,
        uniquePatients: uniquePatients.length,
        period: dateFilter.date ? { startDate, endDate } : 'all'
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

// GET /api/professionals/:id/availability - Verificar disponibilidad
router.get('/:id/availability', [
  query('id').custom(validateObjectId),
  query('date').isISO8601(),
  query('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  query('endTime').matches(/^([01]?[0-3]):[0-5][0-9]$/),
  query('clinicId').optional().custom(validateObjectId)
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

    const { id, date, startTime, endTime, clinicId } = req.query;

    // Verificar disponibilidad del profesional
    const isAvailable = await Appointment.checkAvailability(
      id,
      clinicId,
      new Date(date),
      startTime,
      endTime
    );

    res.json({
      success: true,
      data: {
        available: isAvailable,
        date,
        startTime,
        endTime,
        clinicId
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

