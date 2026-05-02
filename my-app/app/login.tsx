import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthGuard from '../components/AuthGuard';
import GoogleIcon from '../components/GoogleIcon';
import { getBackendBaseUrl } from '../config/backend';
import { useAuth } from '../contexts/AuthContext';
import { useAppleSignIn } from '../hooks/useAppleSignIn';
import { useGoogleIdTokenLogin } from '../hooks/useGoogleIdTokenLogin';
import {
  checkGoogleAccountExists,
  decodeGoogleIdTokenPayload,
  exchangeGoogleIdToken,
} from '../services/socialAuthService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const modalActionPaddingBottom =
    Platform.OS === 'android'
      ? Math.max(insets.bottom + 24, 44)
      : Math.max(insets.bottom + 12, 24);
  const { login, applyAuthResponse, isAuthenticated, isLoading } = useAuth();
  const googleAuth = useGoogleIdTokenLogin();
  const appleAuth = useAppleSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  // Estados para el modal de recuperación de contraseña
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'sent' | 'error'>('email');

  const handleLogin = async () => {
    Keyboard.dismiss();
    setLoginError(null);
    const emailTrim = email.trim();
    if (!emailTrim || !password) {
      setLoginError('Ingresá email y contraseña.');
      return;
    }
    if (!EMAIL_RE.test(emailTrim)) {
      setLoginError('Ingresá un email válido.');
      return;
    }

    setIsLoginLoading(true);

    try {
      await login({ email: emailTrim, password });
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error en login:', error);
      const message =
        error instanceof Error ? error.message : 'No se pudo iniciar sesión. Intentá de nuevo.';
      setLoginError(message);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  const handleForgotPassword = () => {
    setForgotPasswordEmail('');
    setForgotPasswordStep('email');
    setShowForgotPasswordModal(true);
  };

  const handleSendResetEmail = async () => {
    Keyboard.dismiss();
    const emailTrim = forgotPasswordEmail.trim().toLowerCase();
    if (!emailTrim) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    if (!EMAIL_RE.test(emailTrim)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    setIsForgotPasswordLoading(true);

    const url = `${getBackendBaseUrl()}/api/v1/auth/forgot-password`;
    const controller = new AbortController();
    const timeoutMs = 25000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: emailTrim }),
        signal: controller.signal,
      });
      let body: { message?: string } = {};
      try {
        body = (await response.json()) as { message?: string };
      } catch {
        // no-op
      }
      if (!response.ok) {
        throw new Error(body.message || 'No pudimos enviar el email de recuperación.');
      }

      setForgotPasswordStep('sent');
    } catch (error) {
      console.error('💥 Error enviando email de recuperación:', error);
      let message = 'No pudimos enviar el email de recuperación.';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = `La solicitud tardó demasiado o no hubo conexión. Comprobá la red y que el backend esté en:\n${url}`;
        } else {
          message = error.message;
        }
      }
      Alert.alert('Error', message);
      setForgotPasswordStep('error');
    } finally {
      clearTimeout(timeoutId);
      setIsForgotPasswordLoading(false);
    }
  };

  const handleCloseForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordEmail('');
    setForgotPasswordStep('email');
    setIsForgotPasswordLoading(false);
  };

  const handleResendEmail = () => {
    setForgotPasswordStep('email');
    setForgotPasswordEmail('');
  };

  const runAfterSocialConfirm = (
    title: string,
    message: string,
    action: () => Promise<void>,
    confirmLabel: string = 'Continuar'
  ) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: confirmLabel,
        onPress: () => {
          void action();
        },
      },
    ]);
  };

  const handleGoogleLogin = async () => {
    if (!googleAuth.configured) {
      Alert.alert(
        'Configurar Google',
        `${googleAuth.configError ?? 'Falta configuración de Google Sign-In.'}\n\nEn Expo Go alcanza con EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID real (Google Cloud → credenciales OAuth cliente Web) y la URI de redirección de Expo en ese cliente.\n\nEn APK o dev build nativo en Android también necesitás EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (SHA-1 de la firma en Google Cloud) para la hoja nativa de cuentas.`
      );
      return;
    }
    if (!googleAuth.ready) {
      Alert.alert('Esperá un momento', 'Google Sign-In se está preparando. Probá de nuevo en unos segundos.');
      return;
    }
    setIsGoogleLoading(true);
    try {
      const idToken = await googleAuth.getIdToken();
      const { sub, email, fullName } = decodeGoogleIdTokenPayload(idToken);
      const exists = await checkGoogleAccountExists(sub, email);
      let userType: 'client' | 'professional' | undefined;
      if (!exists) {
        userType = await new Promise<'client' | 'professional'>((resolve, reject) => {
          Alert.alert(
            'Cuenta nueva en Turnario',
            `No hay una cuenta Turnario vinculada a tu Google. Se creará una con tu nombre y email (${fullName || email}).\n\n¿Vas a usar la app como cliente/paciente o como profesional?`,
            [
              {
                text: 'Cancelar',
                style: 'cancel',
                onPress: () => reject(new Error('CANCELLED')),
              },
              {
                text: 'Cliente / paciente',
                onPress: () => resolve('client'),
              },
              {
                text: 'Profesional',
                onPress: () => resolve('professional'),
              },
            ]
          );
        });
      }
      const res = await exchangeGoogleIdToken(idToken, userType);
      applyAuthResponse(res);
      router.replace('/(tabs)');
    } catch (error) {
      if (error instanceof Error && error.message === 'CANCELLED') {
        return;
      }
      if (error instanceof Error && error.message === 'MISSING_GOOGLE_CONFIG') {
        return;
      }
      const message =
        error instanceof Error ? error.message : 'No se pudo iniciar sesión con Google.';
      Alert.alert('Error', message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleLogin = () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Solo en iPhone o iPad',
        'Iniciar sesión con Apple está disponible en la app instalada en iOS.'
      );
      return;
    }
    runAfterSocialConfirm(
      'Iniciar sesión con Apple',
      'Apple te pedirá confirmar con Face ID, Touch ID o código. La cuenta que uses quedará asociada a Turnario.',
      async () => {
        setIsAppleLoading(true);
        try {
          const res = await appleAuth.signIn();
          applyAuthResponse(res);
          router.replace('/(tabs)');
        } catch (error) {
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            (error as { code: string }).code === 'ERR_REQUEST_CANCELED'
          ) {
            return;
          }
          const message =
            error instanceof Error ? error.message : 'No se pudo iniciar sesión con Apple.';
          Alert.alert('Error', message);
        } finally {
          setIsAppleLoading(false);
        }
      }
    );
  };

  return (
    <AuthGuard>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Turnario</Text>
          <Text style={styles.subtitle}>Gestiona tus citas de manera fácil</Text>
        </View>

        <View style={styles.formContainer}>
          {loginError ? (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={22} color="#B91C1C" style={styles.errorBannerIcon} />
              <Text style={styles.errorBannerText}>{loginError}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={(t) => {
                setLoginError(null);
                setEmail(t);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!isLoginLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#999"
              value={password}
              onChangeText={(t) => {
                setLoginError(null);
                setPassword(t);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void handleLogin()}
              editable={!isLoginLoading}
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

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => {
              Keyboard.dismiss();
              handleForgotPassword();
            }}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoginLoading && styles.loginButtonDisabled]}
            onPress={() => void handleLogin()}
            disabled={isLoginLoading}
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoginLoading }}
          >
            {isLoginLoading ? (
              <View style={styles.loginButtonRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.loginButtonText, styles.loginButtonTextSpaced]}>
                  Iniciando sesión…
                </Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.googleButton,
              (isGoogleLoading || (googleAuth.configured && !googleAuth.ready)) &&
                styles.googleButtonDisabled,
            ]}
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading || (googleAuth.configured && !googleAuth.ready)}
          >
            <View style={styles.googleIconContainer}>
              <GoogleIcon size={20} />
            </View>
            {isGoogleLoading ? (
              <Text style={styles.googleButtonText}>Conectando...</Text>
            ) : googleAuth.configured && !googleAuth.ready ? (
              <Text style={styles.googleButtonText}>Preparando...</Text>
            ) : (
              <Text style={styles.googleButtonText}>Google</Text>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' ? (
            <TouchableOpacity
              style={[styles.appleButton, isAppleLoading && styles.appleButtonDisabled]}
              onPress={handleAppleLogin}
              disabled={isAppleLoading}
            >
              <View style={styles.appleIconContainer}>
                <Ionicons name="logo-apple" size={20} color="#ffffff" />
              </View>
              {isAppleLoading ? (
                <>
                  <View style={styles.loadingSpinner}>
                    <Ionicons name="refresh" size={16} color="#ffffff" />
                  </View>
                  <Text style={styles.appleButtonText}>Conectando...</Text>
                </>
              ) : (
                <Text style={styles.appleButtonText}>Apple</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
          >
            <Text style={styles.registerButtonText}>Crear Cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Al continuar, aceptas nuestros{' '}
            <Text 
              style={styles.linkText}
              onPress={() => router.push('/terms-and-conditions')}
            >
              Términos y Condiciones
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* Modal de Recuperación de Contraseña */}
      <Modal
        visible={showForgotPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseForgotPasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseForgotPasswordModal}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Recuperar Contraseña</Text>
            </View>

            {forgotPasswordStep === 'email' && (
              <View style={styles.modalContent}>
                <Text style={styles.modalDescription}>
                  Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </Text>
                
                <View style={styles.modalInputContainer}>
                  <Ionicons name="mail" size={20} color="#666" style={styles.modalInputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={forgotPasswordEmail}
                    onChangeText={setForgotPasswordEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, isForgotPasswordLoading && styles.modalButtonDisabled]}
                  onPress={() => void handleSendResetEmail()}
                  disabled={isForgotPasswordLoading}
                  activeOpacity={0.85}
                >
                  {isForgotPasswordLoading ? (
                    <View style={styles.modalButtonLoadingRow}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={[styles.modalButtonText, styles.modalButtonTextSpaced]}>Enviando…</Text>
                    </View>
                  ) : (
                    <Text style={styles.modalButtonText}>Enviar Enlace</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {forgotPasswordStep === 'sent' && (
              <View style={styles.modalContent}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={60} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>¡Email Enviado!</Text>
                <Text style={styles.successDescription}>
                  Hemos enviado un enlace de recuperación a{'\n'}
                  <Text style={styles.emailText}>{forgotPasswordEmail}</Text>
                </Text>
                <Text style={styles.successInstructions}>
                  Revisá tu bandeja de entrada y seguí las instrucciones para restablecer tu contraseña.
                </Text>
                
                <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setShowForgotPasswordModal(false);
                      router.push({
                        pathname: '/reset-password' as never,
                        params: { token: '' },
                      });
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Ya tengo token</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleResendEmail}
                  >
                    <Text style={styles.secondaryButtonText}>Reenviar Email</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleCloseForgotPasswordModal}
                  >
                    <Text style={styles.primaryButtonText}>Entendido</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {forgotPasswordStep === 'error' && (
              <View style={styles.modalContent}>
                <View style={styles.errorIconContainer}>
                  <Ionicons name="alert-circle" size={60} color="#EF4444" />
                </View>
                <Text style={styles.errorTitle}>Error al Enviar</Text>
                <Text style={styles.errorDescription}>
                  No pudimos enviar el email de recuperación. Por favor, verifica tu email e intenta nuevamente.
                </Text>
                
                <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleResendEmail}
                  >
                    <Text style={styles.secondaryButtonText}>Intentar Nuevamente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleCloseForgotPasswordModal}
                  >
                    <Text style={styles.primaryButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    minHeight: '100%',
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  title: {
    fontSize: 32,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  errorBannerText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
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
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
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
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButtonTextSpaced: {
    marginLeft: 10,
  },
  googleButton: {
    backgroundColor: 'white',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dadce0',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 40,
  },
  googleButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#3c4043',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    fontFamily: 'Roboto, sans-serif',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 48,
  },
  appleIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  appleButtonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.7,
  },
  appleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e1e1e1',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  registerButton: {
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#667eea',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },

  // Estilos para el modal de recuperación de contraseña
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 28, // Compensar el botón de cerrar
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  modalInputIcon: {
    marginRight: 12,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 16,
  },
  modalButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonTextSpaced: {
    marginLeft: 10,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 16,
  },
  successDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  emailText: {
    fontWeight: '600',
    color: '#333',
  },
  successInstructions: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
