const STORAGE_KEY = 'faceq_coach_chat';
const MAX_MESSAGES = 200;

export interface StoredCoachMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export function getCoachMessages(): StoredCoachMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m) =>
          m &&
          typeof m === 'object' &&
          typeof (m as { id?: unknown }).id === 'string' &&
          ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
          typeof (m as { text?: unknown }).text === 'string',
      )
      .map((m) => m as StoredCoachMessage);
  } catch {
    return [];
  }
}

export function saveCoachMessages(messages: StoredCoachMessage[]): void {
  try {
    const trimmed = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

