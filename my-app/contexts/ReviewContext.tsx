// @ts-nocheck � beta
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import type { User } from '../services/authService';
import { useAuth } from './AuthContext';

/** Misma clave que se guarda en `Review.userId` al crear reseñas. */
export function userKey(u: User | null | undefined): string {
  if (!u) return '';
  return String(u._id ?? u.id ?? u.userId ?? '').trim();
}

// Tipos para el sistema de reseñas
export interface AddReviewInput {
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  service: string;
  rating: number;
  comment: string;
  appointmentId: string;
  appointmentDate: string;
  isVerified?: boolean;
}

// Tipos para el sistema de reseñas
export interface Review {
  id: string;
  userId: string;
  userName: string;
  userType: 'client' | 'professional';
  targetId: string; // ID del profesional, servicio o clínica
  targetType: 'professional' | 'service' | 'clinic';
  rating: number; // 1-5 estrellas
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean; // Si la reseña es verificada
  helpfulCount: number; // Número de "me gusta" útiles
  reportCount: number; // Número de reportes
  isActive: boolean;
  /** Texto para “Mis reseñas” (opcional; rellenado al crear desde citas). */
  professionalName?: string;
  service?: string;
  appointmentDate?: string;
  appointmentId?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  verifiedReviews: number;
  recentReviews: number; // Últimos 30 días
}

export interface ReviewFilters {
  minRating?: number;
  maxRating?: number;
  verifiedOnly?: boolean;
  recentOnly?: boolean; // Últimos 30 días
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
}

interface ReviewContextType {
  // Estado
  reviews: Review[];
  currentReview: Review | null;
  reviewStats: ReviewStats | null;
  isLoading: boolean;
  
  // Acciones
  createReview: (targetId: string, targetType: Review['targetType'], rating: number, comment: string) => Promise<void>;
  /** Formulario de ajustes / citas (payload extendido); no muestra alertas propias. */
  addReview: (data: AddReviewInput) => Promise<boolean>;
  updateReview: (reviewId: string, rating: number, comment: string) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  markReviewAsHelpful: (reviewId: string) => Promise<void>;
  reportReview: (reviewId: string, reason: string) => Promise<void>;
  
  // Consultas
  getReviewsByTarget: (targetId: string, targetType: Review['targetType']) => Review[];
  getReviewsByUser: (userId: string) => Review[];
  getReviewStats: (targetId: string, targetType: Review['targetType']) => ReviewStats;
  searchReviews: (query: string, filters?: ReviewFilters) => Review[];
  
