export type Items = {
  score: boolean;
  coin: boolean;
  exp: boolean;
  timeItem: boolean;
  bomb: boolean;
  fivetofour: boolean;
};

export type Play = {
  id: string;
  ts: number;
  sessionId: string;
  character: string;
  skill: number;
  terminal: string;
  items: Items;
  time: string;
  coins: number;
  cpm: number;
};

export type Session = {
  id: string;
  createdAt: number;
  character: string;
  skill: number;
  terminal: string;
  items: Items;
  targetPlayCount: number;
};

export type SessionDraft = {
  character: string;
  skill: number;
  terminal: string;
  items: Items;
  targetPlayCount: number;
};

export type CpmStore = {
  version: 2;
  plays: Play[];
  sessions: Session[];
  activeSessionId: string | null;
  draft: SessionDraft;
};
