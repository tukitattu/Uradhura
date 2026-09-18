import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { createSocket, GameSocket, joinGame, leaveGame, placeBet, requestSeedState, rotateSeed } from '../lib/socket';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { toNumber } from '../lib/game';
import {
  Game,
  GameRound,
  GameOption,
  GameConfig,
  GameBetConfig,
  SeedState,
  BetTotals,
  MyBet,
  RoundUpdateEvent,
  RoundStartedEvent,
  RoundClosedEvent,
  RoundResultEvent,
  BetResultEvent,
  SocketErrorEvent,
  PlayerGameStateResponse,
} from '../lib/types';

interface GameSocketContextValue {
  socket: GameSocket | null;
  isConnected: boolean;
  lastConnectError: string | null;
}

const GameSocketContext = createContext<GameSocketContextValue | undefined>(undefined);

export function GameSocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastConnectError, setLastConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socket?.disconnect();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const s = createSocket('/game') as GameSocket;

    s.on('connect', () => {
      setIsConnected(true);
      setLastConnectError(null);
    });
    s.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        s.connect();
      }
    });
    s.on('connect_error', (err: Error) => {
      setLastConnectError(err.message);
    });

    s.connect();
    setSocket(s);

    return () => {
      s.off('connect');
      s.off('disconnect');
      s.off('connect_error');
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <GameSocketContext.Provider value={{ socket, isConnected, lastConnectError }}>
      {children}
    </GameSocketContext.Provider>
  );
}

export function useGameSocketContext(): GameSocketContextValue {
  const context = useContext(GameSocketContext);
  if (!context) {
    throw new Error('useGameSocketContext must be used within a GameSocketProvider');
  }
  return context;
}

// ============================================================
// useLiveGame — subscribes to a single game room.
// The socket is server-authoritative: the UI animates purely
// from the state the /game namespace broadcasts. The device
// clock is only used to render a countdown whose deadline is
// corrected by the latest serverTime offset.
// ============================================================

export interface LiveGame {
  loaded: boolean;
  loadError: string | null;
  socketError: SocketErrorEvent | null;
  isConnected: boolean;
  internalCode: string | null;
  game: Game | null;
  round: GameRound | null;
  options: GameOption[];
  config: GameConfig | null;
  betConfig: GameBetConfig | null;
  seed: SeedState | null;
  betTotals: BetTotals;
  myBets: MyBet[];
  balance: number | null;
  playerCount: number;
  lastEvent: RoundUpdateEvent['event'] | null;
  lastResult: RoundResultEvent | null;
  personalResult: BetResultEvent | null;
  serverTimeOffset: number;
  isBettingOpen: boolean;
  placeBet: (optionId: string, amount: number) => void;
  requestSeedState: () => void;
  rotateSeed: (clientSeed: string) => void;
  dismissResult: () => void;
  retryLoad: () => void;
}

