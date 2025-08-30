import { useState, useEffect, useCallback } from 'react';
import { userService, User, showApiError } from '../services';

interface UseUsersReturn {
  users: User[];
  clients: User[];
  professionals: User[];
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
  searchUsers: (searchTerm: string) => Promise<User[]>;
  getUserById: (id: string) => Promise<User | null>;
}

export const useUsers = (): UseUsersReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar todos los usuarios
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
      
      // Separar usuarios por tipo
      const clientUsers = allUsers.filter(user => user.userType === 'client');
      const professionalUsers = allUsers.filter(user => user.userType === 'professional');
      
      setClients(clientUsers);
      setProfessionals(professionalUsers);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      showApiError(err, 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para refrescar usuarios
  const refreshUsers = useCallback(async () => {
    await loadUsers();
  }, [loadUsers]);

  // Función para buscar usuarios
  const searchUsers = useCallback(async (searchTerm: string): Promise<User[]> => {
    try {
      if (!searchTerm.trim()) {
        return users;
      }
      
      return await userService.searchUsersByName(searchTerm);
    } catch (err) {
      console.error('Error en búsqueda de usuarios:', err);
      return [];
    }
  }, [users]);

  // Función para obtener usuario por ID
  const getUserById = useCallback(async (id: string): Promise<User | null> => {
    try {
      return await userService.getUserById(id);
    } catch (err) {
      console.error('Error obteniendo usuario por ID:', err);
      return null;
    }
  }, []);

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

