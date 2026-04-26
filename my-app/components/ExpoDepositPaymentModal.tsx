import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  createExpoPaymentPreference,
  getExpoPaymentStatus,
  getMercadoPagoCheckoutUrl,
} from '../services/expoPaymentService';

export type ExpoDepositSummary = {
  service?: string;
  professional?: string;
  date?: string;
  time?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  appointmentId: string;
  depositAmount: number;
  summary?: ExpoDepositSummary;
  onPaymentConfirmed?: () => void;
};

export function ExpoDepositPaymentModal({
  visible,
  onClose,
  appointmentId,
  depositAmount,
  summary,
  onPaymentConfirmed,
}: Props) {
  const [loadingPref, setLoadingPref] = useState(false);
  const [checking, setChecking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const checkStatusOnce = useCallback(async () => {
    if (!appointmentId) return false;
    try {
      const st = await getExpoPaymentStatus(appointmentId);
      if (st.paymentStatus === 'approved' || st.status === 'confirmed') {
        stopPoll();
        onPaymentConfirmed?.();
        Alert.alert(
          'Pago confirmado',
          'Recibimos el pago en Mercado Pago. Tu cita quedó confirmada.',
          [{ text: 'OK', onPress: onClose }]
        );
        return true;
      }
    } catch {
      /* ignorar un fallo puntual durante el poll */
    }
    return false;
  }, [appointmentId, onClose, onPaymentConfirmed, stopPoll]);

  const startPolling = useCallback(() => {
    stopPoll();
    let n = 0;
    pollRef.current = setInterval(async () => {
      n += 1;
      const ok = await checkStatusOnce();
      if (ok || n >= 45) {
        stopPoll();
        if (!ok && n >= 45) {
          Alert.alert(
            'Pago pendiente',
            'Si ya pagaste, el acreditado puede demorar unos minutos. Revisá Notificaciones o tocá «Verificar pago» más tarde.'
          );
        }
      }
    }, 3000);
  }, [checkStatusOnce, stopPoll]);

  const openMercadoPago = useCallback(async () => {
    if (!appointmentId) return;
    setLoadingPref(true);
    try {
      const pref = await createExpoPaymentPreference(
        appointmentId,
        depositAmount > 0 ? depositAmount : undefined
      );
      const url = getMercadoPagoCheckoutUrl(pref);
      if (!url) {
        throw new Error('El servidor no devolvió la URL de pago');
      }
      const can = await Linking.canOpenURL(url);
      if (!can) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
      Alert.alert(
        'Mercado Pago',
        'Completá el pago en Mercado Pago o en tu billetera. Al volver a la app, tocá «Verificar pago» o esperá unos segundos: detectamos el pago automáticamente.',
        [{ text: 'Entendido' }]
      );
      startPolling();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo iniciar el pago';
      Alert.alert('Pago', msg);
    } finally {
      setLoadingPref(false);
    }
  }, [appointmentId, depositAmount, startPolling]);

  const verifyManually = useCallback(async () => {
    setChecking(true);
    try {
      const ok = await checkStatusOnce();
      if (!ok) {
        Alert.alert(
          'Aún no registramos el pago',
          'Si acabás de pagar, esperá un momento y reintentá. Si usaste efectivo o método offline, puede demorar.'
        );
      }
    } finally {
      setChecking(false);
    }
  }, [checkStatusOnce]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>Pagar seña</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.amount}>${depositAmount || '—'}</Text>
          {summary?.service ? (
            <Text style={styles.line}>{summary.service}</Text>
          ) : null}
          {summary?.professional ? (
            <Text style={styles.line}>{summary.professional}</Text>
          ) : null}
          {summary?.date ? (
            <Text style={styles.line}>
              {summary.date}
              {summary.time ? ` · ${summary.time}` : ''}
            </Text>
          ) : null}

          <Text style={styles.hint}>
            Vas a salir de la app y abrir Mercado Pago (u otra billetera disponible en el checkout).
            Cuando el pago se acredite, la cita pasará a confirmada automáticamente.
          </Text>

          <TouchableOpacity
            style={[styles.primary, loadingPref && styles.disabled]}
            onPress={openMercadoPago}
            disabled={loadingPref}
          >
            {loadingPref ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="open-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryText}>Ir a Mercado Pago</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondary, (checking || loadingPref) && styles.disabled]}
            onPress={verifyManually}
            disabled={checking || loadingPref}
          >
            {checking ? (
              <ActivityIndicator color="#667eea" />
            ) : (
              <Text style={styles.secondaryText}>Verificar pago</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghost} onPress={onClose}>
            <Text style={styles.ghostText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  amount: { fontSize: 28, fontWeight: '800', color: '#009ee3', marginBottom: 8 },
  line: { fontSize: 15, color: '#444', marginBottom: 4 },
  hint: { fontSize: 14, color: '#666', lineHeight: 20, marginVertical: 16 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#009ee3',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#667eea',
    marginBottom: 8,
  },
  secondaryText: { color: '#667eea', fontSize: 16, fontWeight: '600' },
  ghost: { alignItems: 'center', paddingVertical: 10 },
  ghostText: { color: '#888', fontSize: 15 },
  disabled: { opacity: 0.6 },
});