export function useLiveGame(gameId: string): LiveGame {
  const { socket, isConnected } = useGameSocketContext();

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<SocketErrorEvent | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [game, setGame] = useState<Game | null>(null);
  const [round, setRound] = useState<GameRound | null>(null);
  const [options, setOptions] = useState<GameOption[]>([]);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [betConfig, setBetConfig] = useState<GameBetConfig | null>(null);
  const [seed, setSeed] = useState<SeedState | null>(null);
  const [betTotals, setBetTotals] = useState<BetTotals>({});
  const [myBets, setMyBets] = useState<MyBet[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<RoundUpdateEvent['event'] | null>(null);
  const [lastResult, setLastResult] = useState<RoundResultEvent | null>(null);
  const [personalResult, setPersonalResult] = useState<BetResultEvent | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  const idempotencyCounter = useRef(0);

  const isBettingOpen = round?.status === 'betting_open';

  // ----------------------------------------------------------
  // REST: full player state (game meta + my bets + balance)
  // ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);

    api
      .get<PlayerGameStateResponse>(`/games/${gameId}/state`)
      .then(({ data }) => {
        if (cancelled) return;
        setGame(data.game);
        setRound(data.round);
        setOptions(Array.isArray(data.options) ? data.options : []);
        setConfig(data.config);
        setBetConfig(data.betConfig);
        setSeed(data.seed);
        setBetTotals(data.betTotals || {});
        setMyBets(Array.isArray(data.myBets) ? data.myBets : []);
        setBalance(toNumber(data.balance?.coins));
        setServerTimeOffset(data.serverTime ? data.serverTime - Date.now() : 0);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Failed to load game state. Check your connection and try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [gameId, reloadToken]);

  // ----------------------------------------------------------
  // Socket: join the room and mirror server state
  // ----------------------------------------------------------
  useEffect(() => {
    if (!socket) return;
    const s = socket;

    const applyServerTime = (serverTime?: number) => {
      if (typeof serverTime === 'number') {
        setServerTimeOffset(serverTime - Date.now());
      }
    };

    const onConnect = () => {
      joinGame(s, gameId);
    };
    s.on('connect', onConnect);

    const handleRoundUpdate = (payload: RoundUpdateEvent) => {
      applyServerTime(payload.serverTime);
      if (payload.event) {
        setLastEvent(payload.event);
        setSocketError(null);
      }
      if (payload.round) {
        setRound(
          payload.totalBetAmount != null
            ? { ...payload.round, totalBetAmount: payload.totalBetAmount }
            : payload.round
        );
      }
      if (payload.options) setOptions(payload.options);
      if (payload.config !== undefined) setConfig(payload.config);
      if (payload.betConfig !== undefined) setBetConfig(payload.betConfig);
      if (payload.seed !== undefined) setSeed(payload.seed);
      if (payload.betTotals) setBetTotals(payload.betTotals);
      if (typeof payload.playerCount === 'number') setPlayerCount(payload.playerCount);
      setLoaded(true);
    };

    const handleRoundStarted = (payload: RoundStartedEvent) => {
      applyServerTime(payload.serverTime);
      setRound((prev) =>
        prev
          ? { ...prev, id: payload.round.id, roundNumber: payload.round.roundNumber, status: payload.round.status }
          : ({ ...payload.round, totalBetAmount: '0', totalPayout: '0', resultData: null, winnerId: null, winnerLabel: null } as GameRound)
      );
      if (payload.seed !== undefined) setSeed(payload.seed);
      if (payload.betTotals) setBetTotals(payload.betTotals);
      setLastEvent(null);
      setPersonalResult(null);
      setMyBets([]);
    };

    const handleRoundClosed = (payload: RoundClosedEvent) => {
      applyServerTime(payload.serverTime);
      setRound((prev) => (prev ? { ...prev, status: payload.round.status } : prev));
      if (payload.betTotals) setBetTotals(payload.betTotals);
      setLastEvent(null);
      setLastResult(null);
      setPersonalResult(null);
    };

    const handleRoundResult = (payload: RoundResultEvent) => {
      applyServerTime(payload.serverTime);
      setLastResult(payload);
      setSeed((prev) =>
        prev
          ? {
              ...prev,
              clientSeed: payload.fairPlay.clientSeed,
              nonce: payload.fairPlay.nonce,
              revealedServerSeed: payload.fairPlay.revealedServerSeed,
            }
          : {
              seedId: '',
              serverSeedHash: payload.fairPlay.serverSeedHash,
              clientSeed: payload.fairPlay.clientSeed,
              nonce: payload.fairPlay.nonce,
              algorithm: 'HMAC-SHA256',
              revealedServerSeed: payload.fairPlay.revealedServerSeed,
            }
      );
    };

    const handleBetPlaced = (payload: { bet: MyBet; balanceAfter: string | number }) => {
      setMyBets((prev) => {
        if (prev.some((b) => b.id === payload.bet.id)) return prev;
        return [...prev, payload.bet];
      });
      setBalance(toNumber(payload.balanceAfter));
    };

    const handleBetResult = (payload: BetResultEvent) => {
      setPersonalResult(payload);
      setMyBets((prev) =>
        prev.map((b) =>
          b.id === payload.betId
            ? { ...b, status: payload.status, payout: payload.payout ?? b.payout }
            : b
        )
      );
    };

    const handleBalanceUpdate = (payload: { balance: string | number }) => {
      setBalance(toNumber(payload.balance));
    };

    const handleSeedState = (payload: SeedState | null) => {
      if (payload) setSeed(payload);
    };

    const handleError = (payload: SocketErrorEvent) => {
      setSocketError(payload);
    };

    s.on('round_update', handleRoundUpdate);
    s.on('round_started', handleRoundStarted);
    s.on('round_closed', handleRoundClosed);
    s.on('round_result', handleRoundResult);
    s.on('bet_placed', handleBetPlaced);
    s.on('bet_result', handleBetResult);
    s.on('balance_update', handleBalanceUpdate);
    s.on('seed_state', handleSeedState);
    s.on('error', handleError);

    joinGame(s, gameId);

    return () => {
      s.off('connect', onConnect);
      s.off('round_update', handleRoundUpdate);
      s.off('round_started', handleRoundStarted);
      s.off('round_closed', handleRoundClosed);
      s.off('round_result', handleRoundResult);
      s.off('bet_placed', handleBetPlaced);
      s.off('bet_result', handleBetResult);
      s.off('balance_update', handleBalanceUpdate);
      s.off('seed_state', handleSeedState);
      s.off('error', handleError);
      leaveGame(s, gameId);
    };
  }, [socket, gameId]);

  const handlePlaceBet = useCallback(
    (optionId: string, amount: number) => {
      if (!socket || !gameId) return;
      idempotencyCounter.current += 1;
      placeBet(socket, gameId, optionId, amount, `${gameId}:${optionId}:${Date.now()}:${idempotencyCounter.current}`);
    },
    [socket, gameId]
  );

  const handleRequestSeedState = useCallback(() => {
    if (socket) requestSeedState(socket);
  }, [socket]);

  const handleRotateSeed = useCallback(
    (clientSeed: string) => {
      if (socket) rotateSeed(socket, clientSeed);
    },
    [socket]
  );

  return {
    loaded,
    loadError,
    socketError,
    isConnected,
    internalCode: game?.internalCode ?? null,
    game,
    round,
    options,
    config,
    betConfig,
    seed,
    betTotals,
    myBets,
    balance,
    playerCount,
    lastEvent,
    lastResult,
    personalResult,
    serverTimeOffset,
    isBettingOpen,
    placeBet: handlePlaceBet,
    requestSeedState: handleRequestSeedState,
    rotateSeed: handleRotateSeed,
    dismissResult: () => setLastResult(null),
    retryLoad: () => setReloadToken((v) => v + 1),
  };
}