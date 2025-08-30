import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const CATEGORIES = [
  { id: '1', name: 'Psicología', icon: 'brain' },
  { id: '2', name: 'Medicina', icon: 'medical' },
  { id: '3', name: 'Terapia', icon: 'fitness' },
  { id: '4', name: 'Nutrición', icon: 'restaurant' },
  { id: '5', name: 'Coaching', icon: 'people' },
];

const MOCK_PROFESSIONALS = [
  {
    id: '1',
    name: 'Dra. Ana García',
    specialty: 'Psicóloga Clínica',
    rating: 4.8,
    reviews: 124,
    price: 50,
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    nextAvailable: '2024-07-09T14:30:00',
  },
  {
    id: '2',
    name: 'Dr. Juan Martínez',
    specialty: 'Médico General',
    rating: 4.9,
    reviews: 89,
    price: 60,
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    nextAvailable: '2024-07-09T15:00:00',
  },
];

export const BookAppointmentScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [professionals, setProfessionals] = useState(MOCK_PROFESSIONALS);
  const [loading, setLoading] = useState(false);

  const searchProfessionals = async (query) => {
    setLoading(true);
    try {
      // Aquí iría la llamada a la API
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Filtramos los profesionales mock
      const filtered = MOCK_PROFESSIONALS.filter(
        pro => pro.name.toLowerCase().includes(query.toLowerCase()) ||
              pro.specialty.toLowerCase().includes(query.toLowerCase())
      );
      setProfessionals(filtered);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los profesionales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      searchProfessionals(searchQuery);
    } else {
      setProfessionals(MOCK_PROFESSIONALS);
    }
  }, [searchQuery]);

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory?.id === item.id && styles.categoryButtonSelected,
      ]}
      onPress={() => setSelectedCategory(selectedCategory?.id === item.id ? null : item)}
    >
      <Ionicons
        name={item.icon}
        size={24}
        color={selectedCategory?.id === item.id ? 'white' : '#667eea'}
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory?.id === item.id && styles.categoryTextSelected,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProfessionalCard = ({ item }) => (
    <TouchableOpacity
      style={styles.professionalCard}
      onPress={() => navigation.navigate('ProfessionalProfile', { professional: item })}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.professionalInfo}>
        <Text style={styles.professionalName}>{item.name}</Text>
        <Text style={styles.specialty}>{item.specialty}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFC107" />
          <Text style={styles.rating}>{item.rating}</Text>
          <Text style={styles.reviews}>({item.reviews} reseñas)</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${item.price}</Text>
          <Text style={styles.priceLabel}>/consulta</Text>
        </View>
      </View>
      <View style={styles.nextAvailable}>
        <Text style={styles.nextAvailableLabel}>Próximo turno</Text>
        <Text style={styles.nextAvailableTime}>
          {new Date(item.nextAvailable).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.navigate('AppointmentBooking', { professional: item })}
        >
          <Text style={styles.bookButtonText}>Reservar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar profesional o especialidad..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
          />
        </View>
      </LinearGradient>

      <View style={styles.categoriesContainer}>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      <FlatList
        data={professionals}
        renderItem={renderProfessionalCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.professionalsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>
              No se encontraron profesionales
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  categoriesList: {
    paddingHorizontal: 15,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#667eea',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  categoryButtonSelected: {
    backgroundColor: '#667eea',
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#667eea',
  },
  categoryTextSelected: {
    color: 'white',
  },
  professionalsList: {
    padding: 15,
  },
  professionalCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  reviews: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  priceLabel: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  nextAvailable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 15,
    paddingLeft: 15,
    borderLeftWidth: 1,
    borderLeftColor: '#e1e1e1',
  },
  nextAvailableLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  nextAvailableTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  bookButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
