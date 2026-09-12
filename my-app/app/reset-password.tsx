import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getBackendBaseUrl } from '../config/backend';

const MIN_PASSWORD_LENGTH = 6;

function extractTokenFromUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams || {};
    const raw = q.token;
    if (Array.isArray(raw)) return String(raw[0] || '').trim();
    if (raw != null) return String(raw).trim();
  } catch {
    // no-op
  }
  const m = url.match(/[?&#]token=([^&#]+)/i);
  if (m) {
    try {
      return decodeURIComponent(m[1]).trim();
    } catch {
      return m[1].trim();
    }
  }
  return '';
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    token?: string | string[];
  }>();
  const tokenFromParams = useMemo(() => {
    const raw = params.token;
    if (Array.isArray(raw)) return String(raw[0] || '').trim();
    return String(raw || '').trim();
  }, [params.token]);

  const [token, setToken] = useState(tokenFromParams);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tokenFromParams) setToken(tokenFromParams);
  }, [tokenFromParams]);

  // Deep link / cold start: myapp://reset-password?token=...
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    (async () => {
      try {
        const initial = await Linking.getInitialURL();
        const fromInitial = extractTokenFromUrl(initial);
        if (fromInitial) setToken(fromInitial);
      } catch {
        // no-op
      }
      sub = Linking.addEventListener('url', ({ url }) => {
        const fromEvent = extractTokenFromUrl(url);
        if (fromEvent) setToken(fromEvent);
      });
    })();
    return () => {
      sub?.remove();
    };
  }, []);

  const hasToken = Boolean(String(token || '').trim());

  const handleResetPassword = async () => {
    const cleanToken = String(token || '').trim();

    if (!cleanToken) {
      Alert.alert(
        'Enlace inválido',
        'Abrí el enlace del email de recuperación. Si expiró, pedí uno nuevo desde el login.'
      );
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Error', `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${getBackendBaseUrl()}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ token: cleanToken, password }),
      });

      let resBody: { message?: string } = {};
      try {
        resBody = (await response.json()) as { message?: string };
      } catch {
        // no-op
      }

      if (!response.ok) {
        throw new Error(resBody.message || 'No se pudo restablecer la contraseña.');
      }

      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña se guardó en la base de datos. Ya podés iniciar sesión.',
        [{ text: 'Ir a Login', onPress: () => router.replace('/login') }]
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restablecer contraseña</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Nueva contraseña</Text>
          <Text style={styles.subtitle}>
            {hasToken
              ? 'Completá los dos campos para actualizar tu contraseña.'
              : 'Abrí el enlace del email. Si no se cargó el código, pedí uno nuevo desde el login.'}
          </Text>

          <Text style={styles.fieldLabel}>Nueva contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Nueva contraseña"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Confirmar contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirmar contraseña"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((v) => !v)}
              style={styles.eyeButton}
            >
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || !hasToken) && styles.submitButtonDisabled,
            ]}
            onPress={() => void handleResetPassword()}
            disabled={isSubmitting || !hasToken}
          >
            {isSubmitting ? (
              <View style={styles.submitRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitTextLoading}>Guardando...</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Guardar contraseña</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Volver al login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  placeholder: { width: 40 },
  content: { padding: 20, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 4 },
  subtitle: { color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginTop: 8 },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: { flex: 1, paddingVertical: 12, color: '#333', fontSize: 16 },
  eyeButton: { padding: 6 },
  submitButton: {
    marginTop: 16,
    backgroundColor: '#667eea',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitButtonDisabled: { opacity: 0.55 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  submitRow: { flexDirection: 'row', alignItems: 'center' },
  submitTextLoading: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  loginLink: { alignItems: 'center', marginTop: 16, padding: 8 },
  loginLinkText: { color: '#667eea', fontSize: 15, fontWeight: '600' },
});
