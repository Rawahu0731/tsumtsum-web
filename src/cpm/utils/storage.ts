import type { CpmStore, Play, Session, SessionDraft } from '../types';
import { computeCPM } from './calc';
import { createId } from './ids';
import { DEFAULT_ITEMS, itemsKey, normalizeItems } from './items';

const STORAGE_KEY = 'cpm_entries';
const STORE_VERSION = 2 as const;

function defaultDraft(): SessionDraft {
  return {
    character: '',
    skill: 1,
    terminal: '',
    items: DEFAULT_ITEMS,
    targetPlayCount: 10,
  };
}

function defaultStore(): CpmStore {
  return {
    version: STORE_VERSION,
    plays: [],
    sessions: [],
    activeSessionId: null,
    draft: defaultDraft(),
  };
}

function normalizeSessionDraft(input?: Partial<SessionDraft>): SessionDraft {
  return {
    character: String(input?.character ?? ''),
    skill: Number(input?.skill ?? 1),
    terminal: String(input?.terminal ?? ''),
    items: normalizeItems(input?.items),
    targetPlayCount: Number(input?.targetPlayCount ?? 10),
  };
}

function normalizePlay(input: any, sessionId: string): Play {
  const items = normalizeItems(input?.items);
  const time = String(input?.time ?? '00:00');
  const coins = Number(input?.coins ?? 0);
  const cpm = Number.isFinite(input?.cpm) ? Number(input?.cpm) : computeCPM({ time, coins, items });
  return {
    id: String(input?.id ?? createId()),
    ts: Number(input?.ts ?? Date.now()),
    sessionId,
    character: String(input?.character ?? ''),
    skill: Number(input?.skill ?? 1),
    terminal: String(input?.terminal ?? ''),
    items,
    time,
    coins: Number.isFinite(coins) ? coins : 0,
    cpm: Number.isFinite(cpm) ? cpm : 0,
  };
}

function normalizeSession(input: any): Session {
  return {
    id: String(input?.id ?? createId()),
    createdAt: Number(input?.createdAt ?? Date.now()),
    character: String(input?.character ?? ''),
    skill: Number(input?.skill ?? 1),
    terminal: String(input?.terminal ?? ''),
    items: normalizeItems(input?.items),
    targetPlayCount: Number(input?.targetPlayCount ?? 0),
  };
}

function migrateLegacyEntries(entries: any[]): CpmStore {
  const store = defaultStore();
  const sessionMap = new Map<string, Session>();
  const plays: Play[] = [];

  entries.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const items = normalizeItems(raw?.items ?? raw);
    const ts = Number(raw?.ts ?? Date.now());
    const dateKey = new Date(ts).toISOString().slice(0, 10);
    const character = String(raw?.character ?? '');
    const skill = Number(raw?.skill ?? 1);
    const terminal = String(raw?.terminal ?? '');
    const key = `${dateKey}|${character}|${skill}|${terminal}|${itemsKey(items)}`;

    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        id: createId(),
        createdAt: ts,
        character,
        skill,
        terminal,
        items,
        targetPlayCount: 0,
      });
    }

    const session = sessionMap.get(key);
    if (!session) return;
    plays.push(normalizePlay(raw, session.id));
  });

  const sessions = Array.from(sessionMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  const sortedPlays = plays.sort((a, b) => b.ts - a.ts);

  return {
    ...store,
    plays: sortedPlays,
    sessions,
  };
}

export function loadStore(): CpmStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultStore();

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return migrateLegacyEntries(parsed);
    }

    if (parsed && typeof parsed === 'object' && parsed.version === STORE_VERSION) {
      const plays = Array.isArray(parsed.plays) ? parsed.plays : [];
      const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
      const normalizedSessions = sessions.map((s: any) => normalizeSession(s));
      const sessionIdSet = new Set(normalizedSessions.map((s: Session) => s.id));
      const normalizedPlays = plays
        .map((p: any) => {
          const sessionId = sessionIdSet.has(p?.sessionId) ? p?.sessionId : normalizedSessions[0]?.id ?? createId();
          return normalizePlay(p, sessionId);
        })
        .sort((a: Play, b: Play) => b.ts - a.ts);

      return {
        version: STORE_VERSION,
        plays: normalizedPlays,
        sessions: normalizedSessions,
        activeSessionId: typeof parsed.activeSessionId === 'string' ? parsed.activeSessionId : null,
        draft: normalizeSessionDraft(parsed.draft),
      };
    }
  } catch (err) {
    console.error('Failed to load CPM store', err);
  }

  return defaultStore();
}

export function saveStore(store: CpmStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Failed to save CPM store', err);
  }
}
