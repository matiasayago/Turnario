import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  deepLinkToSubscriptions,
  ErrorCode,
  useIAP,
  type AndroidSubscriptionOfferInput,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap';

import { getAndroidApplicationId, getGooglePlaySubscriptionSkus } from '@/config/subscriptions';
import { useAuth } from '@/contexts/AuthContext';
import { confirmGooglePlaySubscription } from '@/services/subscriptionPlayService';
import { simpleAuthService } from '@/services/simpleAuthService';

function buildGoogleSubscriptionOffers(sub: ProductSubscription): AndroidSubscriptionOfferInput[] {
  if (sub.type !== 'subs') return [];
  if (sub.platform !== 'android') return [];
  const fromStandard = (sub.subscriptionOffers || [])
    .filter((o) => !!o.offerTokenAndroid)
    .map((o) => ({ sku: sub.id, offerToken: o.offerTokenAndroid! }));
  if (fromStandard.length) return fromStandard;
  return (sub.subscriptionOfferDetailsAndroid || []).map((o) => ({
    sku: sub.id,
    offerToken: o.offerToken,
  }));
}

/**
 * Solo se carga con `require()` desde SubscribePlayPanel cuando NO es Expo Go.
 * Así Expo Go no evalúa expo-iap (no está en el cliente de la tienda).
 */
export default function SubscribePlayPanelNativeBilling() {
  const { refreshUserFromBackend } = useAuth();
  const skus = useMemo(() => getGooglePlaySubscriptionSkus(), []);
  const packageName = useMemo(() => getAndroidApplicationId(), []);
  const primarySku = skus[0] || 'turnario_pro_monthly';
  const processedTokens = useRef(new Set<string>());
  const [status, setStatus] = useState<string | null>(null);

  const onPurchaseSuccessRef = useRef<(purchase: Purchase) => Promise<void>>(async () => {});

  const { connected, subscriptions, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void onPurchaseSuccessRef.current(purchase);
    },
    onPurchaseError: (error) => {
      if (error.code === ErrorCode.UserCancelled) return;
      Alert.alert('Compra', error.message || 'No se pudo completar la compra.');
    },
  });

  useEffect(() => {
    onPurchaseSuccessRef.current = async (purchase: Purchase) => {
      const suspended = 'isSuspendedAndroid' in purchase ? purchase.isSuspendedAndroid : false;
      if (suspended) {
        Alert.alert(
          'Pago pendiente',
          'Google marcó la suscripción como suspendida (problema con el medio de pago). Corregilo en Play Store.'
        );
        return;
      }
      if (purchase.purchaseState !== 'purchased') return;

      const purchaseToken = purchase.purchaseToken;
      if (!purchaseToken) {
        Alert.alert('Error', 'No se recibió el token de compra. Reintentá.');
        return;
      }
      if (processedTokens.current.has(purchaseToken)) return;
      processedTokens.current.add(purchaseToken);

      try {
        const authToken = await simpleAuthService.getToken();
        if (!authToken) {
          throw new Error('Iniciá sesión de nuevo.');
        }
        await confirmGooglePlaySubscription({
          authToken,
          purchaseToken,
          productId: purchase.productId,
          packageName: ('packageNameAndroid' in purchase && purchase.packageNameAndroid) || packageName,
        });
        await finishTransaction({ purchase, isConsumable: false });
        await refreshUserFromBackend();
        Alert.alert('Turnario Pro', 'Tu plan quedó activo en esta cuenta.');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('No se pudo activar', msg);
      } finally {
        processedTokens.current.delete(purchaseToken);
      }
    };
  }, [finishTransaction, packageName, refreshUserFromBackend]);

  useEffect(() => {
    if (!connected || skus.length === 0) return;
    setStatus(null);
    void (async () => {
      try {
        await fetchProducts({ skus, type: 'subs' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(`No se pudieron cargar los precios: ${msg}`);
      }
    })();
  }, [connected, fetchProducts, skus]);

  const primarySub = useMemo(
    () => subscriptions.find((s) => skus.includes(s.id)) ?? subscriptions[0],
    [subscriptions, skus]
  );

  const buy = useCallback(async () => {
    if (!primarySub) {
      Alert.alert(
        'Producto no disponible',
        `Creá en Play Console una suscripción con id "${primarySku}" (Monetización → Suscripciones) y publicá un track de prueba.`
      );
      return;
    }
    const offers = buildGoogleSubscriptionOffers(primarySub);
    try {
      await requestPurchase({
        type: 'subs',
        request: {
          apple: { sku: primarySub.id },
          google: {
            skus: [primarySub.id],
            subscriptionOffers: offers.length ? offers : undefined,
          },
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Compra', msg);
    }
  }, [primarySub, primarySku, requestPurchase]);

  const openPlaySubscriptions = useCallback(async () => {
    try {
      await deepLinkToSubscriptions({ skuAndroid: primarySku });
    } catch {
      Alert.alert('Play Store', 'Abrí Play Store → Perfil → Pagos y suscripciones para administrar la suscripción.');
    }
  }, [primarySku]);

  if (!connected) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366E1" />
        <Text style={styles.muted}>Conectando con Google Play…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Turnario Pro</Text>
      <Text style={styles.sub}>
        Suscripción mensual vía Google Play. Misma cuenta que usás en Turnario (profesional).
      </Text>

      {status ? <Text style={styles.warn}>{status}</Text> : null}

      {primarySub ? (
        <View style={styles.card}>
          <Text style={styles.planTitle}>{primarySub.title}</Text>
          <Text style={styles.price}>{primarySub.displayPrice}</Text>
          <Text style={styles.sku}>ID: {primarySub.id}</Text>
        </View>
      ) : (
        <Text style={styles.muted}>Buscando producto en Play Store…</Text>
      )}

      <TouchableOpacity style={styles.btnPrimary} onPress={() => void buy()} disabled={!primarySub}>
        <Text style={styles.btnPrimaryText}>Suscribirme</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnGhost} onPress={() => void openPlaySubscriptions()}>
        <Text style={styles.btnGhostText}>Gestionar en Google Play</Text>
      </TouchableOpacity>

      <Text style={styles.legal}>
        El cobro y la cancelación los maneja Google Play según sus términos. Turnario actualiza tu acceso Pro cuando el
        servidor confirma la compra.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  center: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
  },
  muted: {
    fontSize: 14,
    color: '#6b7280',
  },
  warn: {
    fontSize: 14,
    color: '#b45309',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6366E1',
    marginTop: 8,
  },
  sku: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
  },
  btnPrimary: {
    backgroundColor: '#6366E1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  btnGhost: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnGhostText: {
    color: '#6366E1',
    fontSize: 15,
    fontWeight: '600',
  },
  legal: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9ca3af',
    marginTop: 8,
  },
});
