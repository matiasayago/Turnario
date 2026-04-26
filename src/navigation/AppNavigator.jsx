import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

// Professional Screens
import { ProfessionalDashboard } from '../screens/ProfessionalDashboard';
import { ScheduleScreen } from '../screens/ScheduleScreen';

// Client Screens
import { BookAppointmentScreen } from '../screens/BookAppointmentScreen';
import { ClientDashboard } from '../screens/ClientDashboard';
import { ClientAppointmentsScreen } from '../screens/ClientAppointmentsScreen';
import { ClientStatsScreen } from '../screens/ClientStatsScreen';
import { ExploreProfessionalsScreen } from '../screens/ExploreProfessionalsScreen';

// Common Screens
import { ProfileScreen } from '../screens/ProfileScreen';
import { AppointmentDetailsScreen } from '../screens/AppointmentDetailsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const ProfessionalTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Hoy':
            iconName = focused ? 'today' : 'today-outline';
            break;
          case 'Calendario':
            iconName = focused ? 'calendar' : 'calendar-outline';
            break;
          case 'Estadistica':
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            break;
          case 'Configuracion':
            iconName = focused ? 'settings' : 'settings-outline';
            break;
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#667eea',
      tabBarInactiveTintColor: '#666',
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
      },
    })}
  >
    <Tab.Screen
      name="Hoy"
      component={ProfessionalDashboard}
      options={{ title: 'Hoy' }}
    />
    <Tab.Screen
      name="Calendario"
      component={ScheduleScreen}
      options={{ title: 'Calendario' }}
    />
    <Tab.Screen
      name="Estadistica"
      component={NotificationsScreen}
      options={{ title: 'Estadística' }}
    />
    <Tab.Screen
      name="Configuracion"
      component={ProfileScreen}
      options={{ title: 'Configuración' }}
    />
  </Tab.Navigator>
);

const ClientTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Hoy':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'Calendario':
            iconName = focused ? 'calendar' : 'calendar-outline';
            break;
          case 'Estadistica':
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            break;
          case 'Configuracion':
            iconName = focused ? 'settings' : 'settings-outline';
            break;
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#667eea',
      tabBarInactiveTintColor: '#666',
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
      },
    })}
  >
    <Tab.Screen
      name="Hoy"
      component={ClientDashboard}
      options={{ title: 'Hoy' }}
    />
    <Tab.Screen
      name="Calendario"
      component={ClientAppointmentsScreen}
      options={{ title: 'Calendario' }}
    />
    <Tab.Screen
      name="Estadistica"
      component={ClientStatsScreen}
      options={{ title: 'Estadística' }}
    />
    <Tab.Screen
      name="Configuracion"
      component={ProfileScreen}
      options={{ title: 'Configuración' }}
    />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const { isAuthenticated, user } = useAuth();

  console.log('🧭 AppNavigator - isAuthenticated:', isAuthenticated, 'user:', user?.email);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen 
            name="Main" 
            component={user?.userType === 'professional' ? ProfessionalTabs : ClientTabs} 
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
