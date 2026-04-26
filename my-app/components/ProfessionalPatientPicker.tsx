import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  fetchMyPatientsFromAppointments,
  PickedPatientRow,
  searchRegisteredClients,
} from '../services/patientDirectoryService';

type Tab = 'my' | 'search';

type Props = {
  visible: boolean;
  professionalId: string;
  onClose: () => void;
  onSelect: (patient: PickedPatientRow) => void;
};

export default function ProfessionalPatientPicker({
  visible,
  professionalId,
  onClose,
  onSelect,
}: Props) {
  const [tab, setTab] = useState<Tab>('my');
  const [query, setQuery] = useState('');
  const [myPatients, setMyPatients] = useState<PickedPatientRow[]>([]);
  const [searchResults, setSearchResults] = useState<PickedPatientRow[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const loadMy = useCallback(async () => {
    if (!professionalId) return;
    setLoadingMy(true);
    try {
      const rows = await fetchMyPatientsFromAppointments(professionalId);
      setMyPatients(rows);
    } finally {
      setLoadingMy(false);
    }
  }, [professionalId]);

  useEffect(() => {
    if (visible && tab === 'my') {
      loadMy();
    }
  }, [visible, tab, loadMy]);

  useEffect(() => {
    if (!visible || tab !== 'search') return;
    const t = query.trim();
    if (t.length < 2) {
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    const id = setTimeout(async () => {
      try {
        const rows = await searchRegisteredClients(t);
        setSearchResults(rows);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [visible, tab, query]);

  const filteredMy = myPatients.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q))
    );
  });

  const displayList: PickedPatientRow[] = tab === 'my' ? filteredMy : searchResults;

  const subtitle =
    tab === 'my'
      ? 'Clientes con los que ya tuviste citas en Turnario'
      : 'Escribí al menos 2 letras (nombre o email de usuarios cliente)';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Seleccionar paciente</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={26} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, styles.tabSpacer, tab === 'my' && styles.tabActive]}
            onPress={() => {
              setTab('my');
              setQuery('');
            }}
          >
            <Ionicons name="people" size={18} color={tab === 'my' ? '#fff' : '#667eea'} style={styles.tabIcon} />
            <Text style={[styles.tabText, tab === 'my' && styles.tabTextActive]}>Mis pacientes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'search' && styles.tabActive]}
            onPress={() => {
              setTab('search');
              setQuery('');
              setSearchResults([]);
            }}
          >
            <Ionicons name="search" size={18} color={tab === 'search' ? '#fff' : '#667eea'} style={styles.tabIcon} />
            <Text style={[styles.tabText, tab === 'search' && styles.tabTextActive]}>Buscar en la app</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>{subtitle}</Text>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={tab === 'my' ? 'Filtrar por nombre, email o teléfono…' : 'Buscar usuario registrado…'}
            value={query}
            onChangeText={setQuery}
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={22} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {tab === 'my' && loadingMy ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Cargando tus pacientes…</Text>
          </View>
        ) : tab === 'search' && loadingSearch ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Buscando…</Text>
          </View>
        ) : (
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {tab === 'search' && query.trim().length > 0 && query.trim().length < 2 ? (
              <Text style={styles.empty}>Escribí al menos 2 caracteres para buscar.</Text>
            ) : displayList.length === 0 ? (
              <Text style={styles.empty}>
                {tab === 'my'
                  ? 'Aún no hay pacientes vinculados por citas. Usá «Buscar en la app» para elegir un cliente registrado.'
                  : 'No se encontraron usuarios con ese criterio.'}
              </Text>
            ) : (
              displayList.map((p) => (
                <TouchableOpacity
                  key={p.rowKey}
                  style={styles.row}
                  onPress={() => {
                    onSelect(p);
                    setQuery('');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {p.name
                        .split(/\s+/)
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.name}>{p.name}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {p.email || 'Sin email'} {p.phone ? `· ${p.phone}` : ''}
                    </Text>
                    {p.lastVisit && tab === 'my' ? (
                      <Text style={styles.last}>Última cita: {p.lastVisit}</Text>
                    ) : null}
                    {p.source === 'app_user' ? (
                      <Text style={styles.badge}>Usuario de la app</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#222' },
  closeBtn: { padding: 4 },
  tabs: { flexDirection: 'row', padding: 12 },
  tabSpacer: { marginRight: 10 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  tabIcon: { marginRight: 6 },
  tabActive: { backgroundColor: '#667eea' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#667eea' },
  tabTextActive: { color: '#fff' },
  hint: { fontSize: 13, color: '#666', paddingHorizontal: 16, marginBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#333', paddingVertical: 0 },
  list: { flex: 1, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowBody: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', color: '#222' },
  meta: { fontSize: 13, color: '#666', marginTop: 2 },
  last: { fontSize: 12, color: '#4CAF50', marginTop: 4 },
  badge: { fontSize: 11, color: '#667eea', marginTop: 4, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#888', marginTop: 32, paddingHorizontal: 24, lineHeight: 22 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, color: '#666' },
});
