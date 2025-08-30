import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { TurnarioLogo } from '../components/TurnarioLogo';

const { width } = Dimensions.get('window');

export const ProfileScreen = ({ navigation }) => {
  const { user, updateProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    userType: '',
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        userType: user.userType || 'client',
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      userType: user?.userType || 'client',
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleQuickChangeUserType = async (newUserType) => {
    try {
      const newFormData = { ...formData, userType: newUserType };
      await updateProfile(newFormData);
      Alert.alert('Éxito', `Tipo de perfil cambiado a: ${getUserTypeLabel(newUserType)}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el tipo de perfil');
    }
  };

  const getUserTypeLabel = (userType) => {
    switch (userType) {
      case 'client':
        return 'Paciente';
      case 'professional':
        return 'Profesional';
      default:
        return 'Paciente';
    }
  };

  const getUserTypeIcon = (userType) => {
    switch (userType) {
      case 'client':
        return 'person';
      case 'professional':
        return 'briefcase';
      default:
        return 'person';
    }
  };

  const getUserTypeDescription = (userType) => {
    switch (userType) {
      case 'client':
        return 'Reserva citas y servicios';
      case 'professional':
        return 'Gestiona horarios y citas';
      default:
        return 'Reserva citas y servicios';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TurnarioLogo size="medium" />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons
              name={isEditing ? 'close' : 'create'}
              size={24}
              color={isEditing ? '#ff6b6b' : '#667eea'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Picture Section */}
      <View style={styles.profilePictureSection}>
        <View style={styles.profilePicture}>
          <Ionicons name="person" size={60} color="#667eea" />
        </View>
        <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'usuario@email.com'}</Text>
        
        {/* Cambio Rápido de Tipo de Usuario */}
        <View style={styles.quickChangeSection}>
          <View style={styles.currentUserType}>
            <Ionicons 
              name={getUserTypeIcon(user?.userType)} 
              size={20} 
              color="#667eea" 
            />
            <Text style={styles.currentUserTypeText}>
              {getUserTypeLabel(user?.userType)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.quickChangeButton}
            onPress={() => handleQuickChangeUserType(user?.userType === 'client' ? 'professional' : 'client')}
          >
            <Ionicons name="swap-horizontal" size={16} color="white" />
            <Text style={styles.quickChangeButtonText}>
              Cambiar a {user?.userType === 'client' ? 'Profesional' : 'Paciente'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Debug Info */}
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Estado: {isAuthenticated ? 'Autenticado' : 'No autenticado'}</Text>
          <Text style={styles.debugText}>Tipo: {user?.userType || 'No definido'}</Text>
          <Text style={styles.debugText}>ID: {user?.id || 'No definido'}</Text>
        </View>
      </View>

      {/* Profile Form */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Información Personal</Text>

        {/* Tipo de Perfil */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-circle" size={20} color="#666" style={styles.inputIcon} />
          <Text style={styles.inputLabel}>Tipo de Usuario</Text>
          {isEditing ? (
            <View style={styles.userTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  formData.userType === 'client' && styles.userTypeButtonActive
                ]}
                onPress={() => setFormData(prev => ({ ...prev, userType: 'client' }))}
              >
                <View style={styles.userTypeButtonContent}>
                  <Ionicons
                    name="person"
                    size={24}
                    color={formData.userType === 'client' ? '#667eea' : '#666'}
                  />
                  <View style={styles.userTypeTextContainer}>
                    <Text
                      style={[
                        styles.userTypeText,
                        formData.userType === 'client' && styles.userTypeTextActive
                      ]}
                    >
                      Paciente
                    </Text>
                    <Text style={styles.userTypeDescription}>
                      Reserva citas y servicios
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  formData.userType === 'professional' && styles.userTypeButtonActive
                ]}
                onPress={() => setFormData(prev => ({ ...prev, userType: 'professional' }))}
              >
                <View style={styles.userTypeButtonContent}>
                  <Ionicons
                    name="briefcase"
                    size={24}
                    color={formData.userType === 'professional' ? '#667eea' : '#666'}
                  />
                  <View style={styles.userTypeTextContainer}>
                    <Text
                      style={[
                        styles.userTypeText,
                        formData.userType === 'professional' && styles.userTypeTextActive
                      ]}
                    >
                      Profesional
                    </Text>
                    <Text style={styles.userTypeDescription}>
                      Gestiona horarios y citas
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.userTypeDisplay}>
              <View style={styles.userTypeDisplayContent}>
                <Ionicons
                  name={getUserTypeIcon(user?.userType)}
                  size={24}
                  color="#667eea"
                />
                <View style={styles.userTypeDisplayText}>
                  <Text style={styles.userTypeDisplayLabel}>
                    {getUserTypeLabel(user?.userType)}
                  </Text>
                  <Text style={styles.userTypeDisplayDescription}>
                    {getUserTypeDescription(user?.userType)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Información del Tipo de Usuario */}
        <View style={styles.userTypeInfo}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#667eea" />
            <Text style={styles.infoTitle}>¿Qué puedes hacer como {getUserTypeLabel(formData.userType)}?</Text>
          </View>
          <View style={styles.infoContent}>
            {formData.userType === 'client' ? (
              <>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar" size={16} color="#4CAF50" />
                  <Text style={styles.infoText}>Reservar citas con profesionales</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="search" size={16} color="#2196F3" />
                  <Text style={styles.infoText}>Explorar servicios disponibles</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="time" size={16} color="#FF9800" />
                  <Text style={styles.infoText}>Gestionar tus turnos programados</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar" size={16} color="#4CAF50" />
                  <Text style={styles.infoText}>Configurar horarios de trabajo</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="people" size={16} color="#2196F3" />
                  <Text style={styles.infoText}>Gestionar citas de clientes</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="analytics" size={16} color="#FF9800" />
                  <Text style={styles.infoText}>Ver estadísticas de productividad</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Nombre */}
        <View style={styles.inputContainer}>
          <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
          <Text style={styles.inputLabel}>Nombre Completo</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Ingresa tu nombre completo"
              autoCapitalize="words"
            />
          ) : (
            <Text style={styles.inputDisplay}>{user?.name || 'No especificado'}</Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
          <Text style={styles.inputLabel}>Correo Electrónico</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholder="Ingresa tu correo electrónico"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.inputDisplay}>{user?.email || 'No especificado'}</Text>
          )}
        </View>

        {/* Teléfono */}
        <View style={styles.inputContainer}>
          <Ionicons name="call" size={20} color="#666" style={styles.inputIcon} />
          <Text style={styles.inputLabel}>Teléfono</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              placeholder="Ingresa tu número de teléfono"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.inputDisplay}>{user?.phone || 'No especificado'}</Text>
          )}
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Configuración</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={20} color="#666" />
            <Text style={styles.settingText}>Notificaciones</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#e1e1e1', true: '#667eea' }}
            thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon" size={20} color="#666" />
            <Text style={styles.settingText}>Modo Oscuro</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: '#e1e1e1', true: '#667eea' }}
            thumbColor={darkModeEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Test Section - Cambio Rápido de Tipo de Usuario */}
      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Pruebas - Cambio de Tipo</Text>
        <Text style={styles.testDescription}>
          Cambia rápidamente entre tipos de usuario para probar la funcionalidad
        </Text>
        
        <View style={styles.testButtons}>
          <TouchableOpacity 
            style={[styles.testButton, styles.testButtonClient]}
            onPress={() => handleQuickChangeUserType('client')}
          >
            <Ionicons name="person" size={20} color="white" />
            <Text style={styles.testButtonText}>Cambiar a Paciente</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testButton, styles.testButtonProfessional]}
            onPress={() => handleQuickChangeUserType('professional')}
          >
            <Ionicons name="briefcase" size={20} color="white" />
            <Text style={styles.testButtonText}>Cambiar a Profesional</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#ff6b6b" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 5,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  profilePictureSection: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  quickChangeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentUserType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentUserTypeText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500',
  },
  quickChangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#667eea',
    borderRadius: 8,
    gap: 5,
  },
  quickChangeButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  debugInfo: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  formSection: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  inputDisplay: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  userTypeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    gap: 8,
  },
  userTypeButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#667eea20',
  },
  userTypeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userTypeTextContainer: {
    flex: 1,
  },
  userTypeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  userTypeTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  userTypeDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  userTypeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    gap: 8,
  },
  userTypeDisplayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userTypeDisplayText: {
    flex: 1,
  },
  userTypeDisplayLabel: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500',
  },
  userTypeDisplayDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#667eea',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  settingsSection: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  testSection: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  testButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  testButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonClient: {
    backgroundColor: '#667eea',
  },
  testButtonProfessional: {
    backgroundColor: '#4CAF50',
  },
  testButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    marginTop: 8,
  },
  logoutSection: {
    margin: 15,
    marginBottom: 30,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#ff6b6b',
    fontWeight: '600',
  },
  userTypeInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  infoContent: {
    gap: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
});