  // Utilidades
  canUserReview: (targetId: string, targetType: Review['targetType']) => boolean;
  hasUserReviewed: (targetId: string, targetType: Review['targetType']) => boolean;
  getUserReview: (targetId: string, targetType: Review['targetType']) => Review | undefined;
  formatRating: (rating: number) => string;
  getRatingColor: (rating: number) => string;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const useReviews = () => {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReviews debe ser usado dentro de ReviewProvider');
  }
  return context;
};

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentReview, setCurrentReview] = useState<Review | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Datos de ejemplo para desarrollo
  const mockReviews = useMemo((): Review[] => [
    {
      id: 'rev1',
      userId: 'client1',
      userName: 'María González',
      userType: 'client',
      targetId: '1', // Dra. Ana García
      targetType: 'professional',
      rating: 5,
      comment: 'Excelente profesional, muy atenta y dedicada. Recomiendo totalmente.',
      createdAt: new Date(Date.now() - 86400000), // 1 día atrás
      updatedAt: new Date(Date.now() - 86400000),
      isVerified: true,
      helpfulCount: 3,
      reportCount: 0,
      isActive: true
    },
    {
      id: 'rev2',
      userId: 'client2',
      userName: 'Carlos López',
      userType: 'client',
      targetId: '1', // Dra. Ana García
      targetType: 'professional',
      rating: 4,
      comment: 'Muy buena atención, profesional y puntual. Solo le faltó un poco más de explicación.',
      createdAt: new Date(Date.now() - 172800000), // 2 días atrás
      updatedAt: new Date(Date.now() - 172800000),
      isVerified: true,
      helpfulCount: 1,
      reportCount: 0,
      isActive: true
    },
    {
      id: 'rev3',
      userId: 'client3',
      userName: 'Ana Martínez',
      userType: 'client',
      targetId: '2', // Dr. Juan Martínez
      targetType: 'professional',
      rating: 5,
      comment: 'Increíble experiencia, el doctor es muy profesional y empático.',
      createdAt: new Date(Date.now() - 259200000), // 3 días atrás
      updatedAt: new Date(Date.now() - 259200000),
      isVerified: true,
      helpfulCount: 2,
      reportCount: 0,
      isActive: true
    },
    {
      id: 'rev4',
      userId: 'client4',
      userName: 'Luis Rodríguez',
      userType: 'client',
      targetId: '2', // Dr. Juan Martínez
      targetType: 'professional',
      rating: 3,
      comment: 'Atención regular, algo apurado pero resolvió mi problema.',
      createdAt: new Date(Date.now() - 345600000), // 4 días atrás
      updatedAt: new Date(Date.now() - 345600000),
      isVerified: false,
      helpfulCount: 0,
      reportCount: 0,
      isActive: true
    },
    {
      id: 'rev5',
      userId: 'client5',
      userName: 'Sofía Pérez',
      userType: 'client',
      targetId: '3', // Lic. María López
      targetType: 'professional',
      rating: 4,
      comment: 'Muy buena profesional, trato amable y resultados satisfactorios.',
      createdAt: new Date(Date.now() - 432000000), // 5 días atrás
      updatedAt: new Date(Date.now() - 432000000),
      isVerified: true,
      helpfulCount: 1,
      reportCount: 0,
      isActive: true
    }
  ], []);

  // Inicializar datos de ejemplo
  useEffect(() => {
    console.log('🚀 Inicializando ReviewContext con usuario:', userKey(user));
    setReviews(mockReviews);
  }, [mockReviews]);

  // Función para crear una reseña
  const createReview = useCallback(async (
    targetId: string, 
    targetType: Review['targetType'], 
    rating: number, 
    comment: string
  ): Promise<void> => {
    if (!user) {
      Alert.alert('Error', 'Debes estar autenticado para crear una reseña');
      return;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert('Error', 'La calificación debe ser entre 1 y 5 estrellas');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Error', 'Debes escribir un comentario');
      return;
    }

    // Verificar si el usuario ya reseñó este objetivo
    const uid = userKey(user);
    const existingReview = reviews.find(r => 
      r.userId === uid && 
      r.targetId === targetId && 
      r.targetType === targetType
    );

    if (existingReview) {
      Alert.alert('Error', 'Ya has creado una reseña para este objetivo');
      return;
    }

    const newReview: Review = {
      id: `rev_${Date.now()}_${Math.random()}`,
      userId: uid,
      userName: user.fullName || 'Usuario',
      userType: user.userType || 'client',
      targetId,
      targetType,
      rating,
      comment: comment.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isVerified: false, // Las reseñas nuevas no están verificadas
      helpfulCount: 0,
      reportCount: 0,
      isActive: true
    };

    console.log('⭐ Creando nueva reseña:', newReview);
    setReviews(prev => [newReview, ...prev]);

    // Actualizar estadísticas
    updateReviewStats(targetId, targetType);

    Alert.alert('Éxito', 'Reseña creada correctamente');
  }, [user, reviews]);

  // Función para actualizar una reseña
  const updateReview = useCallback(async (
    reviewId: string, 
    rating: number, 
    comment: string
  ): Promise<void> => {
    if (!user) {
      Alert.alert('Error', 'Debes estar autenticado para actualizar una reseña');
      return;
    }

    const review = reviews.find(r => r.id === reviewId);
    if (!review) {
      Alert.alert('Error', 'Reseña no encontrada');
      return;
    }

    if (review.userId !== userKey(user)) {
      Alert.alert('Error', 'Solo puedes actualizar tus propias reseñas');
      return;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert('Error', 'La calificación debe ser entre 1 y 5 estrellas');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Error', 'Debes escribir un comentario');
      return;
    }

    const updatedReview: Review = {
      ...review,
      rating,
      comment: comment.trim(),
      updatedAt: new Date()
    };

    console.log('✏️ Actualizando reseña:', updatedReview);
    setReviews(prev => 
      prev.map(r => r.id === reviewId ? updatedReview : r)
    );

    // Actualizar estadísticas
    updateReviewStats(review.targetId, review.targetType);

    Alert.alert('Éxito', 'Reseña actualizada correctamente');
  }, [user, reviews]);

  // Función para eliminar una reseña
  const deleteReview = useCallback(async (reviewId: string): Promise<void> => {
    if (!user) {
      Alert.alert('Error', 'Debes estar autenticado para eliminar una reseña');
      return;
    }

    const review = reviews.find(r => r.id === reviewId);
    if (!review) {
      Alert.alert('Error', 'Reseña no encontrada');
      return;
    }

    if (review.userId !== userKey(user)) {
      Alert.alert('Error', 'Solo puedes eliminar tus propias reseñas');
      return;
    }

    Alert.alert(
      'Eliminar Reseña',
      '¿Estás seguro de que quieres eliminar esta reseña?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ Eliminando reseña:', reviewId);
            setReviews(prev => prev.filter(r => r.id !== reviewId));

            // Actualizar estadísticas
            updateReviewStats(review.targetId, review.targetType);

            Alert.alert('Éxito', 'Reseña eliminada correctamente');
          }
        }
      ]
    );
  }, [user, reviews]);

  // Función para marcar reseña como útil
  const markReviewAsHelpful = useCallback(async (reviewId: string): Promise<void> => {
    if (!user) {
      Alert.alert('Error', 'Debes estar autenticado para marcar una reseña como útil');
      return;
    }

    const review = reviews.find(r => r.id === reviewId);
    if (!review) {
      Alert.alert('Error', 'Reseña no encontrada');
      return;
    }

    if (review.userId === userKey(user)) {
      Alert.alert('Error', 'No puedes marcar tu propia reseña como útil');
      return;
    }

    const updatedReview: Review = {
      ...review,
      helpfulCount: review.helpfulCount + 1
    };

    console.log('👍 Marcando reseña como útil:', updatedReview);
    setReviews(prev => 
      prev.map(r => r.id === reviewId ? updatedReview : r)
    );

    Alert.alert('Éxito', 'Reseña marcada como útil');
  }, [user, reviews]);

  // Función para reportar una reseña
  const reportReview = useCallback(async (reviewId: string, reason: string): Promise<void> => {
    if (!user) {
      Alert.alert('Error', 'Debes estar autenticado para reportar una reseña');
      return;
    }

    const review = reviews.find(r => r.id === reviewId);
    if (!review) {
      Alert.alert('Error', 'Reseña no encontrada');
      return;
    }

    if (review.userId === userKey(user)) {
      Alert.alert('Error', 'No puedes reportar tu propia reseña');
      return;
    }

    const updatedReview: Review = {
      ...review,
      reportCount: review.reportCount + 1
    };

    console.log('🚨 Reportando reseña:', { reviewId, reason, updatedReview });
    setReviews(prev => 
      prev.map(r => r.id === reviewId ? updatedReview : r)
    );

    Alert.alert('Éxito', 'Reseña reportada correctamente');
  }, [user, reviews]);

  // Función para obtener reseñas por objetivo
  const getReviewsByTarget = useCallback((
    targetId: string, 
    targetType: Review['targetType']
  ): Review[] => {
    return reviews.filter(r => 
      r.targetId === targetId && 
      r.targetType === targetType && 
      r.isActive
    );
  }, [reviews]);

  // Función para obtener reseñas por usuario
  const getReviewsByUser = useCallback((userId: string): Review[] => {
    return reviews.filter(r => r.userId === userId && r.isActive);
  }, [reviews]);

  // Función para obtener estadísticas de reseñas
  const getReviewStats = useCallback((
    targetId: string, 
    targetType: Review['targetType']
  ): ReviewStats => {
    const targetReviews = getReviewsByTarget(targetId, targetType);
    
    if (targetReviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        verifiedReviews: 0,
        recentReviews: 0
      };
    }

    const totalRating = targetReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / targetReviews.length;
    
    const ratingDistribution = {
      '1': targetReviews.filter(r => r.rating === 1).length,
      '2': targetReviews.filter(r => r.rating === 2).length,
      '3': targetReviews.filter(r => r.rating === 3).length,
      '4': targetReviews.filter(r => r.rating === 4).length,
      '5': targetReviews.filter(r => r.rating === 5).length
    };

    const verifiedReviews = targetReviews.filter(r => r.isVerified).length;
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentReviews = targetReviews.filter(r => r.createdAt > thirtyDaysAgo).length;

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Redondear a 1 decimal
      totalReviews: targetReviews.length,
      ratingDistribution,
      verifiedReviews,
      recentReviews
    };
  }, [getReviewsByTarget]);

  // Función para actualizar estadísticas
  const updateReviewStats = useCallback((
    targetId: string, 
    targetType: Review['targetType']
  ) => {
    const stats = getReviewStats(targetId, targetType);
    setReviewStats(stats);
  }, [getReviewStats]);

  const addReview = useCallback(async (data: AddReviewInput): Promise<boolean> => {
    if (!user) {
      return false;
    }
    if (data.rating < 1 || data.rating > 5 || !data.comment.trim()) {
      return false;
    }
    const uid = userKey(user);
    const existingReview = reviews.find(
      (r) =>
        r.userId === uid &&
        r.targetId === data.professionalId &&
        r.targetType === 'professional'
    );
    if (existingReview) {
      return false;
    }
    const newReview: Review = {
      id: `rev_${Date.now()}_${Math.random()}`,
      userId: uid || data.clientId,
      userName: data.clientName || user.fullName || 'Usuario',
      userType: user.userType === 'professional' ? 'professional' : 'client',
      targetId: data.professionalId,
      targetType: 'professional',
      rating: data.rating,
      comment: data.comment.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isVerified: data.isVerified ?? false,
      helpfulCount: 0,
      reportCount: 0,
      isActive: true,
      professionalName: data.professionalName,
      service: data.service,
      appointmentDate: data.appointmentDate,
      appointmentId: data.appointmentId,
    };
    setReviews((prev) => [newReview, ...prev]);
    updateReviewStats(data.professionalId, 'professional');
    return true;
  }, [user, reviews, updateReviewStats]);

  // Función para buscar reseñas
  const searchReviews = useCallback((
    query: string, 
    filters?: ReviewFilters
  ): Review[] => {
    let filteredReviews = reviews.filter(r => r.isActive);

    // Aplicar filtros
    if (filters) {
      if (filters.minRating) {
        filteredReviews = filteredReviews.filter(r => r.rating >= filters.minRating!);
      }
      
      if (filters.maxRating) {
        filteredReviews = filteredReviews.filter(r => r.rating <= filters.maxRating!);
      }
      
      if (filters.verifiedOnly) {
        filteredReviews = filteredReviews.filter(r => r.isVerified);
      }
      
      if (filters.recentOnly) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        filteredReviews = filteredReviews.filter(r => r.createdAt > thirtyDaysAgo);
      }
    }

    // Aplicar búsqueda de texto
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filteredReviews = filteredReviews.filter(r => 
        r.comment.toLowerCase().includes(searchTerm) ||
        r.userName.toLowerCase().includes(searchTerm)
      );
    }

    // Aplicar ordenamiento
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'newest':
          filteredReviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          break;
        case 'oldest':
          filteredReviews.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          break;
        case 'highest':
          filteredReviews.sort((a, b) => b.rating - a.rating);
          break;
        case 'lowest':
          filteredReviews.sort((a, b) => a.rating - b.rating);
          break;
        case 'helpful':
          filteredReviews.sort((a, b) => b.helpfulCount - a.helpfulCount);
          break;
      }
    }

    return filteredReviews;
  }, [reviews]);

  // Función para verificar si el usuario puede reseñar
  const canUserReview = useCallback((
    targetId: string, 
    targetType: Review['targetType']
  ): boolean => {
    if (!user) return false;
    
    // Verificar si ya reseñó
    const existingReview = reviews.find(r => 
      r.userId === userKey(user) && 
      r.targetId === targetId && 
      r.targetType === targetType
    );
    
    return !existingReview;
  }, [user, reviews]);

  // Función para verificar si el usuario ya reseñó
  const hasUserReviewed = useCallback((
    targetId: string, 
    targetType: Review['targetType']
  ): boolean => {
    if (!user) return false;
    
    const existingReview = reviews.find(r => 
      r.userId === userKey(user) && 
      r.targetId === targetId && 
      r.targetType === targetType
    );
    
    return !!existingReview;
  }, [user, reviews]);

  // Función para obtener la reseña del usuario
  const getUserReview = useCallback((
    targetId: string, 
    targetType: Review['targetType']
  ): Review | undefined => {
    if (!user) return undefined;
    
    return reviews.find(r => 
      r.userId === userKey(user) && 
      r.targetId === targetId && 
      r.targetType === targetType
    );
  }, [user, reviews]);

  // Función para formatear rating
  const formatRating = useCallback((rating: number): string => {
    return `${rating.toFixed(1)} ⭐`;
  }, []);

  // Función para obtener color del rating
  const getRatingColor = useCallback((rating: number): string => {
    if (rating >= 4.5) return '#4CAF50'; // Verde
    if (rating >= 3.5) return '#8BC34A'; // Verde claro
    if (rating >= 2.5) return '#FFC107'; // Amarillo
    if (rating >= 1.5) return '#FF9800'; // Naranja
    return '#F44336'; // Rojo
  }, []);

  const value: ReviewContextType = {
    // Estado
    reviews,
    currentReview,
    reviewStats,
    isLoading,
    
    // Acciones
    createReview,
    addReview,
    updateReview,
    deleteReview,
    markReviewAsHelpful,
    reportReview,
    
    // Consultas
    getReviewsByTarget,
    getReviewsByUser,
    getReviewStats,
    searchReviews,
    
    // Utilidades
    canUserReview,
    hasUserReviewed,
    getUserReview,
    formatRating,
    getRatingColor
  };

  return (
    <ReviewContext.Provider value={value}>
      {children}
    </ReviewContext.Provider>
  );
};
