import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicalDocument } from '../contexts/MedicalHistoryContext';

interface MedicalDocumentItemProps {
  document: MedicalDocument;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MedicalDocumentItem: React.FC<MedicalDocumentItemProps> = ({ 
  document, 
  onPress, 
  onEdit, 
  onDelete 
}) => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'lab_result': return 'Resultado de Laboratorio';
      case 'imaging': return 'Imagen Médica';
      case 'report': return 'Informe';
      case 'certificate': return 'Certificado';
      case 'other': return 'Otro';
      default: return type;
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'lab_result': return 'flask';
      case 'imaging': return 'scan';
      case 'report': return 'document-text';
      case 'certificate': return 'ribbon';
      case 'other': return 'document';
      default: return 'document';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'lab_result': return '#2196F3';
      case 'imaging': return '#4CAF50';
      case 'report': return '#FF9800';
      case 'certificate': return '#9C27B0';
      case 'other': return '#666';
      default: return '#666';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    if (document.fileUrl) {
      try {
        await Linking.openURL(document.fileUrl);
      } catch (error) {
        console.error('Error al abrir el documento:', error);
      }
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <View style={[styles.typeIcon, { backgroundColor: getTypeColor(document.type) }]}>
            <Ionicons name={getTypeIcon(document.type) as any} size={20} color="#fff" />
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeLabel}>{getTypeLabel(document.type)}</Text>
            <Text style={styles.uploadDate}>{formatDate(document.uploadDate)}</Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: document.isActive ? '#4CAF50' : '#F44336' }]}>
            <Text style={styles.statusText}>
              {document.isActive ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>{document.title}</Text>
        <Text style={styles.description}>{document.description}</Text>
      </View>

      <View style={styles.professionalContainer}>
        <Ionicons name="person" size={16} color="#666" />
        <Text style={styles.professional}>{document.professionalName}</Text>
      </View>

      {document.fileName && (
        <View style={styles.fileInfoContainer}>
          <Ionicons name="document" size={16} color="#666" />
          <View style={styles.fileDetails}>
            <Text style={styles.fileName}>{document.fileName}</Text>
            {document.fileSize && (
              <Text style={styles.fileSize}>{formatFileSize(document.fileSize)}</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.actionsContainer}>
        {document.fileUrl && (
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <Ionicons name="download" size={16} color="#2196F3" />
            <Text style={styles.downloadText}>Descargar</Text>
          </TouchableOpacity>
        )}
        
        {(onEdit || onDelete) && (
          <View style={styles.editActionsContainer}>
            {onEdit && (
              <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}>
                <Ionicons name="create" size={16} color="#2196F3" />
                <Text style={[styles.actionText, styles.editText]}>Editar</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
                <Ionicons name="trash" size={16} color="#F44336" />
                <Text style={[styles.actionText, styles.deleteText]}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  uploadDate: {
    fontSize: 12,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  contentContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  professionalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  professional: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  downloadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
    marginLeft: 4,
  },
  editActionsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  editButton: {
    backgroundColor: '#E3F2FD',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  editText: {
    color: '#2196F3',
  },
  deleteText: {
    color: '#F44336',
  },
});
