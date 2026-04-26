import { getBackendBaseUrl } from '../config/backend';
import simpleAuthService from './simpleAuthService';

export function makeExpoChatConversationKey(userIdA: string, userIdB: string): string {
  const a = String(userIdA).trim();
  const b = String(userIdB).trim();
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export interface ExpoChatConversationRow {
  conversationKey: string;
  otherUserId: string;
  otherUserName: string;
  otherUserType: string;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
    messageType?: string;
  } | null;
  unreadCount: number;
}

export interface ExpoChatMessageDoc {
  _id: string;
  conversationKey: string;
  senderId: string;
  receiverId: string;
  senderName?: string;
  receiverName?: string;
  senderType?: string;
  receiverType?: string;
  content: string;
  messageType?: string;
  readByReceiver?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await simpleAuthService.getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchExpoChatConversations(): Promise<ExpoChatConversationRow[]> {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/v1/expo-chat/conversations`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export async function fetchExpoChatMessages(
  conversationKey: string
): Promise<ExpoChatMessageDoc[]> {
  const base = getBackendBaseUrl();
  const key = encodeURIComponent(conversationKey);
  const res = await fetch(`${base}/api/v1/expo-chat/conversations/${key}/messages`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export async function sendExpoChatMessage(
  receiverId: string,
  content: string,
  messageType: 'text' | 'image' | 'file' | 'system' = 'text'
): Promise<{ ok: boolean; data?: ExpoChatMessageDoc; message?: string }> {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/v1/expo-chat/messages`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ receiverId, content, messageType }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    return {
      ok: false,
      message: typeof json.message === 'string' ? json.message : `Error ${res.status}`,
    };
  }
  return { ok: true, data: json.data as ExpoChatMessageDoc };
}

export async function markExpoChatConversationRead(conversationKey: string): Promise<void> {
  const base = getBackendBaseUrl();
  const key = encodeURIComponent(conversationKey);
  await fetch(`${base}/api/v1/expo-chat/conversations/${key}/read`, {
    method: 'PATCH',
    headers: await authHeaders(),
  }).catch(() => {});
}
