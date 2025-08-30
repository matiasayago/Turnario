import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScheduleService } from './ScheduleService';

class AppointmentService {
  // Crear nueva cita
  static async createAppointment(appointmentData) {
    try {
      const {
        clientId,
        professionalId,
        date,
        startTime,
        duration,
        notes,
        price
      } = appointmentData;

      // Validar disponibilidad del profesional
      const isAvailable = await this.checkProfessionalAvailability(
        professionalId,
        date,
        startTime,
        duration
      );

      if (!isAvailable) {
        throw new Error('El horario seleccionado no está disponible');
      }

      // Calcular hora de fin
      const endTime = this.calculateEndTime(startTime, duration);

      const newAppointment = {
        id: Date.now().toString(),
        clientId,
        professionalId,
        date,
        startTime,
        endTime,
        duration,
        status: 'pending',
        notes: notes || '',
        price,
        paymentStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Guardar cita
      const stored = await AsyncStorage.getItem('appointments');
      const allAppointments = stored ? JSON.parse(stored) : [];
      allAppointments.push(newAppointment);
      
      await AsyncStorage.setItem('appointments', JSON.stringify(allAppointments));

      // Crear notificación para el profesional
      await this.createProfessionalNotification(newAppointment);

      return newAppointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  // Verificar disponibilidad del profesional
  static async checkProfessionalAvailability(professionalId, date, startTime, duration) {
    try {
      // Obtener horarios del profesional
      const schedule = await ScheduleService.getProfessionalSchedule();
      
      // Verificar si el día está habilitado
      const dayOfWeek = new Date(date).getDay();
      const daySchedule = schedule[dayOfWeek];
      
      if (!daySchedule?.enabled) {
        return false;
      }

      // Verificar si el horario está dentro de los rangos configurados
      const isWithinRanges = ScheduleService.isTimeSlotAvailable(schedule, new Date(date), startTime);
      
      if (!isWithinRanges) {
        return false;
      }

      // Verificar si no hay conflictos con otras citas
      const hasConflict = await this.checkTimeConflict(professionalId, date, startTime, duration);
      
      return !hasConflict;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  // Verificar conflicto de horarios
  static async checkTimeConflict(professionalId, date, startTime, duration) {
    try {
      const stored = await AsyncStorage.getItem('appointments');
      const allAppointments = stored ? JSON.parse(stored) : [];
      
      const endTime = this.calculateEndTime(startTime, duration);
      
      // Filtrar citas del profesional en la fecha específica
      const professionalAppointments = allAppointments.filter(apt => 
        apt.professionalId === professionalId &&
        apt.date === date &&
        apt.status !== 'cancelled'
      );

      // Verificar superposición
      return professionalAppointments.some(apt => {
        const aptStart = apt.startTime;
        const aptEnd = apt.endTime;
        
        // Verificar si hay superposición
        return (
          (startTime >= aptStart && startTime < aptEnd) ||
          (endTime > aptStart && endTime <= aptEnd) ||
          (startTime <= aptStart && endTime >= aptEnd)
        );
      });
    } catch (error) {
      console.error('Error checking time conflict:', error);
      return true; // En caso de error, asumir conflicto
    }
  }

  // Calcular hora de fin
  static calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + duration * 60000);
    return endDate.toTimeString().slice(0, 5);
  }

  // Obtener citas del profesional
  static async getProfessionalAppointments(professionalId, date = null) {
    try {
      const stored = await AsyncStorage.getItem('appointments');
      const allAppointments = stored ? JSON.parse(stored) : [];
      
      let filtered = allAppointments.filter(apt => 
        apt.professionalId === professionalId &&
        apt.status !== 'cancelled'
      );

      if (date) {
        filtered = filtered.filter(apt => apt.date === date);
      }

      // Ordenar por fecha y hora
      return filtered.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.startTime);
        const dateB = new Date(b.date + 'T' + b.startTime);
        return dateA.getTime() - dateB.getTime();
      });
    } catch (error) {
      console.error('Error getting professional appointments:', error);
      return [];
    }
  }

