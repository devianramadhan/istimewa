import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import { GameManager } from './game/GameManager';

dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*", // Use env var in production
        methods: ["GET", "POST"]
    }
});

const gameManager = new GameManager();

// Listen for async updates (e.g. Bot moves)
gameManager.onGameUpdate = (roomId) => {
    io.to(roomId).emit('game_update', gameManager.getGame(roomId));
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', (roomId: string, playerName: string) => {
        gameManager.createGame(roomId);
        const success = gameManager.addPlayer(roomId, socket.id, playerName);
        if (success) {
            socket.join(roomId);
            io.to(roomId).emit('game_update', gameManager.getGame(roomId));
        }
    });

    socket.on('join_room', (roomId: string, playerName: string) => {
        const success = gameManager.addPlayer(roomId, socket.id, playerName);
        if (success) {
            socket.join(roomId);
            io.to(roomId).emit('game_update', gameManager.getGame(roomId));
        } else {
            socket.emit('error', 'Cannot join room');
        }
    });

    socket.on('join_bot_game', (roomId: string, playerName: string, botCount: number = 1) => {
        // Validate botCount (1-9 for max 10 players)
        const validBotCount = Math.min(Math.max(botCount, 1), 9);

        // 1. Create Game
        gameManager.createGame(roomId);

        // 2. Add Human
        const success = gameManager.addPlayer(roomId, socket.id, playerName);

        // 3. Add Bots (multiple based on botCount)
        if (success) {
            for (let i = 0; i < validBotCount; i++) {
                gameManager.addBot(roomId, i + 1); // Pass bot number for naming
            }
            socket.join(roomId);
            io.to(roomId).emit('game_update', gameManager.getGame(roomId));
        } else {
            socket.emit('error', 'Cannot create bot game');
        }
    });



    socket.on('swap_cards', (roomId: string, handIndex: number, faceUpIndex: number) => {
        const success = gameManager.swapCards(roomId, socket.id, handIndex, faceUpIndex);
        if (success) {
            io.to(roomId).emit('game_update', gameManager.getGame(roomId));
        }
    });

    socket.on('sort_hand', (roomId: string) => {
        console.log(`[Socket] Received sort_hand for room ${roomId} from ${socket.id}`);
        const success = gameManager.sortHand(roomId, socket.id);
        if (success) {
            console.log(`[Socket] Sort successful, emitting update`);
            io.to(roomId).emit('game_update', gameManager.getGame(roomId));
        } else {
            console.log(`[Socket] Sort failed (game/player not found or other error)`);
        }
    });

    socket.on('set_ready', (roomId: string) => {
        const success = gameManager.setPlayerReady(roomId, socket.id);
        if (success) {
            io.to(roomId).emit('game_update', gameManager.getGame(roomId));
        }
    });

    socket.on('take_pile', (roomId: string) => {
        const success = gameManager.takePile(roomId, socket.id);
        if (success) {
            io.to(roomId).emit('game_update', gameManager.getGame(roomId));
        }
    });

    socket.on('play_card', (roomId: string, cardIndices: number[], source: 'hand' | 'faceUp' | 'faceDown') => {
        // Ensure cardIndices is an array (backward compat if needed, but strict for now)
        const indices = Array.isArray(cardIndices) ? cardIndices : [cardIndices];
        const success = gameManager.playCard(roomId, socket.id, indices, source);
        if (success) {
            io.to(roomId).emit('game_update', gameManager.getGame(roomId));
        }
    });

    // Request full sync
    socket.on('get_state', (roomId: string) => {
        const game = gameManager.getGame(roomId);
        if (game) {
            socket.emit('game_update', game);
        }
    });

    socket.on('start_game', (roomId: string) => {
        const success = gameManager.startGame(roomId, socket.id);
        if (success) {
            io.to(roomId).emit('game_update', gameManager.getGame(roomId));
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Find which room this socket was in. 
        // Ideally we track socket->room mapping, or iterate games. 
        // For this scale, iterating is fine or map.
        // But GameManager stores Games. It doesn't map socket->room easily.
        // OPTION: We can iterate all games to find player.

        // Efficient way: store in socket data? or distinct map.
        // Let's iterate for now since limited rooms.
        // Actually, we can expose a helper in GameManager 'handleSocketDisconnect(socketId)'

        // Let's add that helper to GameManager instead of exposing logic here.
        gameManager.handleSocketDisconnect(socket.id);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
