'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { gamesApi, betsApi, type Round, type OptionTotal } from '@/lib/api';
import { timeLeft } from '@/lib/utils';

interface UseRoundOptions {
  gameId: string;
  pollInterval?: number;
}

export function useRound({ gameId, pollInterval = 3000 }: UseRoundOptions) {
  const [round, setRound] = useState<Round | null>(null);
  const [totals, setTotals] = useState<OptionTotal[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [betting, setBetting] = useState(false);
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const roundIdRef = useRef<string | undefined>();

  // Keep ref in sync with current round id
  useEffect(() => {
    roundIdRef.current = round?.id;
  }, [round?.id]);

  const fetchRound = useCallback(async () => {
    try {
      const r = await gamesApi.getActiveRound(gameId);
      setRound((prev) => {
        if (prev?.status !== 'SETTLED' && r.status === 'SETTLED') {
          setLastWinner(r.winnerId || null);
        }
        return r;
      });
      if (r.bettingEndsAt) {
        setCountdown(timeLeft(r.bettingEndsAt));
      }
    } catch {
      // ignore transient errors
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const fetchTotals = useCallback(async (roundId: string) => {
    try {
      const t = await gamesApi.getRoundTotals(roundId);
      setTotals(t);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!gameId) return;
    fetchRound();
    pollRef.current = setInterval(() => {
      fetchRound();
      if (roundIdRef.current) fetchTotals(roundIdRef.current);
    }, pollInterval);
    return () => clearInterval(pollRef.current);
  }, [fetchRound, fetchTotals, pollInterval]);

  // Local countdown tick
  useEffect(() => {
    clearInterval(countdownRef.current);
    if (round?.bettingEndsAt && round.status === 'BETTING_OPEN') {
      countdownRef.current = setInterval(() => {
        setCountdown(timeLeft(round.bettingEndsAt!));
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [round?.bettingEndsAt, round?.status]);

  const placeBet = useCallback(
    async (optionId: string, amount: number) => {
      if (!round) throw new Error('No active round');
      setBetting(true);
      try {
        const bet = await betsApi.place(round.id, optionId, amount);
        await fetchTotals(round.id);
        return bet;
      } finally {
        setBetting(false);
      }
    },
    [round, fetchTotals]
  );

  return { round, totals, countdown, loading, betting, lastWinner, placeBet, refresh: fetchRound };
}
