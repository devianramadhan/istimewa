
import { io } from 'socket.io-client';
import { GameState } from './types';

const SOCKET_URL = 'http://localhost:3000';
const socket = io(SOCKET_URL);
const ROOM_ID = 'debug-sort-room';
const PLAYER_NAME = 'DebugSorter';

console.log('Connecting to server...');

socket.on('connect', () => {
    console.log('Connected:', socket.id);

    // 1. Join/Create Game
    console.log('Creating bot game...');
    socket.emit('join_bot_game', ROOM_ID, PLAYER_NAME);

    // 2. Set Ready & Start Game
    setTimeout(() => {
        console.log('Setting ready...');
        socket.emit('set_ready', ROOM_ID);

        setTimeout(() => {
            console.log('Starting game...');
            socket.emit('start_game', ROOM_ID);
        }, 200);
    }, 500);
});

let dealt = false;

socket.on('game_update', (game: GameState) => {
    // console.log('Game Update State:', game.status);

    const me = game.players.find(p => p.id === socket.id);
    if (!me) return;

    if (me.hand.length > 0 && !dealt) {
        dealt = true;
        console.log('Cards Dealt!');
        console.log('Original Hand:', me.hand.map(c => `${c.rank}${c.suit[0]}`).join(', '));

        // 2. Request Sort
        console.log('Sending sort_hand request...');
        socket.emit('sort_hand', ROOM_ID);

        // Wait for update
        setTimeout(() => {
            console.log('Checking result logic locally (waiting next update usually works, but lets see)');
        }, 1000);
    } else if (dealt) {
        // This update came AFTER sort (hopefully)
        console.log('Received Update after Sort (Potential)');
        console.log('Current Hand: ', me.hand.map(c => `${c.rank}${c.suit[0]}`).join(', '));

        // We can force exit after a bit
        setTimeout(() => {
            console.log('Test Finished');
            socket.disconnect();
            process.exit(0);
        }, 2000);
    }
});

socket.on('error', (err) => {
    console.error('Socket Error:', err);
});
