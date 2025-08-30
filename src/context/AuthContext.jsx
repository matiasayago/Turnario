import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  token: null,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload 
      };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('🔄 Cargando autenticación almacenada...');
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('👤 Usuario encontrado en almacenamiento:', user);
        dispatch({ type: 'SET_USER', payload: user });
        console.log('✅ Usuario cargado exitosamente');
      } else {
        console.log('ℹ️ No hay usuario almacenado');
      }
    } catch (error) {
      console.error('💥 Error cargando autenticación:', error);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Intentando login con:', email, password);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // Simulación de login simple
      if (email === 'test@example.com' && password === 'password') {
        console.log('✅ Login exitoso, creando usuario...');
        const user = {
          id: '1',
          email,
          name: 'Usuario Test',
          phone: '+1234567890',
          userType: 'professional', // Cambiado a profesional para acceder a horarios
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        console.log('💾 Guardando usuario en AsyncStorage...');
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        console.log('👤 Usuario guardado, actualizando estado...');
        dispatch({ type: 'SET_USER', payload: user });
        console.log('🎉 Login completado exitosamente');
        return;
      }
      
      // Login fallido
      console.log('❌ Credenciales inválidas');
      throw new Error('Credenciales inválidas. Usa test@example.com / password');
    } catch (error) {
      console.error('💥 Error en login:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const user = {
        id: Date.now().toString(),
        email: userData.email,
        name: userData.name,
        phone: userData.phone || '',
        userType: userData.userType || 'client',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user_data');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Error durante el logout:', error);
    }
  };

  const updateProfile = async (userData) => {
    try {
      console.log('📝 Actualizando perfil con datos:', userData);
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const updatedUser = { ...state.user, ...userData };
      console.log('👤 Usuario actualizado:', updatedUser);
      
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      console.log('💾 Usuario guardado en AsyncStorage');
      
      dispatch({ type: 'SET_USER', payload: updatedUser });
      console.log('🎉 Perfil actualizado exitosamente');
    } catch (error) {
      console.error('💥 Error actualizando perfil:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const switchUserType = async (newUserType) => {
    try {
      console.log('🔄 Cambiando tipo de usuario a:', newUserType);
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const updatedUser = { ...state.user, userType: newUserType };
      console.log('👤 Usuario actualizado:', updatedUser);
      
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      console.log('💾 Usuario guardado en AsyncStorage');
      
      dispatch({ type: 'SET_USER', payload: updatedUser });
      console.log('🎉 Tipo de usuario cambiado exitosamente');
    } catch (error) {
      console.error('💥 Error cambiando tipo de usuario:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    switchUserType,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
