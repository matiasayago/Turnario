import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TermsAndConditions() {
  const handleAccept = () => {
    // Aquí podrías guardar la aceptación en AsyncStorage
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Términos y Condiciones</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Términos y Condiciones de Uso</Text>
        
        <Text style={styles.sectionTitle}>1. Aceptación de los Términos</Text>
        <Text style={styles.text}>
          Al acceder y utilizar la aplicación Turnario, usted acepta estar sujeto a estos términos y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestra aplicación.
        </Text>

        <Text style={styles.sectionTitle}>2. Descripción del Servicio</Text>
        <Text style={styles.text}>
          Turnario es una aplicación móvil que facilita la gestión de citas médicas, permitiendo a los usuarios programar, modificar y cancelar citas con profesionales de la salud de manera eficiente y segura.
        </Text>

        <Text style={styles.sectionTitle}>3. Uso de la Aplicación</Text>
        <Text style={styles.text}>
          Usted se compromete a utilizar la aplicación de manera responsable y conforme a la ley. Está prohibido:
        </Text>
        <Text style={styles.bulletPoint}>• Utilizar la aplicación para fines ilegales o no autorizados</Text>
        <Text style={styles.bulletPoint}>• Intentar acceder a cuentas de otros usuarios</Text>
        <Text style={styles.bulletPoint}>• Interferir con el funcionamiento normal de la aplicación</Text>
        <Text style={styles.bulletPoint}>• Transmitir contenido malicioso o inapropiado</Text>

        <Text style={styles.sectionTitle}>4. Privacidad y Protección de Datos</Text>
        <Text style={styles.text}>
          Respetamos su privacidad y nos comprometemos a proteger sus datos personales. Toda la información médica y personal se maneja con estrictos protocolos de seguridad y confidencialidad, cumpliendo con las normativas de protección de datos aplicables.
        </Text>

        <Text style={styles.sectionTitle}>5. Responsabilidades del Usuario</Text>
        <Text style={styles.text}>
          Usted es responsable de:
        </Text>
        <Text style={styles.bulletPoint}>• Mantener la confidencialidad de su cuenta</Text>
        <Text style={styles.bulletPoint}>• Proporcionar información veraz y actualizada</Text>
        <Text style={styles.bulletPoint}>• Cumplir con las citas programadas</Text>
        <Text style={styles.bulletPoint}>• Notificar cambios en su información de contacto</Text>

        <Text style={styles.sectionTitle}>6. Limitación de Responsabilidad</Text>
        <Text style={styles.text}>
          Turnario no se hace responsable por daños directos, indirectos, incidentales o consecuenciales que puedan resultar del uso de la aplicación. La aplicación se proporciona "tal como está" sin garantías de ningún tipo.
        </Text>

        <Text style={styles.sectionTitle}>7. Modificaciones</Text>
        <Text style={styles.text}>
          Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en la aplicación. Su uso continuado de la aplicación constituye la aceptación de los términos modificados.
        </Text>

        <Text style={styles.sectionTitle}>8. Terminación</Text>
        <Text style={styles.text}>
          Podemos suspender o terminar su acceso a la aplicación en cualquier momento, con o sin causa, con o sin previo aviso, por cualquier motivo, incluyendo la violación de estos términos.
        </Text>

        <Text style={styles.sectionTitle}>9. Ley Aplicable</Text>
        <Text style={styles.text}>
          Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será resuelta por los tribunales competentes de la Ciudad de Buenos Aires.
        </Text>

        <Text style={styles.sectionTitle}>10. Contacto</Text>
        <Text style={styles.text}>
          Si tiene preguntas sobre estos términos y condiciones, puede contactarnos a través de la aplicación o en nuestro sitio web oficial.
        </Text>

        <Text style={styles.lastUpdated}>
          Última actualización: {new Date().toLocaleDateString('es-AR')}
        </Text>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.acceptButtonText}>Aceptar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    marginBottom: 15,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    marginLeft: 10,
    marginBottom: 5,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
