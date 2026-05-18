import { useCallback, useMemo, useState } from 'react';
import type { CpmStore, Play, Session, SessionDraft } from '../types';
import { computeCPM } from '../utils/calc';
import { createId } from '../utils/ids';
import { loadStore, saveStore } from '../utils/storage';
import { normalizeItems } from '../utils/items';

export type SavePlayResult = {
  play: Play | null;
  error?: string;
};

export function useCpmStore() {
  const [store, setStore] = useState<CpmStore>(() => loadStore());

  const updateStore = useCallback((updater: (prev: CpmStore) => CpmStore) => {
    setStore((prev) => {
      const next = updater(prev);
      saveStore(next);
      return next;
    });
  }, []);

  const activeSession = useMemo(() => {
    return store.sessions.find((s) => s.id === store.activeSessionId) ?? null;
  }, [store.activeSessionId, store.sessions]);

  const sessionPlays = useMemo(() => {
    if (!store.activeSessionId) return [];
    return store.plays
      .filter((p) => p.sessionId === store.activeSessionId)
      .slice()
      .sort((a, b) => a.ts - b.ts);
  }, [store.activeSessionId, store.plays]);

  const updateDraft = useCallback((draft: SessionDraft) => {
    updateStore((prev) => ({ ...prev, draft }));
  }, [updateStore]);

  const startSession = useCallback((draft: SessionDraft): Session => {
    const session: Session = {
      id: createId(),
      createdAt: Date.now(),
      character: draft.character.trim(),
      skill: Number(draft.skill || 1),
      terminal: draft.terminal.trim(),
      items: normalizeItems(draft.items),
      targetPlayCount: Number(draft.targetPlayCount || 0),
    };

    updateStore((prev) => ({
      ...prev,
      sessions: [session, ...prev.sessions],
      activeSessionId: session.id,
      draft,
    }));

    return session;
  }, [updateStore]);

  const endSession = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      activeSessionId: null,
    }));
  }, [updateStore]);

  const savePlay = useCallback((args: { time: string; coins: number }): SavePlayResult => {
    if (!activeSession) {
      return { play: null, error: 'Session not started' };
    }

    const time = String(args.time);
    const coins = Number(args.coins);
    if (!Number.isFinite(coins) || coins < 0) {
      return { play: null, error: 'Invalid coins' };
    }

    const cpm = computeCPM({ time, coins, items: activeSession.items });
    if (!Number.isFinite(cpm)) {
      return { play: null, error: 'Invalid time' };
    }

    const play: Play = {
      id: createId(),
      ts: Date.now(),
      sessionId: activeSession.id,
      character: activeSession.character,
      skill: activeSession.skill,
      terminal: activeSession.terminal,
      items: activeSession.items,
      time,
      coins,
      cpm,
    };

    updateStore((prev) => ({
      ...prev,
      plays: [play, ...prev.plays],
    }));

    return { play };
  }, [activeSession, updateStore]);

  const deletePlay = useCallback((playId: string) => {
    updateStore((prev) => ({
      ...prev,
      plays: prev.plays.filter((play) => play.id !== playId),
    }));
  }, [updateStore]);

  const deleteSession = useCallback((sessionId: string) => {
    updateStore((prev) => {
      const nextSessions = prev.sessions.filter((session) => session.id !== sessionId);
      const nextPlays = prev.plays.filter((play) => play.sessionId !== sessionId);
      const activeSessionId = prev.activeSessionId === sessionId ? null : prev.activeSessionId;
      return {
        ...prev,
        sessions: nextSessions,
        plays: nextPlays,
        activeSessionId,
      };
    });
  }, [updateStore]);

  return {
    store,
    activeSession,
    sessionPlays,
    updateDraft,
    startSession,
    endSession,
    savePlay,
    deletePlay,
    deleteSession,
  };
}