  // Obtener citas del cliente
  static async getClientAppointments(clientId, status = null) {
    try {
      const stored = await AsyncStorage.getItem('appointments');
      const allAppointments = stored ? JSON.parse(stored) : [];
      
      let filtered = allAppointments.filter(apt => apt.clientId === clientId);
      
      if (status) {
        filtered = filtered.filter(apt => apt.status === status);
      }

      // Ordenar por fecha y hora
      return filtered.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.startTime);
        const dateB = new Date(b.date + 'T' + b.startTime);
        return dateA.getTime() - dateB.getTime();
      });
    } catch (error) {
      console.error('Error getting client appointments:', error);
      return [];
    }
  }

  // Actualizar estado de cita
  static async updateAppointmentStatus(appointmentId, status) {
    try {
      const stored = await AsyncStorage.getItem('appointments');
      const allAppointments = stored ? JSON.parse(stored) : [];
      
      const appointmentIndex = allAppointments.findIndex(apt => apt.id === appointmentId);
      
      if (appointmentIndex === -1) {
        throw new Error('Cita no encontrada');
      }

      allAppointments[appointmentIndex].status = status;
      allAppointments[appointmentIndex].updatedAt = new Date();
      
      await AsyncStorage.setItem('appointments', JSON.stringify(allAppointments));

      // Crear notificación según el estado
      await this.createStatusChangeNotification(allAppointments[appointmentIndex]);

      return allAppointments[appointmentIndex];
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }

  // Cancelar cita
  static async cancelAppointment(appointmentId, reason = '') {
    try {
      const appointment = await this.updateAppointmentStatus(appointmentId, 'cancelled');
      
      // Crear notificación de cancelación
      await this.createCancellationNotification(appointment, reason);
      
      return appointment;
    } catch (error) {
      console.error('Error canceling appointment:', error);
      throw error;
    }
  }

  // Confirmar cita
  static async confirmAppointment(appointmentId) {
    return this.updateAppointmentStatus(appointmentId, 'confirmed');
  }

  // Completar cita
  static async completeAppointment(appointmentId) {
    return this.updateAppointmentStatus(appointmentId, 'completed');
  }

  // Obtener estadísticas del profesional
  static async getProfessionalStats(professionalId) {
    try {
      const appointments = await this.getProfessionalAppointments(professionalId);
      
      const total = appointments.length;
      const completed = appointments.filter(apt => apt.status === 'completed').length;
      const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
      const pending = appointments.filter(apt => apt.status === 'pending').length;
      const confirmed = appointments.filter(apt => apt.status === 'confirmed').length;
      
      const totalEarnings = appointments
        .filter(apt => apt.status === 'completed' && apt.paymentStatus === 'paid')
        .reduce((sum, apt) => sum + apt.price, 0);

      // Calcular horarios más ocupados
      const busyHours = this.calculateBusyHours(appointments);
      
      // Calcular días más populares
      const popularDays = this.calculatePopularDays(appointments);

      return {
        total,
        completed,
        cancelled,
        pending,
        confirmed,
        totalEarnings,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
        busyHours,
        popularDays,
      };
    } catch (error) {
      console.error('Error getting professional stats:', error);
      return {
        total: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        confirmed: 0,
        totalEarnings: 0,
        completionRate: 0,
        cancellationRate: 0,
        busyHours: [],
        popularDays: [],
      };
    }
  }

  // Calcular horarios más ocupados
  static calculateBusyHours(appointments) {
    const hourCounts = {};
    
    appointments.forEach(apt => {
      const hour = apt.startTime.split(':')[0];
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([hour]) => `${hour}:00`);
  }

  // Calcular días más populares
  static calculatePopularDays(appointments) {
    const dayCounts = {};
    
    appointments.forEach(apt => {
      const day = new Date(apt.date).getDay();
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayName = dayNames[day];
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
    });

    return Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);
  }

  // Crear notificación para el profesional
  static async createProfessionalNotification(appointment) {
    try {
      const stored = await AsyncStorage.getItem(`notifications_${appointment.professionalId}`);
      const notifications = stored ? JSON.parse(stored) : [];
      
      const newNotification = {
        id: Date.now().toString(),
        userId: appointment.professionalId,
        title: 'Nueva cita solicitada',
        message: `Nueva cita para ${appointment.date} a las ${appointment.startTime}`,
        type: 'appointment',
        read: false,
        data: { appointmentId: appointment.id },
        createdAt: new Date(),
      };

      notifications.unshift(newNotification);
      await AsyncStorage.setItem(`notifications_${appointment.professionalId}`, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error creating professional notification:', error);
    }
  }

  // Crear notificación de cambio de estado
  static async createStatusChangeNotification(appointment) {
    try {
      const stored = await AsyncStorage.getItem(`notifications_${appointment.clientId}`);
      const notifications = stored ? JSON.parse(stored) : [];
      
      let title, message;
      switch (appointment.status) {
        case 'confirmed':
          title = 'Cita confirmada';
          message = `Tu cita para ${appointment.date} a las ${appointment.startTime} ha sido confirmada`;
          break;
        case 'cancelled':
          title = 'Cita cancelada';
          message = `Tu cita para ${appointment.date} a las ${appointment.startTime} ha sido cancelada`;
          break;
        case 'completed':
          title = 'Cita completada';
          message = `Tu cita para ${appointment.date} a las ${appointment.startTime} ha sido marcada como completada`;
          break;
        default:
          return;
      }

      const newNotification = {
        id: Date.now().toString(),
        userId: appointment.clientId,
        title,
        message,
        type: 'appointment',
        read: false,
        data: { appointmentId: appointment.id },
        createdAt: new Date(),
      };

      notifications.unshift(newNotification);
      await AsyncStorage.setItem(`notifications_${appointment.clientId}`, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error creating status change notification:', error);
    }
  }

  // Crear notificación de cancelación
  static async createCancellationNotification(appointment, reason) {
    try {
      const stored = await AsyncStorage.getItem(`notifications_${appointment.clientId}`);
      const notifications = stored ? JSON.parse(stored) : [];
      
      const newNotification = {
        id: Date.now().toString(),
        userId: appointment.clientId,
        title: 'Cita cancelada',
        message: `Tu cita para ${appointment.date} a las ${appointment.startTime} ha sido cancelada${reason ? `: ${reason}` : ''}`,
        type: 'appointment',
        read: false,
        data: { appointmentId: appointment.id, reason },
        createdAt: new Date(),
      };

      notifications.unshift(newNotification);
      await AsyncStorage.setItem(`notifications_${appointment.clientId}`, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error creating cancellation notification:', error);
    }
  }

  // Obtener próximas citas
  static async getUpcomingAppointments(userId, userType) {
    try {
      const appointments = userType === 'client' 
        ? await this.getClientAppointments(userId)
        : await this.getProfessionalAppointments(userId);

      const now = new Date();
      
      return appointments
        .filter(apt => 
          apt.status === 'confirmed' || apt.status === 'pending'
        )
        .filter(apt => {
          const appointmentDate = new Date(apt.date + 'T' + apt.startTime);
          return appointmentDate > now;
        })
        .sort((a, b) => {
          const dateA = new Date(a.date + 'T' + a.startTime);
          const dateB = new Date(b.date + 'T' + b.startTime);
          return dateA.getTime() - dateB.getTime();
        });
    } catch (error) {
      console.error('Error getting upcoming appointments:', error);
      return [];
    }
  }

  // Buscar citas disponibles
  static async searchAvailableSlots(professionalId, date, duration = 30) {
    try {
      const schedule = await ScheduleService.getProfessionalSchedule();
      const dayOfWeek = new Date(date).getDay();
      const daySchedule = schedule[dayOfWeek];
      
      if (!daySchedule?.enabled) {
        return [];
      }

      const availableSlots = ScheduleService.generateAvailableSlots(schedule, new Date(date));
      
      // Filtrar slots que no tengan conflictos
      const availableSlotsWithoutConflicts = [];
      
      for (const slot of availableSlots) {
        const hasConflict = await this.checkTimeConflict(
          professionalId,
          date,
          slot.start,
          duration
        );
        
        if (!hasConflict) {
          availableSlotsWithoutConflicts.push(slot);
        }
      }

      return availableSlotsWithoutConflicts;
    } catch (error) {
      console.error('Error searching available slots:', error);
      return [];
    }
  }
}

export default AppointmentService;

