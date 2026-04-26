/**
 * Tipos compartidos para el servicio de chat legacy (chatService).
 * El chat en la app se resuelve vía WhatsApp; no hay ChatProvider.
 */

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'client' | 'professional' | 'admin';
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  messageType: 'text' | 'image' | 'file' | 'system';
  attachmentUrl?: string;
  conversationId: string;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  participantNames: { [key: string]: string };
  participantTypes: { [key: string]: 'client' | 'professional' | 'admin' };
  lastMessage?: ChatMessage;
  unreadCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  isPinned: boolean;
}

export interface ChatUser {
  id: string;
  name: string;
  type: 'client' | 'professional' | 'admin';
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
  status?: 'available' | 'busy' | 'away' | 'offline';
}
