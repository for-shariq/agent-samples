import type { ActivityKind } from './types';

export interface ChatActivity {
  kind: ActivityKind;
  name: string;
  status?: string | null;
  arguments?: string | null;
}

export interface ChatReply {
  reply: string;
  conversationId: string;
  activities: ChatActivity[];
}

// Single place for backend calls.
export async function sendChat(message: string, conversationId?: string): Promise<ChatReply> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as ChatReply;
}
