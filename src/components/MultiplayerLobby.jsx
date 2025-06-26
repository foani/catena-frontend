import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Search, Crown, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GameModeSelector from './GameModeSelector';

export default function MultiplayerLobby({ user, onJoinRoom, onCreateRoom }) {
    const [rooms, setRooms] = useState([]);
    const [roomCode, setRoomCode] = useState('');
    const [selectedMode, setSelectedMode] = useState(null);
    const [showCreateRoom, setShowCreateRoom] = useState(false);

    useEffect(() => {
        // 목업 방 목록 생성
        const mockRooms = [
            {
                id: 'room1',
                room_code: 'ABC123',
                host_name: 'Player1',
                mode_name: '퀵 게임',
                duration: 15,
                current_players: 3,
                max_players: 10,
                coin_symbol: 'BTC',
                status: 'waiting'
            },
            {
                id: 'room2', 
                room_code: 'XYZ789',
                host_name: 'CryptoKing',
                mode_name: '스탠다드',
                duration: 30,
                current_players: 7,
                max_players: 10,
                coin_symbol: 'ETH',
                status: 'waiting'
            },
            {
                id: 'room3',
                room_code: 'DEF456',
                host_name: 'ProTrader',
                mode_name: '프로 모드',
                duration: 180,
                current_players: 5,
                max_players: 10,
                coin_symbol: 'SOL',
                status: 'playing'
            }
        ];
        setRooms(mockRooms);
    }, []);

    const handleCreateRoom = () => {
        if (!selectedMode) {
            alert('게임 모드를 선택해주세요!');
            return;
        }

        const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newRoom = {
            room_code: newRoomCode,
            mode: selectedMode,
            host_id: user.id,
            coin_symbol: 'BTC'
        };

        onCreateRoom(newRoom);
        setShowCreateRoom(false);
    };

    const handleJoinByCode = () => {
        if (!roomCode.trim()) {
            alert('방 코드를 입력해주세요!');
            return;
        }
        onJoinRoom(roomCode.toUpperCase());
    };

    const copyRoomCode = (code) => {
        navigator.clipboard.writeText(code);
        alert('방 코드가 복사되었습니다!');
    };

    return (
        <div className="space-y-6">
            {/* 빠른 참가 */}
            <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        빠른 참가
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3">
                        <Input
                            placeholder="방 코드 입력 (예: ABC123)"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            className="bg-gray-700 border-gray-600"
                            maxLength={6}
                        />
                        <Button onClick={handleJoinByCode} className="bg-cyan-600 hover:bg-cyan-700">
                            참가하기
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 방 만들기 */}
            <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-green-400 flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        새 방 만들기
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Button 
                        onClick={() => setShowCreateRoom(!showCreateRoom)}
                        className="w-full bg-green-600 hover:bg-green-700 mb-4"
                    >
                        {showCreateRoom ? '취소' : '방 만들기'}
                    </Button>
                    
                    <AnimatePresence>
                        {showCreateRoom && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4"
                            >
                                <GameModeSelector 
                                    selectedMode={selectedMode}
                                    onModeSelect={setSelectedMode}
                                    isMultiplayer={true}
                                />
                                <Button 
                                    onClick={handleCreateRoom}
                                    disabled={!selectedMode}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    방 생성하기
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>

            {/* 공개 방 목록 */}
            <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-purple-400 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        공개 방 ({rooms.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {rooms.map((room) => (
                            <motion.div
                                key={room.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                <Crown className="w-4 h-4 text-yellow-400" />
                                                {room.host_name}
                                            </h3>
                                            <Badge className="bg-cyan-500/20 text-cyan-400">
                                                {room.room_code}
                                            </Badge>
                                            <Button
                                                onClick={() => copyRoomCode(room.room_code)}
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-sm text-gray-400">
                                            <span>🎮 {room.mode_name}</span>
                                            <span>⏱️ {room.duration}초</span>
                                            <span>💰 {room.coin_symbol}</span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {room.current_players}/{room.max_players}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Badge 
                                            className={
                                                room.status === 'waiting' 
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                            }
                                        >
                                            {room.status === 'waiting' ? '대기중' : '게임중'}
                                        </Badge>
                                        
                                        <Button
                                            onClick={() => onJoinRoom(room.room_code)}
                                            disabled={room.status === 'playing' || room.current_players >= room.max_players}
                                            size="sm"
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            참가
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        
                        {rooms.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>현재 활성화된 방이 없습니다.</p>
                                <p className="text-sm">새 방을 만들어보세요!</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}