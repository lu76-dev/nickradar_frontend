const API = 'https://app.nickradar.com';
const SESSION_KEY = 'nr_session';

export function getSessionToken(): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
}

export function setSessionToken(token: string) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, token);
}

export function clearSession() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
}

function headers() {
  const token = getSessionToken();
  return token ? { 'Content-Type': 'application/json', 'X-Session-Token': token } : { 'Content-Type': 'application/json' };
}

export async function participantLogin(code: string) {
  const r = await fetch(`${API}/api/participant/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return r.json();
}

export async function getMe() {
  const r = await fetch(`${API}/api/participant/me`, { headers: headers() as any });
  return r.json();
}

export async function updateProfile(data: { photo_url?: string | null; slogan?: string | null }) {
  const r = await fetch(`${API}/api/participant/profile`, {
    method: 'PUT',
    headers: headers() as any,
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function searchParticipants(q: string) {
  const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`, { headers: headers() as any });
  return r.json();
}

export async function getParticipantProfile(nickname: string) {
  const r = await fetch(`${API}/api/participants/${encodeURIComponent(nickname)}`, { headers: headers() as any });
  return r.json();
}

export async function sendRequest(target_nickname: string, message: string) {
  const r = await fetch(`${API}/api/requests`, {
    method: 'POST',
    headers: headers() as any,
    body: JSON.stringify({ target_nickname, message }),
  });
  return r.json();
}

export async function getIncoming() {
  const r = await fetch(`${API}/api/requests/incoming`, { headers: headers() as any });
  return r.json();
}

export async function getOutgoing() {
  const r = await fetch(`${API}/api/requests/outgoing`, { headers: headers() as any });
  return r.json();
}

export async function getHistory() {
  const r = await fetch(`${API}/api/requests/history`, { headers: headers() as any });
  return r.json();
}

export async function answerRequest(id: number, status: 'yes' | 'no') {
  const r = await fetch(`${API}/api/requests/${id}`, {
    method: 'PUT',
    headers: headers() as any,
    body: JSON.stringify({ answer: status }),
  });
  return r.json();
}

export async function getChats() {
  const r = await fetch(`${API}/api/chats`, { headers: headers() as any });
  return r.json();
}

export async function getMessages(chatId: number) {
  const r = await fetch(`${API}/api/messages/${chatId}`, { headers: headers() as any });
  return r.json();
}

export async function sendMessage(chat_id: number, text: string) {
  const r = await fetch(`${API}/api/messages`, {
    method: 'POST',
    headers: headers() as any,
    body: JSON.stringify({ chat_id, text }),
  });
  return r.json();
}

export async function blockChat(chatId: number) {
  const r = await fetch(`${API}/api/chats/${chatId}/block`, {
    method: 'PUT',
    headers: headers() as any,
  });
  return r.json();
}

export async function sendReport(reported_nickname: string, reason: string, details: string) {
  const r = await fetch(`${API}/api/reports`, {
    method: 'POST',
    headers: headers() as any,
    body: JSON.stringify({ reported_nickname, reason, details }),
  });
  return r.json();
}

export async function checkReported(nickname: string) {
  const r = await fetch(`${API}/api/reports/check?nickname=${encodeURIComponent(nickname)}`, { headers: headers() as any });
  return r.json();
}
