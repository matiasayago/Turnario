// @ts-nocheck — perfil extendido (businessInfo, datos personales)
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUserProfile } from '../contexts/UserProfileContext';
import type { User, UserBusinessType } from '../services/authService';

const BUSINESS_TYPE_LABELS: Record<UserBusinessType, string> = {
  medical: 'Salud / medicina',
  beauty: 'Belleza / estética',
  fitness: 'Fitness / deportes',
  education: 'Educación',
  consulting: 'Consultoría',
  repair: 'Reparaciones',
  cleaning: 'Limpieza',
  transport: 'Transporte',
  food: 'Alimentación',
  retail: 'Comercio',
  other: 'Otro',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
  prefer_not_to_say: 'Prefiero no decir',
};

const LANG_LEVEL_LABELS: Record<string, string> = {
  basic: 'Básico',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  native: 'Nativo',
};

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  if (value == null || String(value).trim() === '') return null;
  return (
    <>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value).trim()}</Text>
    </>
  );
}

function PersonalAndLocationSection({ user }: { user: User }) {
  const addr = user.address;
  const hasAddr =
    addr &&
    [addr.street, addr.city, addr.state, addr.zipCode, addr.country].some(
      (x) => x != null && String(x).trim() !== ''
    );
  const ec = user.emergencyContact;
  const hasEc =
    ec &&
    [ec.name, ec.phone, ec.relationship].some((x) => x != null && String(x).trim() !== '');

  if (
    !hasAddr &&
    !user.dateOfBirth &&
    !user.nationalId &&
    !user.gender &&
    !hasEc
  ) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📍 Datos personales y ubicación</Text>
      <View style={styles.infoCard}>
        <InfoRow label="Fecha de nacimiento:" value={user.dateOfBirth} />
        <InfoRow label="Documento:" value={user.nationalId} />
        {user.gender ? (
          <>
            <Text style={styles.infoLabel}>Género:</Text>
            <Text style={styles.infoValue}>
              {GENDER_LABELS[user.gender] || user.gender}
            </Text>
          </>
        ) : null}
        {hasAddr && addr ? (
          <>
            <Text style={styles.infoLabel}>Dirección:</Text>
            <Text style={styles.infoValue}>
              {[
                addr.street,
                [addr.city, addr.state].filter(Boolean).join(', '),
                addr.zipCode,
                addr.country,
              ]
                .filter((p) => p != null && String(p).trim() !== '')
                .join(' · ')}
            </Text>
          </>
        ) : null}
        {hasEc && ec ? (
          <>
            <Text style={styles.infoLabel}>Contacto de emergencia:</Text>
            <Text style={styles.infoValue}>
              {[ec.name, ec.phone, ec.relationship].filter(Boolean).join(' · ')}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

function ProfessionalDetailSection({ user }: { user: User }) {
  const bi = user.businessInfo;
  const hasBi =
    bi &&
    Object.keys(bi).some((k) => {
      const v = bi[k as keyof typeof bi];
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object') return Object.keys(v).length > 0;
      return String(v).trim() !== '';
    });

  if (
    !user.service &&
    !user.profileBio &&
    user.clientBookingRequiresDeposit === undefined &&
    !hasBi
  ) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>💼 Perfil profesional</Text>
      <View style={styles.infoCard}>
        <InfoRow label="Servicio principal:" value={user.service} />
        <InfoRow label="Biografía:" value={user.profileBio} />
        {user.clientBookingRequiresDeposit !== undefined ? (
          <>
            <Text style={styles.infoLabel}>Reservas online con seña:</Text>
            <Text style={styles.infoValue}>
              {user.clientBookingRequiresDeposit ? 'Sí' : 'No'}
            </Text>
          </>
        ) : null}

        {hasBi && bi ? (
          <>
            <InfoRow label="Nombre comercial / estudio:" value={bi.businessName} />
            {bi.businessType ? (
              <>
                <Text style={styles.infoLabel}>Rubro:</Text>
                <Text style={styles.infoValue}>
                  {BUSINESS_TYPE_LABELS[bi.businessType] || bi.businessType}
                </Text>
              </>
            ) : null}
            <InfoRow label="Categoría:" value={bi.businessCategory} />
            <InfoRow label="Matrícula / licencia:" value={bi.license} />
            {bi.experience != null ? (
              <>
                <Text style={styles.infoLabel}>Años de experiencia:</Text>
                <Text style={styles.infoValue}>{String(bi.experience)}</Text>
              </>
            ) : null}
            {bi.specialties && bi.specialties.length > 0 ? (
              <>
                <Text style={styles.infoLabel}>Especialidades:</Text>
                <Text style={styles.infoValue}>{bi.specialties.join(', ')}</Text>
              </>
            ) : null}
            {bi.skills && bi.skills.length > 0 ? (
              <>
                <Text style={styles.infoLabel}>Habilidades:</Text>
                <Text style={styles.infoValue}>{bi.skills.join(', ')}</Text>
              </>
            ) : null}
            {bi.languages && bi.languages.length > 0 ? (
              <>
                <Text style={styles.infoLabel}>Idiomas:</Text>
                <Text style={styles.infoValue}>
                  {bi.languages
                    .map(
                      (l) =>
                        `${l.language}${
                          l.level ? ` (${LANG_LEVEL_LABELS[l.level] || l.level})` : ''
                        }`
                    )
                    .join(', ')}
                </Text>
              </>
            ) : null}
            {bi.education && bi.education.length > 0 ? (
              <>
                <Text style={styles.infoLabel}>Formación:</Text>
                {bi.education.map((e, i) => (
                  <Text key={`ed-${i}`} style={[styles.infoValue, styles.listItem]}>
                    • {[e.degree, e.institution, e.year != null ? String(e.year) : '']
                      .filter(Boolean)
                      .join(' — ')}
                  </Text>
                ))}
              </>
            ) : null}
            {bi.certifications && bi.certifications.length > 0 ? (
              <>
                <Text style={styles.infoLabel}>Certificaciones:</Text>
                {bi.certifications.map((c, i) => (
                  <Text key={`cert-${i}`} style={[styles.infoValue, styles.listItem]}>
                    • {[c.name, c.issuer, c.issueDate, c.expiryDate ? `vence ${c.expiryDate}` : '']
                      .filter(Boolean)
                      .join(' — ')}
                  </Text>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

export default function UserProfileDisplay() {
  const { profile, isLoading, error } = useUserProfile();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Cargando perfil completo...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>Error cargando perfil</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.noProfileContainer}>
        <Ionicons name="person-outline" size={48} color="#999" />
        <Text style={styles.noProfileText}>No hay perfil cargado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Información del Usuario */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Información del Usuario</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Nombre:</Text>
          <Text style={styles.infoValue}>{profile.user.fullName}</Text>
          
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{profile.user.email}</Text>
          
          <Text style={styles.infoLabel}>Tipo:</Text>
          <Text style={styles.infoValue}>
            {profile.user.userType === 'professional' ? '👨‍⚕️ Profesional' : '👤 Cliente'}
          </Text>
          
          <Text style={styles.infoLabel}>Teléfono:</Text>
          <Text style={styles.infoValue}>{profile.user.phone || 'No especificado'}</Text>
        </View>
      </View>

      <PersonalAndLocationSection user={profile.user} />

      {profile.user.userType === 'professional' && (
        <ProfessionalDetailSection user={profile.user} />
      )}

      {/* Disponibilidad (solo para profesionales) */}
      {profile.user.userType === 'professional' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Configuración de Disponibilidad</Text>
          {profile.availability ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Estado:</Text>
              <Text style={[
                styles.infoValue,
                { color: profile.availability.isActive ? '#4CAF50' : '#F44336' }
              ]}>
                {profile.availability.isActive ? '✅ Activo' : '❌ Inactivo'}
              </Text>
              
              <Text style={styles.infoLabel}>Días de trabajo:</Text>
              <Text style={styles.infoValue}>
                {profile.availability.daysOfWeek
                  ? Object.entries(profile.availability.daysOfWeek)
                      .filter(([_, isActive]) => isActive)
                      .map(([day, _]) => day.charAt(0).toUpperCase() + day.slice(1))
                      .join(', ')
                  : 'No especificado'}
              </Text>
              
              <Text style={styles.infoLabel}>Horarios:</Text>
              <Text style={styles.infoValue}>
                {profile.availability.workingHours?.start != null &&
                profile.availability.workingHours?.end != null
                  ? `${profile.availability.workingHours.start} - ${profile.availability.workingHours.end}`
                  : 'No especificado'}
              </Text>
              
              <Text style={styles.infoLabel}>Horarios específicos:</Text>
              <Text style={styles.infoValue}>
                {(profile.availability.timeSlots || []).length} configurados
              </Text>
            </View>
          ) : (
            <View style={styles.noDataCard}>
              <Ionicons name="calendar-outline" size={24} color="#999" />
              <Text style={styles.noDataText}>No hay configuración de disponibilidad</Text>
            </View>
          )}
        </View>
      )}

      {/* Estadísticas de Citas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Estadísticas de Citas</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{profile.stats.totalAppointments}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#2196F3' }]}>
              {profile.stats.upcomingAppointments}
            </Text>
            <Text style={styles.statLabel}>Próximas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
              {profile.stats.completedAppointments}
            </Text>
            <Text style={styles.statLabel}>Completadas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F44336' }]}>
              {profile.stats.cancelledAppointments}
            </Text>
            <Text style={styles.statLabel}>Canceladas</Text>
          </View>
        </View>
      </View>

      {/* Citas Recientes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Citas Recientes</Text>
        {profile.appointments.length > 0 ? (
          <View style={styles.appointmentsList}>
            {profile.appointments.slice(0, 5).map((appointment, index) => (
              <View key={appointment.id || index} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <Text style={styles.appointmentService}>{appointment.service}</Text>
                  <Text style={[
                    styles.appointmentStatus,
                    { color: getStatusColor(appointment.status) }
                  ]}>
                    {getStatusText(appointment.status)}
                  </Text>
                </View>
                <Text style={styles.appointmentDate}>
                  {appointment.date} a las {appointment.time}
                </Text>
                {appointment.professional && (
                  <Text style={styles.appointmentProfessional}>
                    Con: {appointment.professional}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noDataCard}>
            <Ionicons name="calendar-outline" size={24} color="#999" />
            <Text style={styles.noDataText}>No hay citas registradas</Text>
          </View>
        )}
      </View>

      {/* Información de Última Actualización */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 Información del Sistema</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Última actualización:</Text>
          <Text style={styles.infoValue}>
            {new Date(profile.lastUpdated).toLocaleString()}
          </Text>
          
          <Text style={styles.infoLabel}>Estado de carga:</Text>
          <Text style={[styles.infoValue, { color: '#4CAF50' }]}>
            ✅ Completado
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Funciones helper
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'confirmed': return '#4CAF50';
    case 'pending': return '#FF9800';
    case 'cancelled': return '#F44336';
    case 'completed': return '#2196F3';
    default: return '#999';
  }
};

const getStatusText = (status: string): string => {
  switch (status) {
    case 'confirmed': return 'Confirmada';
    case 'pending': return 'Pendiente';
    case 'cancelled': return 'Cancelada';
    case 'completed': return 'Completada';
    default: return status;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  noProfileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noProfileText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  listItem: {
    marginTop: 6,
    lineHeight: 22,
  },
  noDataCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentService: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  appointmentStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  appointmentDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  appointmentProfessional: {
    fontSize: 14,
    color: '#999',
  },
});
