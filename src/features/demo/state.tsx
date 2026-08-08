"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEMO_EXP_PER_SOLVE,
  DEMO_MISSION_BOARD,
  DEMO_STUDENT,
} from "@/features/demo/data";
import type { MissionBoard } from "@/features/learning/mission";

/**
 * Demo state lives ENTIRELY in the browser — React state persisted to
 * sessionStorage so it survives navigation between /demo/* pages within a tab.
 * Nothing here writes to the server, the database, or the AI. Solving a demo
 * problem only mutates this in-memory state (EXP, level, mission progress).
 */

const EXP_PER_LEVEL = DEMO_STUDENT.expForNextLevel - DEMO_STUDENT.exp; // 360

type DemoState = {
  exp: number;
  totalSolved: number;
  /** problemId → was the (first) answer correct. */
  solved: Record<string, boolean>;
  /** missionId → done count override. */
  missionDone: Record<string, number>;
};

const INITIAL: DemoState = {
  exp: DEMO_STUDENT.exp,
  totalSolved: DEMO_STUDENT.totalProblems,
  solved: {},
  missionDone: Object.fromEntries(
    DEMO_MISSION_BOARD.missions.map((m) => [m.id, m.done]),
  ),
};

type DemoContextValue = {
  exp: number;
  level: number;
  /** 0–100 progress within the current level (for the EXP bar). */
  levelProgressPercent: number;
  totalSolved: number;
  /** The mission board with live (client-side) progress applied. */
  missionBoard: MissionBoard;
  isSolved: (problemId: string) => boolean;
  /** Record a solved demo problem. Returns the EXP gained (0 on wrong). */
  solve: (problemId: string, correct: boolean) => number;
  reset: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);
const STORAGE_KEY = "studyos-demo-state-v1";

function deriveMissionBoard(missionDone: Record<string, number>): MissionBoard {
  const missions = DEMO_MISSION_BOARD.missions.map((m) => {
    const done = Math.min(missionDone[m.id] ?? m.done, m.target);
    return { ...m, done, completed: done >= m.target };
  });
  const totalTarget = missions.reduce((s, m) => s + m.target, 0);
  const totalDone = missions.reduce((s, m) => s + Math.min(m.done, m.target), 0);
  return {
    ...DEMO_MISSION_BOARD,
    missions,
    totalTarget,
    totalDone,
    progressPercent: totalTarget === 0 ? 0 : Math.round((totalDone / totalTarget) * 100),
  };
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(INITIAL);

  // Rehydrate from sessionStorage on mount (client only).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...INITIAL, ...(JSON.parse(raw) as Partial<DemoState>) });
    } catch {
      // ignore corrupt/unavailable storage
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const solve = useCallback((problemId: string, correct: boolean): number => {
    let gained = 0;
    setState((prev) => {
      // Only the first correct solve of a problem grants EXP / advances a mission.
      if (prev.solved[problemId]) return prev;
      if (!correct) {
        return { ...prev, solved: { ...prev.solved, [problemId]: false } };
      }
      gained = DEMO_EXP_PER_SOLVE;

      // Advance the first not-yet-complete mission (mirrors the real "3/5 → 4/5").
      const missionDone = { ...prev.missionDone };
      const next = DEMO_MISSION_BOARD.missions.find(
        (m) => (missionDone[m.id] ?? m.done) < m.target,
      );
      if (next) missionDone[next.id] = (missionDone[next.id] ?? next.done) + 1;

      return {
        exp: prev.exp + gained,
        totalSolved: prev.totalSolved + 1,
        solved: { ...prev.solved, [problemId]: true },
        missionDone,
      };
    });
    return gained;
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<DemoContextValue>(() => {
    const gained = state.exp - DEMO_STUDENT.exp;
    const level = DEMO_STUDENT.level + Math.floor(gained / EXP_PER_LEVEL);
    const levelBase = DEMO_STUDENT.exp + (level - DEMO_STUDENT.level) * EXP_PER_LEVEL;
    const levelProgressPercent = Math.round(((state.exp - levelBase) / EXP_PER_LEVEL) * 100);
    return {
      exp: state.exp,
      level,
      levelProgressPercent,
      totalSolved: state.totalSolved,
      missionBoard: deriveMissionBoard(state.missionDone),
      isSolved: (id: string) => id in state.solved,
      solve,
      reset,
    };
  }, [state, solve, reset]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within a DemoProvider");
  return ctx;
}
