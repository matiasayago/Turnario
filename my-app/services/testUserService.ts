import { UserProfile } from './userService';

class TestUserService {
  // Usuarios de prueba
  private testUsers: UserProfile[] = [
    {
      _id: 'test_user_1',
      fullName: 'Dr. Carlos Mendoza',
      email: 'carlos.mendoza@turnario.com',
      phone: '+54911234567',
      userType: 'professional',
      isEmailVerified: true,
      isActive: true,
      address: {
        street: 'Av. Corrientes 1234',
        city: 'Buenos Aires',
        state: 'CABA',
        country: 'Argentina',
        postalCode: '1043',
        coordinates: {
          lat: -34.6037,
          lng: -58.3816
        }
      },
      preferences: {
        language: 'es',
        timezone: 'America/Argentina/Buenos_Aires',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'test_user_2',
      fullName: 'Dra. María González',
      email: 'maria.gonzalez@turnario.com',
      phone: '+54911234568',
      userType: 'professional',
      isEmailVerified: true,
      isActive: true,
      address: {
        street: 'Av. Santa Fe 5678',
        city: 'Buenos Aires',
        state: 'CABA',
        country: 'Argentina',
        postalCode: '1060',
        coordinates: {
          lat: -34.5895,
          lng: -58.3974
        }
      },
      preferences: {
        language: 'es',
        timezone: 'America/Argentina/Buenos_Aires',
        notifications: {
          email: true,
          push: true,
          sms: true
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'test_user_3',
      fullName: 'Juan Pérez',
      email: 'juan.perez@email.com',
      phone: '+54911234569',
      userType: 'client',
      isEmailVerified: true,
      isActive: true,
      address: {
        street: 'Calle Falsa 123',
        city: 'Buenos Aires',
        state: 'CABA',
        country: 'Argentina',
        postalCode: '1406',
        coordinates: {
          lat: -34.6118,
          lng: -58.3960
        }
      },
      preferences: {
        language: 'es',
        timezone: 'America/Argentina/Buenos_Aires',
        notifications: {
          email: true,
          push: false,
          sms: true
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'test_user_4',
      fullName: 'Ana García',
      email: 'ana.garcia@email.com',
      phone: '+54911234570',
      userType: 'client',
      isEmailVerified: true,
      isActive: true,
      address: {
        street: 'Av. Rivadavia 9876',
        city: 'Buenos Aires',
        state: 'CABA',
        country: 'Argentina',
        postalCode: '1033',
        coordinates: {
          lat: -34.6097,
          lng: -58.3731
        }
      },
      preferences: {
        language: 'es',
        timezone: 'America/Argentina/Buenos_Aires',
        notifications: {
          email: false,
          push: true,
          sms: true
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Obtener todos los usuarios
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      console.log('🔍 Obteniendo usuarios con servicio de prueba...');
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`✅ Usuarios obtenidos: ${this.testUsers.length} usuarios`);
      return this.testUsers;
    } catch (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      throw error;
    }
  }

  // Buscar usuarios por nombre
  async searchUsersByName(searchTerm: string): Promise<UserProfile[]> {
    try {
      console.log(`🔍 Buscando usuarios con término: "${searchTerm}"...`);
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const filteredUsers = this.testUsers.filter(user => 
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      console.log(`✅ Usuarios encontrados: ${filteredUsers.length} usuarios`);
      return filteredUsers;
    } catch (error) {
      console.error('❌ Error buscando usuarios:', error);
      throw error;
    }
  }

  // Obtener usuario por ID
  async getUserById(id: string): Promise<UserProfile | null> {
    try {
      console.log(`🔍 Obteniendo usuario con ID: ${id}...`);
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const user = this.testUsers.find(u => u._id === id);
      
      if (user) {
        console.log(`✅ Usuario encontrado: ${user.fullName}`);
        return user;
      } else {
        console.log(`⚠️ Usuario no encontrado con ID: ${id}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error obteniendo usuario por ID:', error);
      return null;
    }
  }

  // Obtener usuarios por tipo
  async getUsersByType(userType: 'client' | 'professional' | 'admin'): Promise<UserProfile[]> {
    try {
      console.log(`🔍 Obteniendo usuarios de tipo: ${userType}...`);
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const filteredUsers = this.testUsers.filter(user => user.userType === userType);
      
      console.log(`✅ Usuarios de tipo ${userType}: ${filteredUsers.length} usuarios`);
      return filteredUsers;
    } catch (error) {
      console.error('❌ Error obteniendo usuarios por tipo:', error);
      throw error;
    }
  }

  // Obtener estadísticas de usuarios
  async getUserStats(): Promise<{
    total: number;
    clients: number;
    professionals: number;
    active: number;
    verified: number;
  }> {
    try {
      console.log('📊 Obteniendo estadísticas de usuarios...');
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stats = {
        total: this.testUsers.length,
        clients: this.testUsers.filter(u => u.userType === 'client').length,
        professionals: this.testUsers.filter(u => u.userType === 'professional').length,
        active: this.testUsers.filter(u => u.isActive).length,
        verified: this.testUsers.filter(u => u.isEmailVerified).length
      };
      
      console.log('✅ Estadísticas obtenidas:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

// Instancia singleton
export const testUserService = new TestUserService();
export default testUserService;
