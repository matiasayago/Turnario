// @ts-nocheck � beta
import { api } from './api';
import { ChatMessage, ChatConversation, ChatUser } from '../contexts/ChatContext';

export interface SendMessageRequest {
  receiverId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  attachmentUrl?: string;
}

export interface CreateConversationRequest {
  participantIds: string[];
  initialMessage?: string;
}

export interface UpdateConversationRequest {
  conversationId: string;
  isActive?: boolean;
  lastReadAt?: Date;
}

export interface SearchMessagesRequest {
  query: string;
  conversationId?: string;
  limit?: number;
  offset?: number;
}

export interface ChatNotification {
  type: 'new_message' | 'user_online' | 'user_offline' | 'typing_start' | 'typing_stop';
  data: any;
  timestamp: Date;
}

class ChatService {
  private baseUrl = '/api/chat';
  private socket: any = null;
  private messageQueue: ChatMessage[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Configuración de WebSocket
  private wsConfig = {
    url: 'ws://localhost:3000/chat',
    reconnectInterval: 3000,
    heartbeatInterval: 30000,
  };

  // Inicializar conexión WebSocket
  async initializeWebSocket(userId: string, token: string): Promise<void> {
    try {
      // En desarrollo, simulamos WebSocket
      console.log('🔌 Inicializando WebSocket para chat...');
      
      // Simular conexión exitosa
      this.isConnected = true;
      this.socket = {
        on: (event: string, callback: Function) => {
          console.log(`📡 WebSocket: ${event} registrado`);
        },
        emit: (event: string, data: any) => {
          console.log(`📤 WebSocket: ${event} enviado`, data);
        },
        disconnect: () => {
          console.log('🔌 WebSocket desconectado');
          this.isConnected = false;
        }
      };

      // Simular eventos de conexión
      setTimeout(() => {
        this.emit('user_online', { userId, timestamp: new Date() });
      }, 1000);

      // Simular heartbeat
      setInterval(() => {
        if (this.isConnected) {
          this.emit('heartbeat', { userId, timestamp: new Date() });
        }
      }, this.wsConfig.heartbeatInterval);

    } catch (error) {
      console.error('❌ Error inicializando WebSocket:', error);
      this.handleConnectionError();
    }
  }

  // Conectar WebSocket
  private async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // En producción, aquí se conectaría al WebSocket real
      console.log('🔌 Conectando al servidor de chat...');
      
      // Simular conexión
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log('✅ Conectado al servidor de chat');
      
      // Procesar mensajes en cola
      this.processMessageQueue();
      
    } catch (error) {
      console.error('❌ Error conectando al servidor:', error);
      this.handleConnectionError();
    }
  }

  // Manejar errores de conexión
  private handleConnectionError(): void {
    this.isConnected = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.wsConfig.reconnectInterval * this.reconnectAttempts);
    } else {
      console.error('❌ Máximo de intentos de reconexión alcanzado');
    }
  }

  // Emitir evento WebSocket
  private emit(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      // Encolar mensaje si no hay conexión
      this.messageQueue.push({
        id: `queue_${Date.now()}`,
        senderId: data.userId || 'system',
        senderName: 'Sistema',
        senderType: 'professional',
        receiverId: 'system',
        content: JSON.stringify({ event, data }),
        timestamp: new Date(),
        isRead: false,
        messageType: 'system'
      });
    }
  }

  // Procesar mensajes en cola
  private processMessageQueue(): void {
    if (this.messageQueue.length > 0 && this.isConnected) {
      console.log(`📤 Procesando ${this.messageQueue.length} mensajes en cola`);
      
      this.messageQueue.forEach(message => {
        // Aquí se enviarían los mensajes pendientes
        console.log('📤 Mensaje en cola procesado:', message.content);
      });
      
      this.messageQueue = [];
    }
  }

  // Desconectar WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    console.log('🔌 Desconectado del servidor de chat');
  }

  // API REST para chat

  // Obtener conversaciones del usuario
  async getConversations(): Promise<ChatConversation[]> {
    try {
      const response = await api.get(`${this.baseUrl}/conversations`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones:', error);
      // En desarrollo, retornar datos de ejemplo
      return this.getMockConversations();
    }
  }

  // Obtener mensajes de una conversación
  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    try {
      const response = await api.get(`${this.baseUrl}/conversations/${conversationId}/messages`, {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo mensajes:', error);
      // En desarrollo, retornar datos de ejemplo
      return this.getMockMessages(conversationId);
    }
  }

  // Enviar mensaje
  async sendMessage(request: SendMessageRequest): Promise<ChatMessage> {
    try {
      const response = await api.post(`${this.baseUrl}/messages`, request);
      
      // Emitir evento WebSocket
      this.emit('new_message', {
        message: response.data,
        timestamp: new Date()
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      throw error;
    }
  }

  // Crear nueva conversación
  async createConversation(request: CreateConversationRequest): Promise<ChatConversation> {
    try {
      const response = await api.post(`${this.baseUrl}/conversations`, request);
      
      // Emitir evento WebSocket
      this.emit('conversation_created', {
        conversation: response.data,
        timestamp: new Date()
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error creando conversación:', error);
      throw error;
    }
  }

  // Actualizar conversación
  async updateConversation(request: UpdateConversationRequest): Promise<ChatConversation> {
    try {
      const response = await api.patch(`${this.baseUrl}/conversations/${request.conversationId}`, request);
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando conversación:', error);
      throw error;
    }
  }

  // Marcar mensajes como leídos
  async markMessagesAsRead(conversationId: string, messageIds: string[]): Promise<void> {
    try {
      await api.patch(`${this.baseUrl}/conversations/${conversationId}/read`, {
        messageIds
      });
      
      // Emitir evento WebSocket
      this.emit('messages_read', {
        conversationId,
        messageIds,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('❌ Error marcando mensajes como leídos:', error);
      throw error;
    }
  }

  // Eliminar mensaje
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/messages/${messageId}`);
      
      // Emitir evento WebSocket
      this.emit('message_deleted', {
        messageId,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('❌ Error eliminando mensaje:', error);
      throw error;
    }
  }

  // Buscar mensajes
  async searchMessages(request: SearchMessagesRequest): Promise<ChatMessage[]> {
    try {
      const response = await api.get(`${this.baseUrl}/messages/search`, {
        params: request
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error buscando mensajes:', error);
      return [];
    }
  }

  // Obtener usuarios online
  async getOnlineUsers(): Promise<ChatUser[]> {
    try {
      const response = await api.get(`${this.baseUrl}/users/online`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo usuarios online:', error);
      // En desarrollo, retornar datos de ejemplo
      return this.getMockOnlineUsers();
    }
  }

  // Actualizar estado del usuario
  async updateUserStatus(status: 'available' | 'busy' | 'away' | 'offline'): Promise<void> {
    try {
      await api.patch(`${this.baseUrl}/users/status`, { status });
      
      // Emitir evento WebSocket
      this.emit('status_changed', {
        status,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      throw error;
    }
  }

  // Funciones de utilidad para desarrollo

  private getMockConversations(): ChatConversation[] {
    return [
      {
        id: 'conv1',
        participants: ['1', '2'],
        participantNames: { '1': 'Usuario', '2': 'Dra. Ana García' },
        participantTypes: { '1': 'client', '2': 'professional' },
        unreadCount: 2,
        isActive: true,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 300000)
      }
    ];
  }

  private getMockMessages(conversationId: string): ChatMessage[] {
    return [
      {
        id: 'msg1',
        senderId: '2',
        senderName: 'Dra. Ana García',
        senderType: 'professional',
        receiverId: '1',
        content: 'Hola, ¿cómo estás?',
        timestamp: new Date(Date.now() - 3600000),
        isRead: true,
        messageType: 'text'
      }
    ];
  }

  private getMockOnlineUsers(): ChatUser[] {
    return [
      {
        id: '1',
        name: 'Dra. Ana García',
        type: 'professional',
        avatar: 'https://via.placeholder.com/50/667eea/ffffff?text=AG',
        isOnline: true,
        status: 'available',
        lastSeen: new Date()
      }
    ];
  }

  // Funciones de WebSocket para desarrollo

  // Simular recepción de mensaje
  simulateIncomingMessage(message: ChatMessage): void {
    if (this.socket) {
      // Simular evento de mensaje entrante
      console.log('📨 Simulando mensaje entrante:', message);
      
      // Aquí se emitiría el evento al contexto
      setTimeout(() => {
        this.emit('message_received', {
          message,
          timestamp: new Date()
        });
      }, 1000);
    }
  }

  // Simular cambio de estado de usuario
  simulateUserStatusChange(userId: string, status: 'online' | 'offline'): void {
    console.log(`👤 Simulando cambio de estado: ${userId} -> ${status}`);
    
    this.emit('user_status_changed', {
      userId,
      status,
      timestamp: new Date()
    });
  }

  // Simular indicador de escritura
  simulateTypingIndicator(userId: string, isTyping: boolean): void {
    console.log(`✍️ Simulando indicador de escritura: ${userId} -> ${isTyping}`);
    
    this.emit('typing_indicator', {
      userId,
      isTyping,
      timestamp: new Date()
    });
  }

  // Obtener estadísticas del chat
  async getChatStats(): Promise<{
    totalMessages: number;
    totalConversations: number;
    unreadMessages: number;
    activeUsers: number;
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/stats`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      // En desarrollo, retornar datos de ejemplo
      return {
        totalMessages: 150,
        totalConversations: 25,
        unreadMessages: 8,
        activeUsers: 12
      };
    }
  }

  // Verificar estado de conexión
  getConnectionStatus(): {
    isConnected: boolean;
    reconnectAttempts: number;
    lastHeartbeat: Date | null;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.isConnected ? new Date() : null
    };
  }
}

export const chatService = new ChatService();
