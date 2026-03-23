const BASE_URL = 'https://sjejmczpu6x623pndtw9m2wu4zvha7bq.app.specular.dev';

export interface ChatSession {
  id: string;
  title: string;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  console.log(`[API] ${options.method ?? 'GET'} ${url}`, options.body ? JSON.parse(options.body as string) : '');

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[API] Error ${response.status} from ${url}:`, text.slice(0, 200));
    throw new Error(`Request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`[API] Response from ${url}:`, data);
  return data as T;
}

export async function getSessions(): Promise<ChatSession[]> {
  return request<ChatSession[]>('/api/chat/sessions');
}

export async function createSession(title?: string): Promise<ChatSession> {
  return request<ChatSession>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title: title ?? 'New Chat' }),
  });
}

export async function deleteSession(id: string): Promise<void> {
  return request<void>(`/api/chat/sessions/${id}`, { method: 'DELETE' });
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`);
}

export async function sendMessage(
  sessionId: string,
  content: string
): Promise<ChatMessage> {
  return request<ChatMessage>(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, role: 'user' }),
  });
}
