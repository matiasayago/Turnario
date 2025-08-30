import AsyncStorage from '@react-native-async-storage/async-storage';

class PaymentService {
  // Crear nuevo pago
  static async createPayment(paymentData) {
    try {
      const {
        appointmentId,
        amount,
        currency = 'USD',
        paymentMethod,
        stripePaymentIntentId
      } = paymentData;

      const newPayment = {
        id: Date.now().toString(),
        appointmentId,
        amount,
        currency,
        status: 'pending',
        paymentMethod,
        stripePaymentIntentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Guardar pago
      const stored = await AsyncStorage.getItem('payments');
      const allPayments = stored ? JSON.parse(stored) : [];
      allPayments.push(newPayment);
      
      await AsyncStorage.setItem('payments', JSON.stringify(allPayments));

      return newPayment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  // Obtener pagos por cita
  static async getPaymentsByAppointment(appointmentId) {
    try {
      const stored = await AsyncStorage.getItem('payments');
      const allPayments = stored ? JSON.parse(stored) : [];
      
      return allPayments.filter(payment => payment.appointmentId === appointmentId);
    } catch (error) {
      console.error('Error getting payments by appointment:', error);
      return [];
    }
  }

  // Obtener pagos por usuario
  static async getPaymentsByUser(userId, userType) {
    try {
      const stored = await AsyncStorage.getItem('payments');
      const allPayments = stored ? JSON.parse(stored) : [];
      
      // Necesitamos obtener las citas del usuario para filtrar los pagos
      const appointmentsStored = await AsyncStorage.getItem('appointments');
      const allAppointments = appointmentsStored ? JSON.parse(appointmentsStored) : [];
      
      let userAppointments;
      if (userType === 'client') {
        userAppointments = allAppointments.filter(apt => apt.clientId === userId);
      } else {
        userAppointments = allAppointments.filter(apt => apt.professionalId === userId);
      }
      
      const appointmentIds = userAppointments.map(apt => apt.id);
      
      return allPayments.filter(payment => 
        appointmentIds.includes(payment.appointmentId)
      );
    } catch (error) {
      console.error('Error getting payments by user:', error);
      return [];
    }
  }

  // Actualizar estado del pago
  static async updatePaymentStatus(paymentId, status) {
    try {
      const stored = await AsyncStorage.getItem('payments');
      const allPayments = stored ? JSON.parse(stored) : [];
      
      const paymentIndex = allPayments.findIndex(payment => payment.id === paymentId);
      
      if (paymentIndex === -1) {
        throw new Error('Pago no encontrado');
      }

      allPayments[paymentIndex].status = status;
      allPayments[paymentIndex].updatedAt = new Date();
      
      await AsyncStorage.setItem('payments', JSON.stringify(allPayments));

      // Si el pago fue exitoso, actualizar el estado de la cita
      if (status === 'succeeded') {
        await this.updateAppointmentPaymentStatus(
          allPayments[paymentIndex].appointmentId,
          'paid'
        );
      }

      return allPayments[paymentIndex];
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  // Actualizar estado de pago de la cita
  static async updateAppointmentPaymentStatus(appointmentId, paymentStatus) {
    try {
      const stored = await AsyncStorage.getItem('appointments');
      const allAppointments = stored ? JSON.parse(stored) : [];
      
      const appointmentIndex = allAppointments.findIndex(apt => apt.id === appointmentId);
      
      if (appointmentIndex !== -1) {
        allAppointments[appointmentIndex].paymentStatus = paymentStatus;
        allAppointments[appointmentIndex].updatedAt = new Date();
        
        await AsyncStorage.setItem('appointments', JSON.stringify(allAppointments));
      }
    } catch (error) {
      console.error('Error updating appointment payment status:', error);
    }
  }

  // Procesar pago exitoso
  static async processSuccessfulPayment(paymentId) {
    try {
      const payment = await this.updatePaymentStatus(paymentId, 'succeeded');
      
      // Aquí se podrían agregar más lógicas como:
      // - Enviar confirmación por email
      // - Crear factura
      // - Actualizar inventario
      // - etc.
      
      return payment;
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  // Procesar pago fallido
  static async processFailedPayment(paymentId, reason = '') {
    try {
      const payment = await this.updatePaymentStatus(paymentId, 'failed');
      
      // Aquí se podrían agregar más lógicas como:
      // - Enviar notificación de fallo
      // - Reintentar pago
      // - etc.
      
      return payment;
    } catch (error) {
      console.error('Error processing failed payment:', error);
      throw error;
    }
  }

  // Reembolsar pago
  static async refundPayment(paymentId, reason = '') {
    try {
      const payment = await this.updatePaymentStatus(paymentId, 'refunded');
      
      // Actualizar estado de la cita
      await this.updateAppointmentPaymentStatus(payment.appointmentId, 'refunded');
      
      // Aquí se podrían agregar más lógicas como:
      // - Procesar reembolso en Stripe
      // - Enviar confirmación por email
      // - etc.
      
      return payment;
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }

  // Obtener estadísticas de pagos
  static async getPaymentStats(userId, userType) {
    try {
      const payments = await this.getPaymentsByUser(userId, userType);
      
      const total = payments.length;
      const succeeded = payments.filter(payment => payment.status === 'succeeded').length;
      const failed = payments.filter(payment => payment.status === 'failed').length;
      const pending = payments.filter(payment => payment.status === 'pending').length;
      const refunded = payments.filter(payment => payment.status === 'refunded').length;
      
      const totalAmount = payments
        .filter(payment => payment.status === 'succeeded')
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      const totalRefunded = payments
        .filter(payment => payment.status === 'refunded')
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      const netAmount = totalAmount - totalRefunded;
      
      return {
        total,
        succeeded,
        failed,
        pending,
        refunded,
        totalAmount,
        totalRefunded,
        netAmount,
        successRate: total > 0 ? (succeeded / total) * 100 : 0,
        failureRate: total > 0 ? (failed / total) * 100 : 0,
      };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      return {
        total: 0,
        succeeded: 0,
        failed: 0,
        pending: 0,
        refunded: 0,
        totalAmount: 0,
        totalRefunded: 0,
        netAmount: 0,
        successRate: 0,
        failureRate: 0,
      };
    }
  }

  // Obtener pagos por método de pago
  static async getPaymentsByMethod(paymentMethod) {
    try {
      const stored = await AsyncStorage.getItem('payments');
      const allPayments = stored ? JSON.parse(stored) : [];
      
      return allPayments.filter(payment => payment.paymentMethod === paymentMethod);
    } catch (error) {
      console.error('Error getting payments by method:', error);
      return [];
    }
  }

  // Obtener pagos por rango de fechas
  static async getPaymentsByDateRange(startDate, endDate) {
    try {
      const stored = await AsyncStorage.getItem('payments');
      const allPayments = stored ? JSON.parse(stored) : [];
      
      return allPayments.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return paymentDate >= start && paymentDate <= end;
      });
    } catch (error) {
      console.error('Error getting payments by date range:', error);
      return [];
    }
  }

  // Obtener pagos por estado
  static async getPaymentsByStatus(status) {
    try {
      const stored = await AsyncStorage.getItem('payments');
      const allPayments = stored ? JSON.parse(stored) : [];
      
      return allPayments.filter(payment => payment.status === status);
    } catch (error) {
      console.error('Error getting payments by status:', error);
      return [];
    }
  }

  // Verificar si una cita tiene pago pendiente
  static async hasPendingPayment(appointmentId) {
    try {
      const payments = await this.getPaymentsByAppointment(appointmentId);
      return payments.some(payment => payment.status === 'pending');
    } catch (error) {
      console.error('Error checking pending payment:', error);
      return false;
    }
  }

  // Verificar si una cita tiene pago exitoso
  static async hasSuccessfulPayment(appointmentId) {
    try {
      const payments = await this.getPaymentsByAppointment(appointmentId);
      return payments.some(payment => payment.status === 'succeeded');
    } catch (error) {
      console.error('Error checking successful payment:', error);
      return false;
    }
  }

  // Obtener método de pago más usado
  static async getMostUsedPaymentMethod(userId, userType) {
    try {
      const payments = await this.getPaymentsByUser(userId, userType);
      
      const methodCounts = {};
      payments.forEach(payment => {
        methodCounts[payment.paymentMethod] = (methodCounts[payment.paymentMethod] || 0) + 1;
      });
      
      if (Object.keys(methodCounts).length === 0) {
        return null;
      }
      
      const mostUsed = Object.entries(methodCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      return {
        method: mostUsed[0],
        count: mostUsed[1],
        percentage: (mostUsed[1] / payments.length) * 100
      };
    } catch (error) {
      console.error('Error getting most used payment method:', error);
      return null;
    }
  }

  // Generar reporte de pagos
  static async generatePaymentReport(userId, userType, startDate, endDate) {
    try {
      const payments = await this.getPaymentsByDateRange(startDate, endDate);
      const userPayments = payments.filter(payment => {
        // Filtrar por usuario (esto requiere obtener las citas del usuario)
        const appointmentsStored = await AsyncStorage.getItem('appointments');
        const allAppointments = appointmentsStored ? JSON.parse(appointmentsStored) : [];
        
        let userAppointments;
        if (userType === 'client') {
          userAppointments = allAppointments.filter(apt => apt.clientId === userId);
        } else {
          userAppointments = allAppointments.filter(apt => apt.professionalId === userId);
        }
        
        const appointmentIds = userAppointments.map(apt => apt.id);
        return appointmentIds.includes(payment.appointmentId);
      });
      
      const stats = await this.getPaymentStats(userId, userType);
      const mostUsedMethod = await this.getMostUsedPaymentMethod(userId, userType);
      
      return {
        period: {
          start: startDate,
          end: endDate
        },
        summary: stats,
        payments: userPayments,
        mostUsedMethod,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating payment report:', error);
      throw error;
    }
  }
}

export default PaymentService;

