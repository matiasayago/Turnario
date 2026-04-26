// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { simpleAuthService } from '../services/simpleAuthService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    userType: 'client' as 'client' | 'professional',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [emailOk, setEmailOk] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const runEmailAvailabilityCheck = useCallback(async (email: string) => {
    const t = email.trim();
    if (!EMAIL_RE.test(t)) {
      setEmailTaken(false);
      setEmailOk(false);
      setEmailCheckLoading(false);
      return;
    }
    setEmailCheckLoading(true);
    try {
      const taken = await simpleAuthService.isEmailAlreadyRegistered(t);
      setEmailTaken(taken);
      setEmailOk(!taken);
    } finally {
      setEmailCheckLoading(false);
    }
  }, []);

  const onEmailChange = (value: string) => {
    updateFormData('email', value);
    setEmailTaken(false);
    setEmailOk(false);
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    emailDebounceRef.current = setTimeout(() => {
      runEmailAvailabilityCheck(value);
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    };
  }, []);

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu nombre completo');
      return false;
    }

    if (!EMAIL_RE.test(formData.email.trim())) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }

    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu número de teléfono');
      return false;
    }

    return true;
  };

  const submitRegistration = async () => {
    const emailNorm = formData.email.trim().toLowerCase();
    setIsLoading(true);
    try {
      await register({
        email: emailNorm,
        fullName: formData.fullName,
        password: formData.password,
        phone: formData.phone,
        userType: formData.userType,
      });
      router.replace('/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo crear la cuenta. Intentá nuevamente.';
      if (/registrado|EMAIL_EXISTS|DUPLICATE_KEY|correo ya|ya está en uso/i.test(message)) {
        setEmailTaken(true);
        setEmailOk(false);
      }
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    const emailNorm = formData.email.trim().toLowerCase();
    setEmailCheckLoading(true);
    let taken = false;
    try {
      taken = await simpleAuthService.isEmailAlreadyRegistered(emailNorm);
    } finally {
      setEmailCheckLoading(false);
    }
    setEmailTaken(taken);
    setEmailOk(!taken);
    if (taken) {
      Alert.alert(
        'Email ya registrado',
        'Este correo ya está en uso. Iniciá sesión o usá otro email.'
      );
      return;
    }

    Alert.alert(
      'Confirmación por correo',
      `Te vamos a enviar un mensaje a ${emailNorm} para confirmar la creación de tu cuenta. Revisá tu bandeja de entrada y, si no lo ves, la carpeta de spam.\n\n¿Querés continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, crear cuenta', onPress: () => void submitRegistration() },
      ]
    );
  };

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
            <Ionicons name="arrow-back" size={24} color="#667eea" />
          </TouchableOpacity>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Únete a Turnario</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nombre Completo"
              placeholderTextColor="#999"
              value={formData.fullName}
              onChangeText={(value) => updateFormData('fullName', value)}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={onEmailChange}
              onBlur={() => runEmailAvailabilityCheck(formData.email)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailCheckLoading ? (
              <ActivityIndicator size="small" color="#667eea" style={styles.emailSpinner} />
            ) : null}
          </View>
          {EMAIL_RE.test(formData.email.trim()) &&
          (emailCheckLoading || emailTaken || emailOk) ? (
            <Text
              style={[styles.emailHint, emailTaken ? styles.emailHintError : styles.emailHintOk]}
            >
              {emailCheckLoading
                ? 'Verificando disponibilidad…'
                : emailTaken
                  ? 'Este correo ya está registrado. Iniciá sesión o usá otro email.'
                  : 'Este email está disponible.'}
            </Text>
          ) : null}

          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Teléfono"
              placeholderTextColor="#999"
              value={formData.phone}
              onChangeText={(value) => updateFormData('phone', value)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#999"
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              placeholderTextColor="#999"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.userTypeContainer}>
            <Text style={styles.userTypeLabel}>Tipo de Usuario:</Text>
            <View style={styles.userTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  formData.userType === 'client' && styles.userTypeButtonActive
                ]}
                onPress={() => updateFormData('userType', 'client')}
              >
                <Ionicons 
                  name="person" 
                  size={20} 
                  color={formData.userType === 'client' ? 'white' : '#667eea'} 
                />
                <Text style={[
                  styles.userTypeButtonText,
                  formData.userType === 'client' && styles.userTypeButtonTextActive
                ]}>
                  Cliente
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  formData.userType === 'professional' && styles.userTypeButtonActive
                ]}
                onPress={() => updateFormData('userType', 'professional')}
              >
                <Ionicons 
                  name="briefcase" 
                  size={20} 
                  color={formData.userType === 'professional' ? 'white' : '#667eea'} 
                />
                <Text style={[
                  styles.userTypeButtonText,
                  formData.userType === 'professional' && styles.userTypeButtonTextActive
                ]}>
                  Profesional
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.registerButton,
              (isLoading || emailTaken) && styles.registerButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={isLoading || emailTaken}
          >
            {isLoading ? (
              <Text style={styles.registerButtonText}>Creando Cuenta...</Text>
            ) : (
              <Text style={styles.registerButtonText}>Crear Cuenta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={handleBackToLogin}
          >
            <Text style={styles.loginLinkText}>
              ¿Ya tienes cuenta? <Text style={styles.linkText}>Iniciar sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Al crear una cuenta, aceptás nuestros{' '}
            <Text style={styles.linkText}>Términos y Condiciones</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 16,
  },
  emailSpinner: {
    marginLeft: 4,
  },
  emailHint: {
    fontSize: 13,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  emailHintOk: {
    color: '#2e7d32',
  },
  emailHintError: {
    color: '#c62828',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
  },
  userTypeContainer: {
    marginBottom: 24,
  },
  userTypeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 8,
    gap: 8,
  },
  userTypeButtonActive: {
    backgroundColor: '#667eea',
  },
  userTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#667eea',
  },
  userTypeButtonTextActive: {
    color: 'white',
  },
  registerButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButtonDisabled: {
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#666',
    fontSize: 14,
  },
  linkText: {
    color: '#667eea',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
