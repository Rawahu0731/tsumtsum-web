import { useCallback, useState } from 'react';
import type { CpmStore, Play, Session, SessionDraft } from '../types';
import { computeCPM } from '../utils/calc';
import { createId } from '../utils/ids';
import { loadStore, saveStore } from '../utils/storage';
import { itemsKey, normalizeItems } from '../utils/items';

export type SavePlayResult = {
  play: Play | null;
  error?: string;
};

type ConditionKey = {
  character: string;
  skill: number;
  terminal: string;
  items: ReturnType<typeof normalizeItems>;
};

const normalizeCondition = (draft: SessionDraft): ConditionKey => ({
  character: draft.character.trim(),
  skill: Number(draft.skill || 1),
  terminal: draft.terminal.trim(),
  items: normalizeItems(draft.items),
});

const matchesCondition = (session: Session | Play, condition: ConditionKey): boolean => (
  session.character === condition.character
  && session.skill === condition.skill
  && session.terminal === condition.terminal
  && itemsKey(session.items) === itemsKey(condition.items)
);

export function useCpmStore() {
  const [store, setStore] = useState<CpmStore>(() => loadStore());

  const updateStore = useCallback((updater: (prev: CpmStore) => CpmStore) => {
    setStore((prev) => {
      const next = updater(prev);
      saveStore(next);
      return next;
    });
  }, []);

  const updateDraft = useCallback((draft: SessionDraft) => {
    updateStore((prev) => {
      const condition = normalizeCondition(draft);
      const matched = prev.sessions.find((session) => matchesCondition(session, condition)) ?? null;
      return {
        ...prev,
        draft,
        activeSessionId: matched?.id ?? null,
      };
    });
  }, [updateStore]);

  const savePlay = useCallback((args: { draft: SessionDraft; time: string; coins: number }): SavePlayResult => {
    const condition = normalizeCondition(args.draft);
    if (!condition.character) {
      return { play: null, error: 'Character is required.' };
    }
    const time = String(args.time);
    const coins = Number(args.coins);
    if (!Number.isFinite(coins) || coins < 0) {
      return { play: null, error: 'Invalid coins' };
    }

    const items = normalizeItems(args.draft.items);
    const cpm = computeCPM({ time, coins, items });
    if (!Number.isFinite(cpm)) {
      return { play: null, error: 'Invalid time' };
    }

    let createdSession: Session | null = null;
    let createdPlay: Play | null = null;
    updateStore((prev) => {
      const matched = prev.sessions.find((session) => matchesCondition(session, condition)) ?? null;
      const sessionId = matched?.id ?? createId();
      if (!matched) {
        createdSession = {
          id: sessionId,
          createdAt: Date.now(),
          character: condition.character,
          skill: condition.skill,
          terminal: condition.terminal,
          items,
          targetPlayCount: Number(args.draft.targetPlayCount || 0),
        };
      }

      const play: Play = {
        id: createId(),
        ts: Date.now(),
        sessionId,
        character: condition.character,
        skill: condition.skill,
        terminal: condition.terminal,
        items,
        time,
        coins,
        cpm,
      };

      createdPlay = play;
      return {
        ...prev,
        sessions: createdSession ? [createdSession, ...prev.sessions] : prev.sessions,
        plays: [play, ...prev.plays],
        activeSessionId: sessionId,
      };
    });

    return { play: createdPlay };
  }, [updateStore]);

  const deletePlay = useCallback((playId: string) => {
    updateStore((prev) => ({
      ...prev,
      plays: prev.plays.filter((play) => play.id !== playId),
    }));
  }, [updateStore]);

  const deleteCondition = useCallback((condition: ConditionKey) => {
    updateStore((prev) => {
      const nextSessions = prev.sessions.filter((session) => !matchesCondition(session, condition));
      const nextPlays = prev.plays.filter((play) => !matchesCondition(play, condition));
      const activeSession = prev.activeSessionId
        ? prev.sessions.find((session) => session.id === prev.activeSessionId)
        : null;
      const activeSessionId = activeSession && matchesCondition(activeSession, condition)
        ? null
        : prev.activeSessionId;

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
    updateDraft,
    savePlay,
    deletePlay,
    deleteCondition,
  };
}
