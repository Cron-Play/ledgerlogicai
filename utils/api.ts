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
  error?: boolean;
}

// Raw shape returned by the backend (snake_case)
interface RawMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

function normalizeMessage(raw: RawMessage | ChatMessage): ChatMessage {
  const r = raw as any;
  return {
    id: r.id,
    sessionId: r.sessionId ?? r.session_id ?? '',
    role: r.role,
    content: r.content,
    createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
  };
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

// Raw shape returned by the backend for sessions (snake_case)
interface RawSession {
  id: string;
  title: string;
  last_message?: string;
  created_at: string;
  updated_at: string;
}

function normalizeSession(raw: RawSession | ChatSession): ChatSession {
  const r = raw as any;
  return {
    id: r.id,
    title: r.title ?? '',
    lastMessage: r.lastMessage ?? r.last_message,
    createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? r.updated_at ?? new Date().toISOString(),
  };
}

export async function getSessions(): Promise<ChatSession[]> {
  const data = await request<{ sessions: RawSession[] } | RawSession[]>('/api/chat/sessions');
  const raw = Array.isArray(data) ? data : ((data as any).sessions ?? []);
  return (raw as RawSession[]).map(normalizeSession);
}

export async function createSession(title?: string): Promise<ChatSession> {
  const data = await request<RawSession>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title: title ?? 'New Chat' }),
  });
  return normalizeSession(data);
}

export async function deleteSession(id: string): Promise<void> {
  return request<void>(`/api/chat/sessions/${id}`, { method: 'DELETE' });
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  // Backend returns { messages: [...] }
  const data = await request<{ messages: RawMessage[] } | RawMessage[]>(
    `/api/chat/sessions/${sessionId}/messages`
  );
  const raw = Array.isArray(data) ? data : ((data as any).messages ?? []);
  return (raw as RawMessage[]).map(normalizeMessage);
}

export interface SendMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

export async function sendMessage(
  sessionId: string,
  content: string
): Promise<SendMessageResponse> {
  // Backend returns { user_message: {...}, assistant_message: {...} }
  const data = await request<{ user_message: RawMessage; assistant_message: RawMessage }>(
    `/api/chat/sessions/${sessionId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ content, role: 'user' }),
    }
  );
  return {
    user_message: normalizeMessage(data.user_message),
    assistant_message: normalizeMessage(data.assistant_message),
  };
}
