import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, StyleSheet, Text, View } from 'react-native';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Google Play Billing (`expo-iap`) no existe en Expo Go. En Android nativo (APK / dev build)
 * se carga `SubscribePlayPanelNativeBilling` con `require` para no romper el arranque en Go.
 */
export default function SubscribePlayPanel() {
  if (Platform.OS === 'android' && !isExpoGo) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NativeBilling = require('./SubscribePlayPanelNativeBilling').default;
    return <NativeBilling />;
  }

  return (
    <View style={styles.box}>
      <Ionicons name="logo-google-playstore" size={48} color="#01875f" />
      <Text style={styles.title}>Turnario Pro</Text>
      <Text style={styles.p}>
        La suscripción con <Text style={styles.bold}>Google Play</Text> está disponible en la app instalada desde
        Play Store en <Text style={styles.bold}>Android</Text>.
      </Text>
      {Platform.OS === 'android' && isExpoGo ? (
        <Text style={styles.p}>
          En <Text style={styles.bold}>Expo Go</Text> no se puede usar facturación de Play Store. Probá la suscripción en
          un APK o development build.
        </Text>
      ) : null}
      {Platform.OS === 'ios' ? (
        <Text style={styles.p}>En iPhone la suscripción será por App Store (misma pantalla cuando la conectemos).</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  p: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
  },
  bold: {
    fontWeight: '600',
    color: '#111827',
  },
});
