import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TurnarioLogo } from '../components/TurnarioLogo';

const { width } = Dimensions.get('window');

export const ExploreProfessionalsScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [professionals, setProfessionals] = useState([]);

  const categories = [
    { id: 'all', name: 'Todos', icon: 'grid' },
    { id: 'health', name: 'Salud', icon: 'medical' },
    { id: 'therapy', name: 'Terapia', icon: 'heart' },
    { id: 'education', name: 'Educación', icon: 'school' },
    { id: 'business', name: 'Negocios', icon: 'briefcase' },
    { id: 'beauty', name: 'Belleza', icon: 'sparkles' },
  ];

  useEffect(() => {
    loadProfessionals();
  }, []);

  const loadProfessionals = () => {
    // Datos de ejemplo de profesionales
    const mockProfessionals = [
      {
        id: '1',
        name: 'Dr. María García',
        specialty: 'Médico General',
        category: 'health',
        rating: 4.9,
        reviews: 127,
        experience: '8 años',
        location: 'Centro Médico Central',
        avatar: 'https://via.placeholder.com/80',
        available: true,
        nextAvailable: '2024-07-10',
      },
      {
        id: '2',
        name: 'Lic. Carlos López',
        specialty: 'Psicólogo Clínico',
        category: 'therapy',
        rating: 4.8,
        reviews: 89,
        experience: '12 años',
        location: 'Clínica Psicológica',
        avatar: 'https://via.placeholder.com/80',
        available: true,
        nextAvailable: '2024-07-09',
      },
      {
        id: '3',
        name: 'Prof. Ana Martínez',
        specialty: 'Profesora de Inglés',
        category: 'education',
        rating: 4.7,
        reviews: 156,
        experience: '15 años',
        location: 'Academia de Idiomas',
        avatar: 'https://via.placeholder.com/80',
        available: true,
        nextAvailable: '2024-07-08',
      },
      {
        id: '4',
        name: 'Coach Roberto Silva',
        specialty: 'Coach Ejecutivo',
        category: 'business',
        rating: 4.6,
        reviews: 73,
        experience: '6 años',
        location: 'Centro de Desarrollo',
        avatar: 'https://via.placeholder.com/80',
        available: false,
        nextAvailable: '2024-07-15',
      },
      {
        id: '5',
        name: 'Est. Laura Fernández',
        specialty: 'Esteticista',
        category: 'beauty',
        rating: 4.9,
        reviews: 203,
        experience: '10 años',
        location: 'Spa Belleza Natural',
        avatar: 'https://via.placeholder.com/80',
        available: true,
        nextAvailable: '2024-07-08',
      },
    ];

    setProfessionals(mockProfessionals);
  };

  const filteredProfessionals = professionals.filter(professional => {
    const matchesSearch = professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         professional.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || professional.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const renderCategoryButton = (category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryButton,
        selectedCategory === category.id && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Ionicons 
        name={category.icon} 
        size={20} 
        color={selectedCategory === category.id ? 'white' : '#666'} 
      />
      <Text style={[
        styles.categoryText,
        selectedCategory === category.id && styles.categoryTextActive
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProfessionalCard = ({ item }) => (
    <TouchableOpacity
      style={styles.professionalCard}
      onPress={() => navigation.navigate('BookAppointment', { professionalId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={[
            styles.availabilityDot,
            { backgroundColor: item.available ? '#4CAF50' : '#FF9800' }
          ]} />
        </View>
        
        <View style={styles.professionalInfo}>
          <Text style={styles.professionalName}>{item.name}</Text>
          <Text style={styles.professionalSpecialty}>{item.specialty}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.reviewsText}>({item.reviews} reseñas)</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.bookButton,
            { backgroundColor: item.available ? '#4CAF50' : '#ccc' }
          ]}
          disabled={!item.available}
        >
          <Text style={styles.bookButtonText}>
            {item.available ? 'Reservar' : 'No disponible'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.detailText}>
            {item.available ? 'Disponible' : `Próximo: ${item.nextAvailable}`}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name="briefcase" size={16} color="#666" />
          <Text style={styles.detailText}>{item.experience} de experiencia</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <TurnarioLogo size="small" />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="#4caf50" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar profesionales o especialidades..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map(renderCategoryButton)}
      </ScrollView>

      <FlatList
        data={filteredProfessionals}
        renderItem={renderProfessionalCard}
        keyExtractor={item => item.id}
        style={styles.professionalsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.professionalsListContent}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 5,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  searchContainer: {
    padding: 15,
    backgroundColor: 'white',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#4caf50',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: 'white',
  },
  professionalsList: {
    flex: 1,
  },
  professionalsListContent: {
    padding: 15,
  },
  professionalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  availabilityDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  professionalInfo: {
    flex: 1,
    marginRight: 15,
  },
  professionalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewsText: {
    fontSize: 12,
    color: '#999',
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
});


