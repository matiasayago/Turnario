import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ProSubscriptionLock from '../../components/ProSubscriptionLock';
import { useAuth } from '../../contexts/AuthContext';
import { useAvailability } from '../../contexts/AvailabilityContext';
import { openWhatsApp } from '../../utils/openWhatsApp';

export default function WhatsAppContactScreen() {
  const { user, hasProAccess } = useAuth();
  const isProfessional = user?.userType === 'professional';
  const myId = String(user?._id || user?.id || '');
  const { availableProfessionals, refreshProfessionalDirectory, isLoading } = useAvailability();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfessionalDirectory();
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfessionalDirectory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return availableProfessionals
      .filter((p) => String(p.id) !== myId)
      .filter((p) => {
        if (!q) return true;
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.specialty && p.specialty.toLowerCase().includes(q)) ||
          (p.location && p.location.toLowerCase().includes(q))
        );
      });
  }, [availableProfessionals, myId, query]);

  const initials = (name: string) =>
    (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const renderItem = useCallback(
    ({ item }: { item: (typeof availableProfessionals)[0] }) => {
      const phone = item.phone?.trim();
      const hasPhone = Boolean(phone);
      return (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(item.name)}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.name}>{item.name}</Text>
            {item.specialty ? <Text style={styles.sub}>{item.specialty}</Text> : null}
            {item.location ? <Text style={styles.loc}>{item.location}</Text> : null}
          </View>
          <TouchableOpacity
            style={[styles.waBtn, !hasPhone && styles.waBtnDisabled]}
            onPress={() =>
              openWhatsApp(
                phone,
                `Hola ${item.name}, te escribo desde Turnario.`
              )
            }
          >
            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    },
    [availableProfessionals]
  );

  if (isProfessional && !hasProAccess()) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ProSubscriptionLock
          title="Contactos por WhatsApp"
          description="El directorio para contactar profesionales por WhatsApp desde Turnario está disponible con Turnario Pro."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.title}>WhatsApp</Text>
        <Text style={styles.subtitle}>
          Contactá a profesionales por WhatsApp con el número cargado en su perfil.
        </Text>
        <TextInput
          style={styles.search}
          placeholder="Buscar por nombre, especialidad o lugar..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {isLoading && filtered.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 32 }} color="#25D366" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#25D366']} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay profesionales para mostrar.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  search: {
    marginTop: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  sub: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  loc: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  waBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  waBtnDisabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.85,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 15,
  },
});
