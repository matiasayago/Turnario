// @ts-nocheck � beta
import { useState, useEffect, useCallback } from 'react';
import { userService, UserProfile, showApiError } from '../services';
import { testUserService } from '../services/testUserService';
import { useAuth } from '../contexts/AuthContext';

interface UseUsersReturn {
  users: UserProfile[];
  clients: UserProfile[];
  professionals: UserProfile[];
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
  searchUsers: (searchTerm: string) => Promise<UserProfile[]>;
  getUserById: (id: string) => Promise<UserProfile | null>;
}

export const useUsers = (): UseUsersReturn => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Obtener estado de autenticación
  let isAuthenticated = false;
  try {
    const { user } = useAuth();
    isAuthenticated = !!user;
  } catch (error) {
    console.warn('AuthContext no disponible, usando servicio de prueba');
    isAuthenticated = false;
  }

  // Función para cargar todos los usuarios
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let allUsers: UserProfile[];
      
      // Siempre intentar usar el servicio de prueba primero para evitar errores de autenticación
      if (isAuthenticated) {
        try {
          console.log('🔐 Usuario autenticado, intentando cargar usuarios del backend...');
          allUsers = await userService.getAllUsers();
          console.log('✅ Usuarios obtenidos del backend:', allUsers.length);
        } catch (backendError) {
          console.warn('⚠️ Error con backend, usando datos de prueba:', backendError.message);
          allUsers = await testUserService.getAllUsers();
        }
      } else {
        console.log('⚠️ No hay autenticación, cargando usuarios de prueba...');
        allUsers = await testUserService.getAllUsers();
      }
      
      setUsers(allUsers);
      
      // Separar usuarios por tipo
      const clientUsers = allUsers.filter(user => user.userType === 'client');
      const professionalUsers = allUsers.filter(user => user.userType === 'professional');
      
      setClients(clientUsers);
      setProfessionals(professionalUsers);
      
      console.log(`✅ Usuarios cargados: ${allUsers.length} total, ${clientUsers.length} clientes, ${professionalUsers.length} profesionales`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ Error cargando usuarios:', err);
      
      // Fallback a datos de prueba si hay error
      try {
        console.log('🔄 Intentando fallback a datos de prueba...');
        const fallbackUsers = await testUserService.getAllUsers();
        setUsers(fallbackUsers);
        
        const clientUsers = fallbackUsers.filter(user => user.userType === 'client');
        const professionalUsers = fallbackUsers.filter(user => user.userType === 'professional');
        
        setClients(clientUsers);
        setProfessionals(professionalUsers);
        
        console.log('✅ Fallback exitoso, usando datos de prueba');
        setError(null);
      } catch (fallbackError) {
        console.error('❌ Error en fallback:', fallbackError);
        showApiError(err, 'Error al cargar usuarios');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Función para refrescar usuarios
  const refreshUsers = useCallback(async () => {
    await loadUsers();
  }, [loadUsers]);

  // Función para buscar usuarios
  const searchUsers = useCallback(async (searchTerm: string): Promise<UserProfile[]> => {
    try {
      if (!searchTerm.trim()) {
        return users;
      }
      
      if (isAuthenticated) {
        return await userService.searchUsersByName(searchTerm);
      } else {
        return await testUserService.searchUsersByName(searchTerm);
      }
    } catch (err) {
      console.error('Error en búsqueda de usuarios:', err);
      // Fallback a búsqueda local
      return users.filter(user => 
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [users, isAuthenticated]);

  // Función para obtener usuario por ID
  const getUserById = useCallback(async (id: string): Promise<UserProfile | null> => {
    try {
      if (isAuthenticated) {
        return await userService.getUserById(id);
      } else {
        return await testUserService.getUserById(id);
      }
    } catch (err) {
      console.error('Error obteniendo usuario por ID:', err);
      // Fallback a búsqueda local
      return users.find(user => user._id === id) || null;
    }
  }, [users, isAuthenticated]);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    clients,
    professionals,
    loading,
    error,
    refreshUsers,
    searchUsers,
    getUserById,
  };
};

export default useUsers;

