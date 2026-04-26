const ProfessionalAvailability = require('../models/ProfessionalAvailability');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Obtener disponibilidad de un profesional
const getAvailabilityByProfessional = async (req, res) => {
  try {
    const { professionalId } = req.params;
    
    const availability = await ProfessionalAvailability.findByProfessional(professionalId);
    
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró disponibilidad para este profesional'
      });
    }
    
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error obteniendo disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear o actualizar disponibilidad de un profesional
const createOrUpdateAvailability = async (req, res) => {
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
    const availabilityData = req.body;
    
    // Verificar que el profesional existe
    const professional = await User.findById(professionalId);
    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Profesional no encontrado'
      });
    }
    
    // Buscar disponibilidad existente
    let availability = await ProfessionalAvailability.findByProfessional(professionalId);
    
    if (availability) {
      // Actualizar disponibilidad existente
      Object.assign(availability, availabilityData);
      availability.updatedAt = new Date();
      await availability.save();
      
      res.json({
        success: true,
        message: 'Disponibilidad actualizada correctamente',
        data: availability
      });
    } else {
      // Crear nueva disponibilidad
      availability = new ProfessionalAvailability({
        professionalId,
        professionalName: professional.fullName,
        ...availabilityData
      });
      
      await availability.save();
      
      res.status(201).json({
        success: true,
        message: 'Disponibilidad creada correctamente',
        data: availability
      });
    }
  } catch (error) {
    console.error('Error creando/actualizando disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Verificar si una fecha está disponible para un profesional
const checkDateAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'La fecha es requerida'
      });
    }
    
    const checkDate = new Date(date);
    const availability = await ProfessionalAvailability.findByProfessional(professionalId);
    
    if (!availability) {
      return res.json({
        success: true,
        data: {
          isAvailable: false,
          reason: 'No hay disponibilidad configurada'
        }
      });
    }
    
    const isAvailable = availability.isDateAvailable(checkDate);
    
    res.json({
      success: true,
      data: {
        isAvailable,
        date: checkDate
      }
    });
  } catch (error) {
    console.error('Error verificando disponibilidad de fecha:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener horarios disponibles para una fecha específica
const getAvailableTimeSlots = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'La fecha es requerida'
      });
    }
    
    const checkDate = new Date(date);
    const availability = await ProfessionalAvailability.findByProfessional(professionalId);
    
    if (!availability) {
      return res.json({
        success: true,
        data: {
          timeSlots: [],
          reason: 'No hay disponibilidad configurada'
        }
      });
    }
    
    const timeSlots = availability.getAvailableTimeSlots(checkDate);
    
    res.json({
      success: true,
      data: {
        timeSlots,
        date: checkDate,
        isAvailable: timeSlots.length > 0
      }
    });
  } catch (error) {
    console.error('Error obteniendo horarios disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Verificar si un horario específico está disponible
const checkTimeSlotAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date, timeSlot } = req.query;
    
    if (!date || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'La fecha y el horario son requeridos'
      });
    }
    
    const checkDate = new Date(date);
    const availability = await ProfessionalAvailability.findByProfessional(professionalId);
    
    if (!availability) {
      return res.json({
        success: true,
        data: {
          isAvailable: false,
          reason: 'No hay disponibilidad configurada'
        }
      });
    }
    
    const isAvailable = availability.isTimeSlotAvailable(checkDate, timeSlot);
    
    res.json({
      success: true,
      data: {
        isAvailable,
        date: checkDate,
        timeSlot
      }
    });
  } catch (error) {
    console.error('Error verificando disponibilidad de horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener todos los profesionales disponibles en una fecha
const getAvailableProfessionals = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'La fecha es requerida'
      });
    }
    
    const checkDate = new Date(date);
    const professionals = await ProfessionalAvailability.findAvailableProfessionals(checkDate);
    
    res.json({
      success: true,
      data: {
        professionals,
        date: checkDate,
        count: professionals.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo profesionales disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Agregar excepción especial para una fecha
const addSpecialDate = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date, isAvailable, customTimeSlots, reason } = req.body;
    
    const availability = await ProfessionalAvailability.findByProfessional(professionalId);
    
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró disponibilidad para este profesional'
      });
    }
    
    await availability.addSpecialDate(new Date(date), isAvailable, customTimeSlots, reason);
    
    res.json({
      success: true,
      message: 'Excepción especial agregada correctamente',
      data: availability
    });
  } catch (error) {
    console.error('Error agregando excepción especial:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Agregar excepción recurrente
const addRecurringException = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { dayOfWeek, startDate, endDate, isAvailable, reason } = req.body;
    
    const availability = await ProfessionalAvailability.findByProfessional(professionalId);
    
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró disponibilidad para este profesional'
      });
    }
    
    await availability.addRecurringException(
      dayOfWeek,
      new Date(startDate),
      new Date(endDate),
      isAvailable,
      reason
    );
    
    res.json({
      success: true,
      message: 'Excepción recurrente agregada correctamente',
      data: availability
    });
  } catch (error) {
    console.error('Error agregando excepción recurrente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar disponibilidad de un profesional
const deleteAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    
    const availability = await ProfessionalAvailability.findOneAndDelete({ professionalId });
    
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró disponibilidad para este profesional'
      });
    }
    
    res.json({
      success: true,
      message: 'Disponibilidad eliminada correctamente'
    });
  } catch (error) {
    console.error('Error eliminando disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener todas las disponibilidades (admin)
const getAllAvailabilities = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const availabilities = await ProfessionalAvailability.find(query)
      .populate('professionalId', 'fullName email phone service')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await ProfessionalAvailability.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        availabilities,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo todas las disponibilidades:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Bloquear un horario específico
const blockTimeSlot = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date, timeSlot, appointmentId, reason } = req.body;
    
    const availability = await ProfessionalAvailability.findByProfessional(professionalId);
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró disponibilidad para este profesional'
      });
    }
    
    await availability.blockTimeSlot(new Date(date), timeSlot, appointmentId, reason);
    
    res.json({
      success: true,
      message: 'Horario bloqueado exitosamente'
    });
  } catch (error) {
    console.error('Error bloqueando horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Desbloquear un horario específico
const unblockTimeSlot = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date, timeSlot, appointmentId } = req.body;
    
    const availability = await ProfessionalAvailability.findByProfessional(professionalId);
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró disponibilidad para este profesional'
      });
    }
    
    await availability.unblockTimeSlot(new Date(date), timeSlot, appointmentId);
    
    res.json({
      success: true,
      message: 'Horario desbloqueado exitosamente'
    });
  } catch (error) {
    console.error('Error desbloqueando horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Desbloquear todos los horarios de una cita
const unblockAppointmentTimeSlots = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { appointmentId } = req.body;
    
    const availability = await ProfessionalAvailability.findByProfessional(professionalId);
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró disponibilidad para este profesional'
      });
    }
    
    await availability.unblockAppointmentTimeSlots(appointmentId);
    
    res.json({
      success: true,
      message: 'Horarios de la cita desbloqueados exitosamente'
    });
  } catch (error) {
    console.error('Error desbloqueando horarios de cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener horarios bloqueados en una fecha
const getBlockedTimeSlots = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date } = req.query;
    
    const availability = await ProfessionalAvailability.findByProfessional(professionalId);
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró disponibilidad para este profesional'
      });
    }
    
    const blockedSlots = availability.getBlockedTimeSlots(new Date(date));
    
    res.json({
      success: true,
      data: blockedSlots
    });
  } catch (error) {
    console.error('Error obteniendo horarios bloqueados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getAvailabilityByProfessional,
  createOrUpdateAvailability,
  checkDateAvailability,
  getAvailableTimeSlots,
  checkTimeSlotAvailability,
  getAvailableProfessionals,
  addSpecialDate,
  addRecurringException,
  deleteAvailability,
  getAllAvailabilities,
  blockTimeSlot,
  unblockTimeSlot,
  unblockAppointmentTimeSlots,
  getBlockedTimeSlots
};
