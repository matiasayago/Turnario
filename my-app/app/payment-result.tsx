import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getExpoPaymentStatus } from '../services/expoPaymentService';

export default function PaymentResultScreen() {
  const router = useRouter();
  const { expo_appointment_id, mp_status } = useLocalSearchParams<{
    expo_appointment_id?: string | string[];
    mp_status?: string | string[];
  }>();
  const [message, setMessage] = useState('Verificando pago…');
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const raw = expo_appointment_id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    const stParam = Array.isArray(mp_status) ? mp_status[0] : mp_status;

    if (!id) {
      setMessage('No se encontró el identificador de la reserva.');
      setFinished(true);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const st = await getExpoPaymentStatus(id);
        if (cancelled) return;
        if (st.paymentStatus === 'approved' || st.status === 'confirmed') {
          setMessage('¡Listo! Pago acreditado y cita confirmada.');
          setFinished(true);
          return;
        }
      } catch {
        /* continuar reintentando */
      }
      if (stParam === 'failure') {
        setMessage('El pago no se completó. Podés reintentar desde Notificaciones.');
        setFinished(true);
        return;
      }
      if (attempts >= 20) {
        setMessage(
          'Seguimos procesando el pago. Revisá la pestaña Notificaciones en unos minutos.'
        );
        setFinished(true);
        return;
      }
      setTimeout(tick, 2500);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [expo_appointment_id, mp_status]);

  return (
    <View style={styles.container}>
      {!finished && <ActivityIndicator size="large" color="#009ee3" />}
      <Text style={styles.text}>{message}</Text>
      {finished && (
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.btnText}>Ir al inicio</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 20,
    fontSize: 17,
    textAlign: 'center',
    color: '#333',
    lineHeight: 24,
  },
  btn: {
    marginTop: 28,
    alignSelf: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
