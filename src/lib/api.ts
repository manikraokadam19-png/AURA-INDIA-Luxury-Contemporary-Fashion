// Client API fetch wrapper for AURA Indian Fashion House

const GUEST_KEY = 'aura_guest_session_id';

export function getGuestSessionId(): string {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('aura_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('aura_token', token);
  } else {
    localStorage.removeItem('aura_token');
  }
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const guestId = getGuestSessionId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-guest-session-id': guestId,
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg) as any;
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
