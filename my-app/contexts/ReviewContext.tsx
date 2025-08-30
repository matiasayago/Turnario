import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Review {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  service: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  appointmentId: string;
  appointmentDate: string;
  createdAt: Date;
  isVerified: boolean; // Si la reseña es de una cita confirmada
}

interface ReviewContextType {
  reviews: Review[];
  addReview: (reviewData: Omit<Review, 'id' | 'createdAt'>) => Promise<boolean>;
  updateReview: (reviewId: string, updates: Partial<Review>) => Promise<boolean>;
  deleteReview: (reviewId: string) => Promise<boolean>;
  getReviewsByUser: (userId: string) => Review[];
  getReviewsForProfessional: (professionalId: string) => Review[];
  getAverageRating: (professionalId: string) => number;
  canUserReview: (clientId: string, professionalId: string, appointmentId: string) => boolean;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const useReviews = () => {
  const context = useContext(ReviewContext);
  if (!context) {
    console.error('useReviews must be used within a ReviewProvider');
    // Retornar un objeto por defecto en lugar de lanzar un error
    return {
      reviews: [],
      addReview: () => console.warn('ReviewProvider not available'),
      deleteReview: () => console.warn('ReviewProvider not available'),
      getReviewsForUser: () => [],
    };
  }
  return context;
};

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const savedReviews = await AsyncStorage.getItem('reviews');
      if (savedReviews) {
        const parsed = JSON.parse(savedReviews);
        // Convertir timestamps de string a Date
        const reviewsWithDates = parsed.map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
        }));
        setReviews(reviewsWithDates);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const saveReviews = async (newReviews: Review[]) => {
    try {
      await AsyncStorage.setItem('reviews', JSON.stringify(newReviews));
    } catch (error) {
      console.error('Error saving reviews:', error);
    }
  };

  const addReview = async (reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      const newReview: Review = {
        ...reviewData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
      };

      const updatedReviews = [newReview, ...reviews];
      setReviews(updatedReviews);
      await saveReviews(updatedReviews);

      console.log('⭐ Nueva reseña agregada:', newReview);
      return true;
    } catch (error) {
      console.error('Error adding review:', error);
      return false;
    }
  };

  const updateReview = async (reviewId: string, updates: Partial<Review>): Promise<boolean> => {
    try {
      const updatedReviews = reviews.map(review =>
        review.id === reviewId ? { ...review, ...updates } : review
      );
      setReviews(updatedReviews);
      await saveReviews(updatedReviews);

      console.log('⭐ Reseña actualizada:', reviewId);
      return true;
    } catch (error) {
      console.error('Error updating review:', error);
      return false;
    }
  };

  const deleteReview = async (reviewId: string): Promise<boolean> => {
    try {
      const updatedReviews = reviews.filter(review => review.id !== reviewId);
      setReviews(updatedReviews);
      await saveReviews(updatedReviews);

      console.log('⭐ Reseña eliminada:', reviewId);
      return true;
    } catch (error) {
      console.error('Error deleting review:', error);
      return false;
    }
  };

  const getReviewsByUser = (userId: string): Review[] => {
    return reviews
      .filter(review => review.clientId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  const getReviewsForProfessional = (professionalId: string): Review[] => {
    return reviews
      .filter(review => review.professionalId === professionalId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  const getAverageRating = (professionalId: string): number => {
    const professionalReviews = getReviewsForProfessional(professionalId);
    if (professionalReviews.length === 0) return 0;
    
    const totalRating = professionalReviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((totalRating / professionalReviews.length) * 10) / 10;
  };

  const canUserReview = (clientId: string, professionalId: string, appointmentId: string): boolean => {
    // Verificar si el usuario ya hizo una reseña para esta cita
    const existingReview = reviews.find(
      review => review.clientId === clientId && review.appointmentId === appointmentId
    );
    return !existingReview;
  };

  const value: ReviewContextType = {
    reviews,
    addReview,
    updateReview,
    deleteReview,
    getReviewsByUser,
    getReviewsForProfessional,
    getAverageRating,
    canUserReview,
  };

  return (
    <ReviewContext.Provider value={value}>
      {children}
    </ReviewContext.Provider>
  );
};
