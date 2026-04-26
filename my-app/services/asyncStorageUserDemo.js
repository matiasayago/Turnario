import AsyncStorage from '@react-native-async-storage/async-storage';

class UserService {
  // Obtener todos los usuarios
  static async getAllUsers() {
    try {
      const stored = await AsyncStorage.getItem('users');
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Obtener usuarios por tipo
  static async getUsersByType(userType) {
    try {
      const users = await this.getAllUsers();
      return users.filter(user => user.userType === userType);
    } catch (error) {
      console.error('Error getting users by type:', error);
      return [];
    }
  }

  // Obtener usuarios de tipo cliente
  static async getClientUsers() {
    return this.getUsersByType('client');
  }

  // Obtener usuarios de tipo profesional
  static async getProfessionalUsers() {
    return this.getUsersByType('professional');
  }

  // Crear nuevo usuario
  static async createUser(userData) {
    try {
      const users = await this.getAllUsers();
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      users.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(users));
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Actualizar usuario
  static async updateUser(userId, userData) {
    try {
      const users = await this.getAllUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        throw new Error('Usuario no encontrado');
      }
      
      users[userIndex] = {
        ...users[userIndex],
        ...userData,
        updatedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('users', JSON.stringify(users));
      return users[userIndex];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Eliminar usuario
  static async deleteUser(userId) {
    try {
      const users = await this.getAllUsers();
      const filteredUsers = users.filter(user => user.id !== userId);
      await AsyncStorage.setItem('users', JSON.stringify(filteredUsers));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Buscar usuarios por nombre o email
  static async searchUsers(query, userType = null) {
    try {
      let users = await this.getAllUsers();
      
      if (userType) {
        users = users.filter(user => user.userType === userType);
      }
      
      if (query) {
        const searchTerm = (query || '').toLowerCase();
        users = users.filter(user => 
          user.name && user.name.toLowerCase().includes(searchTerm) ||
          user.email && user.email.toLowerCase().includes(searchTerm)
        );
      }
      
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // Obtener usuario por ID
  static async getUserById(userId) {
    try {
      const users = await this.getAllUsers();
      return users.find(user => user.id === userId);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Inicializar usuarios de ejemplo si no existen
  static async initializeSampleUsers() {
    try {
      const existingUsers = await this.getAllUsers();
      
      if (existingUsers.length === 0) {
        const sampleUsers = [
          {
            id: 'client_1',
            name: 'Ana Martínez',
            email: 'ana.martinez@email.com',
            phone: '+1234567890',
            userType: 'client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'client_2',
            name: 'Luis Rodríguez',
            email: 'luis.rodriguez@email.com',
            phone: '+1234567891',
            userType: 'client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'client_3',
            name: 'María González',
            email: 'maria.gonzalez@email.com',
            phone: '+1234567892',
            userType: 'client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'client_4',
            name: 'Carlos López',
            email: 'carlos.lopez@email.com',
            phone: '+1234567893',
            userType: 'client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'client_5',
            name: 'Sofia Torres',
            email: 'sofia.torres@email.com',
            phone: '+1234567894',
            userType: 'client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        
        await AsyncStorage.setItem('users', JSON.stringify(sampleUsers));
        console.log('Usuarios de ejemplo inicializados');
      }
    } catch (error) {
      console.error('Error initializing sample users:', error);
    }
  }
}

export default UserService;
