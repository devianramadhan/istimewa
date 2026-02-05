import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from '../types';

// Define the server URL - use environment variable or fallback to localhost
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function useGameSocket() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Initialize socket connection
    useEffect(() => {
        const newSocket = io(SERVER_URL);

        newSocket.on('connect', () => {
            setIsConnected(true);
            setPlayerId(newSocket.id || null);
            setError(null);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        newSocket.on('game_update', (game: GameState) => {
            setGameState(game);
        });

        newSocket.on('error', (msg: string) => {
            setError(msg);
            // Clear error after 3 seconds
            setTimeout(() => setError(null), 3000);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const swapCards = useCallback((roomId: string, handIndex: number, faceUpIndex: number) => {
        if (socket) {
            socket.emit('swap_cards', roomId, handIndex, faceUpIndex);
        }
    }, [socket]);

    const setReady = useCallback((roomId: string) => {
        if (socket) {
            socket.emit('set_ready', roomId);
        }
    }, [socket]);

    const createRoom = useCallback((roomId: string, playerName: string) => {
        if (socket) {
            socket.emit('create_room', roomId, playerName);
        }
    }, [socket]);

    const joinRoom = useCallback((roomId: string, playerName: string) => {
        if (socket) {
            socket.emit('join_room', roomId, playerName);
        }
    }, [socket]);

    const startGame = useCallback((roomId: string) => {
        if (socket) {
            socket.emit('start_game', roomId);
        }
    }, [socket]);

    const takePile = useCallback((roomId: string) => {
        if (socket) {
            socket.emit('take_pile', roomId);
        }
    }, [socket]);

    const playCard = useCallback((roomId: string, cardIndices: number[], source: 'hand' | 'faceUp' | 'faceDown') => {
        if (socket) {
            socket.emit('play_card', roomId, cardIndices, source);
        }
    }, [socket]);

    return {
        socket,
        gameState,
        isConnected,
        playerId,
        error,
        actions: {
            createRoom,
            joinRoom,
            joinBotGame: (roomId: string, playerName: string) => {
                if (socket) {
                    socket.emit('join_bot_game', roomId, playerName);
                    setPlayerId(socket.id || null);
                }
            },
            startGame,
            swapCards,
            setReady,
            takePile,
            playCard
        }
    };
}
