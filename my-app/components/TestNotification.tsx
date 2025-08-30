import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';

export const TestNotification = () => {
  const { notifications, addNotification } = useNotifications();
  
  const handleTestNotification = () => {
    addNotification({
      type: 'reminder',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipientId: 'test-user',
      senderId: 'system',
      senderName: 'System',
    });
  };

  return (
    <View style={{ padding: 20, backgroundColor: '#f0f0f0', margin: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Test Notification Component</Text>
      <Text>Notifications count: {notifications.length}</Text>
      <TouchableOpacity 
        onPress={handleTestNotification}
        style={{ 
          backgroundColor: '#007AFF', 
          padding: 10, 
          borderRadius: 5, 
          marginTop: 10 
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Add Test Notification</Text>
      </TouchableOpacity>
    </View>
  );
};

