import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppointments } from '../../contexts/AppointmentContext';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationItem, useNotifications } from '../../contexts/NotificationContext';
import { useReservaConSena } from '../../contexts/ReservaConSenaContext';

function formatAppointmentDateLocal(dateInput: string): string {
  const s = String(dateInput || '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
    const date = new Date(y, m - 1, d);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }
  return String(dateInput || '');
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const {
    notifications,
    markAsRead,
    deleteNotification,
    getUnreadCount,
    getNotificationsForUser,
    clearAllNotifications,
    refreshNotifications,
  } = useNotifications();
  const { confirmAppointment, rejectAppointment, appointments, refreshAppointments } =
    useAppointments();
  const { openReservaConSenaModal } = useReservaConSena();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  
  // Obtener notificaciones del usuario actual
  const userId = String(user?._id || user?.id || '');
  const userNotifications = getNotificationsForUser(userId);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
      await refreshAppointments();
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      'Eliminar notificación',
      '¿Estás seguro de que quieres eliminar esta notificación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteNotification(notificationId),
        },
      ]
    );
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    console.log('🔔 Notificación tocada:', notification.type, notification.title);
    
    // Marcar como leída si no lo está
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.type === 'appointment_request' && notification.appointmentData) {
      setSelectedNotification(notification);
      setShowAppointmentDetail(true);
    } else if (notification.type === 'chat_message') {
      Alert.alert(
        notification.title || 'Mensaje',
        `${notification.message || ''}\n\nEl chat interno fue reemplazado por WhatsApp: abrí la pestaña WhatsApp y elegí al profesional.`,
        [{ text: 'Entendido' }]
      );
    } else if (notification.type === 'payment_required') {
      console.log('💳 Abriendo modal de pago de seña desde notificación');
      console.log('🔍 Notificación completa:', notification);
      
      // Extraer datos de la cita de la notificación
      const appointmentData = notification.appointmentData;
      
      // Abrir el modal de reserva con seña para que pueda pagar
      openReservaConSenaModal(appointmentData);
      
      // NO navegar automáticamente - el modal se mostrará en la pantalla actual
      // router.push('/(tabs)/settings'); // Comentado para evitar navegación automática
    } else if (notification.type === 'password_reset') {
      const t = String(notification.passwordReset?.resetToken || '').trim();
      if (t) {
        router.push({
          pathname: '/reset-password' as never,
          params: { token: t },
        });
      } else {
        Alert.alert(
          'Restablecer contraseña',
          'No hay enlace disponible. Pedí de nuevo "Olvidé mi contraseña" o revisá tu correo.'
        );
      }
    } else {
      console.log('ℹ️ Tipo de notificación no manejado:', notification.type);
      Alert.alert('Notificación', notification.message || 'Mensaje no disponible');
    }
  };

  // Función para encontrar la cita correspondiente a una notificación
  const findAppointmentByNotification = (notification: NotificationItem) => {
    const aid = notification.appointmentData?.appointmentId;
    if (aid) {
      const byId = appointments.find((a) => String(a.id) === String(aid));
      if (byId) return byId;
    }
    return appointments.find(
      (appointment) =>
        appointment.service === notification.appointmentData?.service &&
        appointment.date === notification.appointmentData?.date &&
        appointment.time === notification.appointmentData?.time &&
        (appointment.status === 'pending' ||
          appointment.status === 'pending_approval')
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_request':
        return 'calendar';
      case 'appointment_confirmed':
        return 'checkmark-circle';
      case 'appointment_cancelled':
      case 'appointment_cancelled_by_client':
      case 'appointment_cancelled_by_professional':
        return 'close-circle';
      case 'appointment_rescheduled_by_client':
      case 'appointment_rescheduled_by_professional':
        return 'swap-horizontal';
      case 'reminder':
        return 'time';
      case 'payment_required':
        return 'card';
      case 'chat_message':
        return 'chatbubbles';
      case 'password_reset':
        return 'key';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  // Función para obtener color específico por tipo de notificación
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment_required':
        return '#E91E63'; // Rosa para pagos
      case 'appointment_confirmed':
        return '#4CAF50'; // Verde para confirmaciones
      case 'appointment_cancelled':
      case 'appointment_cancelled_by_client':
      case 'appointment_cancelled_by_professional':
        return '#F44336'; // Rojo para cancelaciones
      case 'appointment_rescheduled_by_client':
      case 'appointment_rescheduled_by_professional':
        return '#FF9800';
      case 'appointment_request':
        return '#2196F3'; // Azul para solicitudes
      case 'reminder':
        return '#FF9800'; // Naranja para recordatorios
      case 'chat_message':
        return '#667eea';
      case 'password_reset':
        return '#7C4DFF';
      default:
        return '#9E9E9E'; // Gris por defecto
    }
  };

  const getUnreadCountForUser = () => getUnreadCount(userId);

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    
    return timestamp.toLocaleDateString('es-ES');
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <Text style={styles.headerSubtitle}>
          {getUnreadCountForUser()} sin leer
        </Text>
      </View>

      {userNotifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No hay notificaciones</Text>
          <Text style={styles.emptySubtitle}>
            Cuando tengas notificaciones, aparecerán aquí
          </Text>
        </View>
      ) : (
        <View style={styles.notificationsContainer}>
          {userNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.read && styles.unreadCard,
              ]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <View style={styles.notificationHeader}>
                <View style={styles.notificationIcon}>
                  <Ionicons
                    name={getNotificationIcon(notification.type) as any}
                    size={24}
                    color={getNotificationColor(notification.type)}
                  />
                </View>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationTitle}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTimeAgo(notification.timestamp)}
                  </Text>
                </View>
                <View style={styles.notificationActions}>
                  {!notification.read && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleMarkAsRead(notification.id)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteNotification(notification.id)}
                  >
                    <Ionicons name="trash" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
              
              {!notification.read && (
                <View style={styles.unreadIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            userNotifications.forEach(notification => {
              if (!notification.read) {
                markAsRead(notification.id);
              }
            });
          }}
        >
          <Ionicons name="checkmark-done" size={20} color="white" />
          <Text style={styles.actionButtonText}>Marcar todas como leídas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => {
            Alert.alert(
              'Limpiar notificaciones',
              '¿Estás seguro de que quieres eliminar todas las notificaciones?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Limpiar',
                  style: 'destructive',
                  onPress: () => clearAllNotifications(userId),
                },
              ]
            );
          }}
        >
          <Ionicons name="trash" size={20} color="#F44336" />
          <Text style={styles.actionButtonText}>Limpiar todas</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Detalle de Cita */}
      <Modal
        visible={showAppointmentDetail}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalle de Solicitud de Cita</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowAppointmentDetail(false);
                setSelectedNotification(null);
              }}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedNotification && selectedNotification.appointmentData && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.appointmentDetailSection}>
                <Text style={styles.detailSectionTitle}>Información del Cliente</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="person" size={20} color="#667eea" />
                  <Text style={styles.detailLabel}>Cliente:</Text>
                  <Text style={styles.detailValue}>{selectedNotification.senderName}</Text>
                </View>
              </View>

              <View style={styles.appointmentDetailSection}>
                <Text style={styles.detailSectionTitle}>Detalles de la Cita</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="medical" size={20} color="#667eea" />
                  <Text style={styles.detailLabel}>Servicio:</Text>
                  <Text style={styles.detailValue}>{selectedNotification.appointmentData.service}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={20} color="#667eea" />
                  <Text style={styles.detailLabel}>Fecha:</Text>
                  <Text style={styles.detailValue}>
                    {formatAppointmentDateLocal(selectedNotification.appointmentData.date)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={20} color="#667eea" />
                  <Text style={styles.detailLabel}>Hora:</Text>
                  <Text style={styles.detailValue}>{selectedNotification.appointmentData.time}</Text>
                </View>
                {selectedNotification.appointmentData.notes && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text" size={20} color="#667eea" />
                    <Text style={styles.detailLabel}>Notas:</Text>
                    <Text style={styles.detailValue}>{selectedNotification.appointmentData.notes}</Text>
                  </View>
                )}
              </View>

              <View style={styles.appointmentDetailSection}>
                <Text style={styles.detailSectionTitle}>Acciones</Text>
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => {
                      Alert.alert(
                        'Confirmar Cita',
                        '¿Estás seguro de que quieres confirmar esta cita?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Confirmar',
                            style: 'default',
                            onPress: async () => {
                              if (selectedNotification) {
                                const appointment = findAppointmentByNotification(selectedNotification);
                                const mongoId =
                                  selectedNotification.appointmentData?.appointmentId ||
                                  appointment?.id;
                                if (mongoId) {
                                  await confirmAppointment(String(mongoId));
                                  await refreshAppointments();
                                  await refreshNotifications();
                                  Alert.alert(
                                    '✅ Cita confirmada',
                                    'La cita quedó confirmada. El cliente verá el aviso en notificaciones.'
                                  );
                                  setShowAppointmentDetail(false);
                                  setSelectedNotification(null);
                                } else {
                                  Alert.alert(
                                    '❌ Error',
                                    'No se pudo identificar la cita. Probá de nuevo.'
                                  );
                                }
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Confirmar Cita</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => {
                      Alert.alert(
                        'Rechazar Cita',
                        '¿Estás seguro de que quieres rechazar esta cita?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Rechazar',
                            style: 'destructive',
                            onPress: async () => {
                              if (selectedNotification) {
                                const appointment = findAppointmentByNotification(selectedNotification);
                                const mongoId =
                                  selectedNotification.appointmentData?.appointmentId ||
                                  appointment?.id;
                                if (mongoId) {
                                  await rejectAppointment(String(mongoId));
                                  await refreshAppointments();
                                  await refreshNotifications();
                                  Alert.alert(
                                    'Cita rechazada',
                                    'Se notificó al cliente que la solicitud no pudo confirmarse.'
                                  );
                                  setShowAppointmentDetail(false);
                                  setSelectedNotification(null);
                                } else {
                                  Alert.alert(
                                    '❌ Error',
                                    'No se pudo identificar la cita.'
                                  );
                                }
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Rechazar Cita</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  notificationsContainer: {
    padding: 20,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    backgroundColor: '#f8f9ff',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  notificationActionButton: {
    padding: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea',
  },
  actionsSection: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#F44336',
  },
  // Estilos para el modal de detalle de cita
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  appointmentDetailSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  actionButtonsContainer: {
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
});
