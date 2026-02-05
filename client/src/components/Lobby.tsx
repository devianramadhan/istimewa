import React, { useState } from 'react';

interface LobbyProps {
    onCreate: (roomId: string, playerName: string) => void;
    onJoin: (roomId: string, playerName: string) => void;
    onBotGame: (roomId: string, playerName: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onCreate, onJoin, onBotGame }) => {
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [view, setView] = useState<'menu' | 'online_choice' | 'create' | 'join'>('menu');

    const generateRoomId = () => {
        // 8 digits + 4 letters random
        const digits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let letters = '';
        for (let i = 0; i < 4; i++) {
            letters += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Shuffle or just concat? User said "composition", maybe mixed? 
        // "8 digit angka dan 4 huruf secara random". Let's mix them or just append.
        // Simple: Digits-Letters or Random mix. Let's do a random shuffle of the 12 chars.
        const combined = (digits + letters).split('');
        for (let i = combined.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [combined[i], combined[j]] = [combined[j], combined[i]];
        }
        return combined.join('');
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        const newRoomId = generateRoomId();
        onCreate(newRoomId, name);
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !roomId) return;
        onJoin(roomId, name);
    };

    const handleBotGame = () => {
        const randomId = Math.floor(Math.random() * 10000);
        const botName = `Guest_${randomId}`;
        const botRoom = `BotRoom_${randomId}`;
        onBotGame(botRoom, botName);
    };

    // --- VIEWS ---

    if (view === 'menu') {
        return (
            <div className="max-w-md w-full mx-auto p-6 bg-slate-800 rounded-lg shadow-xl animate-fade-in-up">
                <h2 className="text-3xl font-bold text-center mb-8 text-white drop-shadow-md">
                    Pilih Mode
                </h2>
                <div className="space-y-4">
                    <button
                        onClick={() => setView('online_choice')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition duration-200 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3 text-lg"
                    >
                        <span>🌐</span> Main Online
                    </button>
                    <button
                        onClick={handleBotGame}
                        className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-4 px-6 rounded-xl transition duration-200 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3 text-lg border border-fuchsia-500"
                    >
                        <span>🤖</span> Lawan Komputer
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'online_choice') {
        return (
            <div className="max-w-md w-full mx-auto p-6 bg-slate-800 rounded-lg shadow-xl animate-fade-in-right">
                <button
                    onClick={() => setView('menu')}
                    className="mb-4 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition"
                >
                    ← Kembali
                </button>
                <h2 className="text-2xl font-bold text-center mb-8 text-blue-400">
                    Main Online
                </h2>
                <div className="space-y-4">
                    <button
                        onClick={() => setView('create')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition duration-200 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3 text-lg"
                    >
                        <span>✨</span> Buat Room
                    </button>
                    <button
                        onClick={() => setView('join')}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl transition duration-200 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3 text-lg"
                    >
                        <span>🚪</span> Gabung Room
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'create') {
        return (
            <div className="max-w-md w-full mx-auto p-6 bg-slate-800 rounded-lg shadow-xl animate-fade-in-right">
                <button
                    onClick={() => setView('online_choice')}
                    className="mb-4 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition"
                >
                    ← Kembali
                </button>
                <h2 className="text-2xl font-bold text-center mb-6 text-emerald-400">
                    Buat Room Baru
                </h2>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Nama Pemain
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-slate-400"
                            placeholder="Masukkan nama anda"
                            required
                        />
                    </div>
                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded transition duration-200 transform hover:scale-[1.02]"
                        >
                            Buat Room
                        </button>
                        <p className="text-xs text-center text-slate-400 mt-3">
                            Room ID akan digenerate otomatis
                        </p>
                    </div>
                </form>
            </div>
        );
    }

    // Join View
    return (
        <div className="max-w-md w-full mx-auto p-6 bg-slate-800 rounded-lg shadow-xl animate-fade-in-right">
            <button
                onClick={() => setView('online_choice')}
                className="mb-4 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition"
            >
                ← Kembali
            </button>

            <h2 className="text-2xl font-bold text-center mb-6 text-orange-400">
                Gabung Room
            </h2>

            <form onSubmit={handleJoin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Nama Pemain
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-slate-400"
                        placeholder="Masukkan nama anda"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Room ID
                    </label>
                    <input
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-slate-400"
                        placeholder="Masukkan Room ID"
                        required
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded transition duration-200 transform hover:scale-[1.02]"
                    >
                        Gabung Sekarang
                    </button>
                </div>
            </form>
        </div>
    );
};
