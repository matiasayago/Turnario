import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface GoogleIconProps {
  size?: number;
}

export default function GoogleIcon({ size = 20 }: GoogleIconProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('../assets/images/google-logo.png')}
        style={[styles.googleIcon, { width: size, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    // Logo oficial de Google descargado localmente
  },
});
