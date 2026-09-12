import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppointments } from '../contexts/AppointmentContext';
import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../hooks';

type PatientRow = {
  id: string;
  clientId?: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  lastVisit: string;
  visits: number;
  notes: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  allergies?: string;
  hasProfile?: boolean;
};

type Props = {
  showBack?: boolean;
  onBack?: () => void;
  onAdd: () => void;
  onImport: () => void;
  onExport: (patients: PatientRow[]) => void;
  onView: (patient: PatientRow) => void;
  onEdit: (patient: PatientRow) => void;
  onSchedule: (patient: PatientRow) => void;
  onHistory: (patient: PatientRow) => void;
  revision?: number;
};

function parseDate(value?: string) {
  if (!value) return null;
  if (value.includes('/')) {
    const [day, month, year] = value.split('/');
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function ProfessionalPatientManagement({
  showBack = false,
  onBack,
  onAdd,
  onImport,
  onExport,
  onView,
  onEdit,
  onSchedule,
  onHistory,
  revision = 0,
}: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { clients, refreshUsers } = useUsers();
  const { appointments } = useAppointments();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'recent'>('all');

  useEffect(() => {
    refreshUsers().catch(() => {});
  }, [refreshUsers, revision]);

  const patients = useMemo(() => {
    const currentUserId = String(user?._id || user?.id || '');
    const sourceAppointments = (appointments || []).filter(
      (appointment: any) => String(appointment.professionalId || '') === currentUserId
    );

    const profileById = new Map<string, any>();
    const profileByEmail = new Map<string, any>();
    clients.forEach((client: any) => {
      const clientId = String(client._id || '').trim();
      const emailKey = String(client.email || '').trim().toLowerCase();
      if (clientId) profileById.set(clientId, client);
      if (emailKey) profileByEmail.set(emailKey, client);
    });

    const patientMap = new Map<string, PatientRow>();

    sourceAppointments.forEach((appointment: any) => {
      const rawClientId = String(appointment.clientId || '').trim();
      const clientId = /^[a-fA-F0-9]{24}$/.test(rawClientId) ? rawClientId : '';
      const emailKey = String(appointment.patientEmail || '').trim().toLowerCase();
      const profile =
        (clientId && profileById.get(clientId)) ||
        (emailKey && profileByEmail.get(emailKey)) ||
        null;
      const profileId = profile ? String(profile._id || clientId || '').trim() : clientId;
      const key =
        profileId ||
        emailKey ||
        String(appointment.patientName || appointment.clientName || '')
          .trim()
          .toLowerCase() ||
        `appointment_${appointment.id}`;

      const address =
        profile && typeof profile.address === 'string'
          ? profile.address
          : profile?.address?.street || '';

      const existing = patientMap.get(key) || {
        id: profileId || key,
        clientId: profileId,
        name:
          profile?.fullName ||
          appointment.patientName ||
          appointment.clientName ||
          'Paciente',
        email: profile?.email || appointment.patientEmail || '',
        phone: profile?.phone || appointment.patientPhone || 'No especificado',
        status: (profile?.isActive === false ? 'inactive' : 'active') as 'active' | 'inactive',
        lastVisit: '',
        visits: 0,
        notes: profile?.clinicalNotes || '',
        dateOfBirth: profile?.dateOfBirth || '',
        gender: profile?.gender || '',
        address,
        emergencyContact: profile?.emergencyContact || '',
        medicalHistory: profile?.medicalHistory || '',
        allergies: profile?.allergies || '',
        hasProfile: Boolean(profile),
      };

      const appointmentDate = parseDate(String(appointment.date || ''));
      const currentLastVisitDate = parseDate(existing.lastVisit);
      const shouldReplaceLastVisit =
        appointmentDate &&
        (!currentLastVisitDate || appointmentDate.getTime() > currentLastVisitDate.getTime());

      const merged: PatientRow = {
        ...existing,
        id: String(existing.clientId || profileId || existing.id || key),
        clientId: String(existing.clientId || profileId || ''),
        name:
          profile?.fullName ||
          existing.name ||
          appointment.patientName ||
          appointment.clientName ||
          'Paciente',
        email: profile?.email || existing.email || appointment.patientEmail || '',
        phone:
          profile?.phone ||
          (existing.phone && existing.phone !== 'No especificado'
            ? existing.phone
            : appointment.patientPhone || 'No especificado'),
        status: appointment.status === 'cancelled' ? existing.status : 'active',
        visits: Number(existing.visits || 0) + 1,
        lastVisit: shouldReplaceLastVisit ? String(appointment.date || '') : existing.lastVisit,
        notes: profile?.clinicalNotes || existing.notes || '',
        dateOfBirth: profile?.dateOfBirth || existing.dateOfBirth || '',
        gender: profile?.gender || existing.gender || '',
        address: address || existing.address || '',
        emergencyContact: profile?.emergencyContact || existing.emergencyContact || '',
        medicalHistory: profile?.medicalHistory || existing.medicalHistory || '',
        allergies: profile?.allergies || existing.allergies || '',
        hasProfile: Boolean(profile || existing.hasProfile),
      };

      patientMap.set(key, merged);
      if (merged.clientId) patientMap.set(merged.clientId, merged);
      if (emailKey) patientMap.set(emailKey, merged);
    });

    const unique = new Map<string, PatientRow>();
    for (const row of patientMap.values()) {
      const uniqueKey = String(row.clientId || row.email || row.id);
      const previous = unique.get(uniqueKey);
      if (!previous || Number(row.visits || 0) >= Number(previous.visits || 0)) {
        unique.set(uniqueKey, row);
      }
    }
    let rows = Array.from(unique.values()).filter((row) => String(row.name || '').trim());
    const search = query.trim().toLowerCase();
    if (search) {
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(search) ||
          String(row.email || '').toLowerCase().includes(search) ||
          String(row.phone || '').includes(search)
      );
    }
    if (filter === 'active') rows = rows.filter((row) => row.status === 'active');
    if (filter === 'inactive') rows = rows.filter((row) => row.status === 'inactive');
    if (filter === 'recent') {
      const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
      rows = rows.filter((row) => {
        const parsed = parseDate(row.lastVisit);
        return parsed ? parsed.getTime() >= threshold : false;
      });
    }
    rows.sort((a, b) => Number(b.visits || 0) - Number(a.visits || 0));
    return rows;
  }, [appointments, clients, query, filter, user?._id, user?.id]);

  const recentCount = patients.filter((row) => {
    const parsed = parseDate(row.lastVisit);
    return parsed ? parsed.getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000 : false;
  }).length;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 12) }]}>
        {showBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.title}>🏥 Gestión de Pacientes</Text>
          <Text style={styles.subtitle}>Administra tu lista de pacientes</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{patients.length}</Text>
          <Text style={styles.statLabel}>TOTAL</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{patients.filter((row) => row.status === 'active').length}</Text>
          <Text style={styles.statLabel}>ACTIVOS</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{patients.filter((row) => row.status === 'inactive').length}</Text>
          <Text style={styles.statLabel}>INACTIVOS</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{recentCount}</Text>
          <Text style={styles.statLabel}>NUEVOS</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.greenButton} onPress={onAdd}>
          <Ionicons name="person-add" size={18} color="white" />
          <Text style={styles.greenButtonText}>Agregar Paciente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.greenButton} onPress={onImport}>
          <Ionicons name="download" size={18} color="white" />
          <Text style={styles.greenButtonText}>Importar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.greenButton} onPress={() => onExport(patients)}>
          <Ionicons name="share" size={18} color="white" />
          <Text style={styles.greenButtonText}>Exportar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#667eea" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar pacientes..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filters}
        >
          {(['all', 'active', 'inactive', 'recent'] as const).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.chip, filter === item && styles.chipActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.chipText, filter === item && styles.chipTextActive]}>
                {item === 'all'
                  ? 'Todos'
                  : item === 'active'
                    ? 'Activos'
                    : item === 'inactive'
                      ? 'Inactivos'
                      : 'Recientes'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {patients.map((patient) => (
          <View key={patient.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={22} color="white" />
              </View>
              <View style={styles.identity}>
                <Text style={styles.name}>{patient.name}</Text>
                <Text style={styles.meta}>{patient.email || 'Sin correo'}</Text>
                <Text style={styles.meta}>{patient.phone || 'Sin teléfono'}</Text>
              </View>
              <View style={styles.statusWrap}>
                <View style={[styles.badge, patient.status === 'inactive' && styles.badgeInactive]}>
                  <Text style={styles.badgeText}>{patient.status === 'inactive' ? 'Inactivo' : 'Activo'}</Text>
                </View>
                <Text style={styles.visits}>{patient.visits} visita{patient.visits === 1 ? '' : 's'}</Text>
              </View>
            </View>
            <Text style={styles.notes}>
              <Text style={styles.notesLabel}>Notas: </Text>
              {patient.notes || 'Sin notas'}
            </Text>
            <Text style={styles.lastVisit}>Última visita: {patient.lastVisit || 'Sin visitas'}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.action} onPress={() => onView(patient)}>
                <Ionicons name="eye" size={16} color="#667eea" />
                <Text style={styles.actionText}>Ver</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.action} onPress={() => onEdit(patient)}>
                <Ionicons name="create" size={16} color="#FF9800" />
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.action} onPress={() => onSchedule(patient)}>
                <Ionicons name="calendar" size={16} color="#4CAF50" />
                <Text style={styles.actionText}>Agendar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.action} onPress={() => onHistory(patient)}>
                <Ionicons name="time" size={16} color="#9C27B0" />
                <Text style={styles.actionText}>Historial</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6FB' },
  header: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backSpacer: { width: 36 },
  headerCopy: { flex: 1, alignItems: 'center', marginRight: 36 },
  title: { color: 'white', fontSize: 20, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  stats: {
    flexDirection: 'row',
    flexGrow: 0,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    paddingVertical: 14,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNumber: { color: '#667eea', fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 2 },
  toolbar: {
    flexDirection: 'row',
    flexGrow: 0,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  greenButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
  },
  greenButtonText: { color: 'white', fontSize: 11, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: 'white',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, color: '#172033', fontSize: 14, paddingVertical: 0 },
  filtersWrap: { flexGrow: 0, height: 52 },
  filtersScroll: { flexGrow: 0 },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  chipActive: { backgroundColor: '#667eea' },
  chipText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: 'white' },
  list: { flex: 1, minHeight: 0 },
  listContent: { paddingHorizontal: 16, paddingBottom: 28 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flex: 1, marginLeft: 10 },
  name: { color: '#172033', fontSize: 16, fontWeight: '800' },
  meta: { color: '#64748B', fontSize: 12, marginTop: 2 },
  statusWrap: { alignItems: 'flex-end' },
  badge: { backgroundColor: '#DCFCE7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  badgeInactive: { backgroundColor: '#FEE2E2' },
  badgeText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  visits: { color: '#64748B', fontSize: 11, marginTop: 6 },
  notes: { color: '#475569', fontSize: 13, marginTop: 12 },
  notesLabel: { color: '#172033', fontWeight: '800' },
  lastVisit: { color: '#64748B', fontSize: 12, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    paddingVertical: 4,
  },
  actionText: { color: '#475569', fontSize: 11, fontWeight: '700', marginTop: 4 },
});
