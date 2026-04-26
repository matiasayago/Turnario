import { Ionicons } from '@expo/vector-icons';
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

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    token?: string | string[];
  }>();
  const tokenFromLink = useMemo(() => {
    const raw = params.token;
    if (Array.isArray(raw)) return String(raw[0] || '').trim();
    return String(raw || '').trim();
  }, [params.token]);

  const [token, setToken] = useState(tokenFromLink);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tokenFromLink) setToken(tokenFromLink);
  }, [tokenFromLink]);

  const handleResetPassword = async () => {
    const cleanToken = String(token || '').trim();

    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Error', `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    if (!cleanToken) {
      Alert.alert('Error', 'Ingresá el token que recibiste por email.');
      return;
    }

    const body = { token: cleanToken, password };

    setIsSubmitting(true);
    try {
      const response = await fetch(`${getBackendBaseUrl()}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
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
        'Ya podés iniciar sesión con tu nueva contraseña.',
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restablecer contraseña</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Restablecer contraseña</Text>
          <Text style={styles.subtitle}>
            Pegá el token que recibiste por email y elegí tu nueva contraseña.
          </Text>

          <Text style={styles.fieldLabel}>Token de recuperación</Text>
          <TextInput
            style={styles.input}
            placeholder="Token"
            placeholderTextColor="#999"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Nueva contraseña"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirmar nueva contraseña"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((v) => !v)}
              style={styles.eyeButton}
            >
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={() => void handleResetPassword()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.submitRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitTextLoading}>Actualizando...</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Guardar contraseña</Text>
            )}
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
  content: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#333' },
  subtitle: { color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginTop: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: { flex: 1, paddingVertical: 12, color: '#333' },
  eyeButton: { padding: 6 },
  submitButton: {
    marginTop: 8,
    backgroundColor: '#667eea',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  submitRow: { flexDirection: 'row', alignItems: 'center' },
  submitTextLoading: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
