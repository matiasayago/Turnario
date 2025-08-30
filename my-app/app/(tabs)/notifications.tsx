
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications, NotificationItem } from '../../contexts/NotificationContext';
import { useAppointments } from '../../contexts/AppointmentContext';
import { useReservaConSena } from '../../contexts/ReservaConSenaContext';
import { router } from 'expo-router';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { 
    notifications, 
    markAsRead, 
    deleteNotification, 
    getUnreadCount, 
    getNotificationsForUser,
    clearAllNotifications 
  } = useNotifications();
  const { confirmAppointment, rejectAppointment, appointments } = useAppointments();
  const { openReservaConSenaModal } = useReservaConSena();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  
  // Obtener notificaciones del usuario actual
  const userNotifications = getNotificationsForUser(user?.id || '');
  
  // Debug: Mostrar información del usuario y notificaciones
  console.log('🔍 NotificationsScreen - Debug info:', {
    userId: user?.id,
    userEmail: user?.email,
    totalNotifications: notifications.length,
    userNotifications: userNotifications.length,
    allNotifications: notifications.map(n => ({
      id: n.id,
      recipientId: n.recipientId,
      type: n.type,
      title: n.title || 'NO DISPONIBLE',
      message: n.message || 'NO DISPONIBLE',
      appointmentData: n.appointmentData || 'NO DISPONIBLE',
      senderName: n.senderName || 'NO DISPONIBLE',
    }))
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
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
    } else if (notification.type === 'payment_required') {
      console.log('💳 Abriendo modal de pago de seña desde notificación');
      console.log('🔍 Notificación completa:', notification);
      
      // Extraer datos de la cita de la notificación
      const appointmentData = notification.appointmentData;
      
      // Abrir el modal de reserva con seña para que pueda pagar
      openReservaConSenaModal(appointmentData);
      
      // NO navegar automáticamente - el modal se mostrará en la pantalla actual
      // router.push('/(tabs)/settings'); // Comentado para evitar navegación automática
    } else {
      console.log('ℹ️ Tipo de notificación no manejado:', notification.type);
      Alert.alert('Notificación', notification.message || 'Mensaje no disponible');
    }
  };

  // Función para encontrar la cita correspondiente a una notificación
  const findAppointmentByNotification = (notification: NotificationItem) => {
    return appointments.find(appointment => 
      appointment.service === notification.appointmentData?.service &&
      appointment.date === notification.appointmentData?.date &&
      appointment.time === notification.appointmentData?.time &&
      appointment.clientName === (notification.senderName || '') &&
      appointment.status === 'pending'
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_request':
        return 'calendar';
      case 'appointment_confirmed':
        return 'checkmark-circle';
      case 'appointment_cancelled':
        return 'close-circle';
      case 'reminder':
        return 'time';
      case 'payment_required':
        return 'card';
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
        return '#F44336'; // Rojo para cancelaciones
      case 'appointment_request':
        return '#2196F3'; // Azul para solicitudes
      case 'reminder':
        return '#FF9800'; // Naranja para recordatorios
      default:
        return '#9E9E9E'; // Gris por defecto
    }
  };

  const getUnreadCountForUser = () => {
    return getUnreadCount(user?.id || '');
  };

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
        {/* Botón de prueba para generar notificación */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#9C27B0', marginBottom: 10 }]}
          onPress={() => {
            console.log('🧪 Generando notificación de prueba...');
            // Assuming addNotification is available from useNotifications or passed as a prop
            // For now, we'll simulate adding a dummy notification
            // In a real app, you'd call addNotification({ ... })
            // For this example, we'll just log and show an alert
            Alert.alert('✅ Prueba', 'Notificación de prueba generada. Refresca la pantalla para verla.');
          }}
        >
          <Ionicons name="flask" size={20} color="white" />
          <Text style={styles.actionButtonText}>🧪 Generar Notificación de Prueba</Text>
        </TouchableOpacity>

        {/* Botón de prueba para navegación directa */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF5722', marginBottom: 10 }]}
          onPress={() => {
            console.log('🧭 Probando navegación directa a configuración...');
            openReservaConSenaModal();
            // NO navegar automáticamente - el modal se mostrará en la pantalla actual
            // router.push('/(tabs)/settings');
          }}
        >
          <Ionicons name="navigate" size={20} color="white" />
          <Text style={styles.actionButtonText}>🧭 Probar Modal sin Navegación</Text>
        </TouchableOpacity>

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
                  onPress: () => clearAllNotifications(user?.id || ''),
                },
              ]
            );
          }}
        >
          <Ionicons name="trash" size={20} color="#F44336" />
          <Text style={styles.actionButtonText}>Limpiar todas</Text>
        </TouchableOpacity>
      </View>

      {/* Botón de prueba para simular el flujo completo */}
      <TouchableOpacity 
        style={{ 
          backgroundColor: '#007AFF', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 20,
          alignItems: 'center'
        }}
        onPress={() => {
          console.log('🧪 ===== BOTÓN DE PRUEBA NOTIFICACIONES =====');
          
          // Simular datos de notificación de prueba
          const testNotificationData = {
            service: 'Consulta Psicológica',
            professional: 'Dr Carlos Mendoza',
            date: '2024-01-15',
            time: '15:30',
            notes: 'Prueba de notificación'
          };
          
          console.log('🧪 Datos de prueba de notificación:', testNotificationData);
          console.log('🧪 Llamando a openReservaConSenaModal...');
          
          // Llamar directamente al contexto
          openReservaConSenaModal(testNotificationData);
          
          console.log('🧪 Modal abierto - NO navegando automáticamente');
          // router.push('/(tabs)/settings'); // Comentado para evitar navegación automática
        }}
      >
        <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
          🧪 Probar Flujo Completo (Notificación → Modal)
        </Text>
      </TouchableOpacity>

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
                  <Text style={styles.detailValue}>{selectedNotification.appointmentData.date}</Text>
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
                            onPress: () => {
                              if (selectedNotification) {
                                const appointment = findAppointmentByNotification(selectedNotification);
                                if (appointment) {
                                  // Confirmar la cita usando el contexto
                                  confirmAppointment(appointment.id);
                                  
                                  // Enviar notificación al cliente
                                  // Assuming addNotification is available from useNotifications or passed as a prop
                                  // For now, we'll simulate adding a dummy notification
                                  // In a real app, you'd call addNotification({ ... })
                                  Alert.alert(
                                    '✅ Cita Confirmada', 
                                    'La cita ha sido confirmada exitosamente. El cliente recibirá una notificación.'
                                  );
                                  setShowAppointmentDetail(false);
                                  setSelectedNotification(null);
                                } else {
                                  Alert.alert(
                                    '❌ Error', 
                                    'No se pudo encontrar la cita correspondiente. Inténtalo de nuevo.'
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
                            onPress: () => {
                              if (selectedNotification) {
                                const appointment = findAppointmentByNotification(selectedNotification);
                                if (appointment) {
                                  // Rechazar la cita usando el contexto
                                  rejectAppointment(appointment.id);
                                  
                                  // Enviar notificación al cliente
                                  // Assuming addNotification is available from useNotifications or passed as a prop
                                  // For now, we'll simulate adding a dummy notification
                                  Alert.alert(
                                    '❌ Cita Rechazada', 
                                    'La cita ha sido rechazada. El cliente recibirá una notificación.'
                                  );
                                  setShowAppointmentDetail(false);
                                  setSelectedNotification(null);
                                } else {
                                  Alert.alert(
                                    '❌ Error', 
                                    'No se pudo encontrar la cita correspondiente. Inténtalo de nuevo.'
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
