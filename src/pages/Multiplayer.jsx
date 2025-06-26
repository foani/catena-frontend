import React, { useState, useEffect, useRef } from 'react';
import { useWeb3Auth } from '@/components/Web3AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Crown, ExternalLink, ArrowLeft, Settings, DollarSign, TrendingUp, Send, MessageCircle, Timer, Target, Wallet, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/i18n';
import { User, Bet, GameRound, Prediction } from '@/api/entities';

// 🔧 CTT 포인트 부동소수점 오류 해결 함수
const formatCttPoints = (points) => {
    if (!points && points !== 0) return '0';
    const num = Number(points);
    if (isNaN(num)) return '0';
    return Math.round(num).toString();
};

export default function MultiplayerPage() {
    const { user, isAuthenticated, updateCttBalance, updateScore, recordGamePlay } = useWeb3Auth();
    const { t } = useTranslation();
    const [currentRoom, setCurrentRoom] = useState(null);
    const [roomPlayers, setRoomPlayers] = useState([]);
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [showJoinRoom, setShowJoinRoom] = useState(false);
    
    // 🎮 게임 상태 관리
    const [gameState, setGameState] = useState('waiting'); // waiting, betting, countdown, result
    const [gameRound, setGameRound] = useState(1);
    const [currentRoundId, setCurrentRoundId] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [startPrice, setStartPrice] = useState(0);
    const [endPrice, setEndPrice] = useState(0);
    const [myBet, setMyBet] = useState(null);
    const [betAmount, setBetAmount] = useState(10);
    const [roundResults, setRoundResults] = useState([]);
    
    // 💰 CTT 잔액 실시간 표시
    const [displayBalance, setDisplayBalance] = useState(0);
    
    // 💬 채팅 관련 상태
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef(null);

    // 📈 실시간 가격 데이터
    const [coinPrices, setCoinPrices] = useState({
        BTC: { price: 105389.34, change: 0 },
        ETH: { price: 2439.27, change: 0 },
        CTA: { price: 5.6273, change: 0 }
    });

    // 사용자 CTT 잔액 동기화
    useEffect(() => {
        if (user && user.ctt_points !== undefined) {
            setDisplayBalance(user.ctt_points);
        }
    }, [user]);

    // 채팅 자동 스크롤
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // 🎯 게임 타이머 시스템
    useEffect(() => {
        let interval;
        if (timeLeft > 0 && (gameState === 'betting' || gameState === 'countdown')) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        if (gameState === 'betting') {
                            // 베팅 시간 종료 → 카운트다운 시작
                            handleBettingEnd();
                            return 10; // 10초 카운트다운
                        } else if (gameState === 'countdown') {
                            // 카운트다운 종료 → 결과 계산
                            handleRoundEnd();
                            return 0;
                        }
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timeLeft, gameState, coinPrices, currentRoom]);

    // 📊 실시간 가격 변동
    useEffect(() => {
        const interval = setInterval(() => {
            setCoinPrices(prev => {
                const newPrices = { ...prev };
                
                Object.keys(newPrices).forEach(coin => {
                    let changePercent = (Math.random() - 0.5) * 0.002; // -0.1% ~ +0.1% 변동 
                    
                    if (coin === 'CTA') {
                        const newPrice = prev[coin].price + (prev[coin].price * changePercent);
                        if (newPrice >= 5.0 && newPrice <= 6.0) {
                            newPrices[coin] = {
                                price: newPrice,
                                change: changePercent
                            };
                        }
                    } else {
                        newPrices[coin] = {
                            price: prev[coin].price + (prev[coin].price * changePercent),
                            change: changePercent
                        };
                    }
                });
                
                return newPrices;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // 방 생성/참가 폼 상태
    const [createRoomForm, setCreateRoomForm] = useState({
        roomName: '',
        gameMode: 'standard',
        roundTime: 30,
        selectedCoin: 'BTC'
    });

    const [joinRoomForm, setJoinRoomForm] = useState({
        roomCode: ''
    });

    const generateRoomCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    // 🎲 베팅 시간 종료 처리
    const handleBettingEnd = () => {
        const currentPrice = coinPrices[currentRoom?.selected_coin]?.price || 0;
        setStartPrice(currentPrice);
        setGameState('countdown');
        
        // GameRound 생성 (entities.js)
        const newRound = GameRound.create({
            start_price: currentPrice,
            start_time: new Date().toISOString(),
            is_active: true,
            coin: currentRoom?.selected_coin,
            round_number: gameRound
        });
        setCurrentRoundId(newRound.id);
        
        console.log(`[Round ${gameRound}] Betting ended. Start price: ${currentPrice}`);
    };

    // 🎯 베팅 처리 (실제 CTT 차감)
    const handleBet = async (direction) => {
        if (gameState !== 'betting' || myBet) return;
        
        if (betAmount < 10 || betAmount > 100) {
            alert('베팅 금액은 10-100 CTT 사이여야 합니다.');
            return;
        }

        if (displayBalance < betAmount) {
            alert(`CTT 잔액이 부족합니다. 현재 잔액: ${displayBalance} CTT`);
            return;
        }

        try {
            // 🔥 실제 CTT 차감
            const newBalance = displayBalance - betAmount;
            const updateSuccess = await updateCttBalance(newBalance);
            
            if (!updateSuccess) {
                alert('베팅 처리 중 오류가 발생했습니다.');
                return;
            }

            // 베팅 정보 저장
            const bet = {
                direction,
                amount: betAmount,
                timestamp: new Date(),
                userId: user.id
            };
            
            setMyBet(bet);
            setDisplayBalance(newBalance);
            
            // 🎮 게임 플레이 기록
            await recordGamePlay();
            
            // entities.js에 베팅 기록
            const betRecord = Bet.create({
                user_id: user.id,
                round_id: currentRoundId,
                prediction_type: direction,
                bet_amount: betAmount,
                potential_win: betAmount * 2,
                created_at: new Date().toISOString()
            });
            
            // 채팅에 베팅 알림
            addSystemMessage(`${user.full_name} bet ${betAmount} CTT on ${direction.toUpperCase()} | Balance: ${newBalance} CTT`);
            
            console.log(`[Bet Placed] ${direction.toUpperCase()} ${betAmount} CTT. New balance: ${newBalance}`);
            
        } catch (error) {
            console.error('[Bet Error]', error);
            alert('베팅 중 오류가 발생했습니다.');
        }
    };

    // 🏁 라운드 종료 처리 (실제 CTT 지급)
    const handleRoundEnd = async () => {
        const finalPrice = coinPrices[currentRoom?.selected_coin]?.price || 0;
        setEndPrice(finalPrice);
        
        if (myBet && currentRoundId) {
            try {
                const priceChanged = finalPrice > startPrice;
                const won = (myBet.direction === 'up' && priceChanged) || (myBet.direction === 'down' && !priceChanged);
                
                let newBalance = displayBalance;
                let ctfGained = 0;
                let scoreGained = 0;
                
                if (won) {
                    // 🎉 승리: 베팅 금액의 2배 지급
                    ctfGained = myBet.amount * 2;
                    scoreGained = Math.floor(myBet.amount / 10) * 10; // 10 CTT당 10점
                    newBalance = displayBalance + ctfGained;
                    
                    // 실제 CTT 및 점수 업데이트
                    await updateCttBalance(newBalance);
                    await updateScore((user.score || 0) + scoreGained);
                    
                    setDisplayBalance(newBalance);
                }
                
                // entities.js 베팅 결과 업데이트
                const betRecords = Bet.filter({ user_id: user.id, round_id: currentRoundId });
                if (betRecords.length > 0) {
                    Bet.update(betRecords[0].id, {
                        is_correct: won,
                        payout: won ? ctfGained : 0,
                        result_price: finalPrice
                    });
                }
                
                // GameRound 완료 처리
                if (currentRoundId) {
                    GameRound.update(currentRoundId, {
                        end_price: finalPrice,
                        end_time: new Date().toISOString(),
                        is_active: false
                    });
                }
                
                // Prediction 기록
                Prediction.create({
                    user_id: user.id,
                    round_id: currentRoundId,
                    prediction_type: myBet.direction,
                    is_correct: won,
                    points_earned: scoreGained
                });
                
                // 결과 저장
                const result = {
                    round: gameRound,
                    bet: myBet,
                    startPrice,
                    endPrice: finalPrice,
                    won,
                    ctfGained,
                    scoreGained,
                    newBalance
                };
                
                setRoundResults(prev => [...prev, result]);
                
                // 결과 채팅 메시지
                const resultMessage = won 
                    ? `🎉 Round ${gameRound} WINNER! ${user.full_name} won ${ctfGained} CTT (+${scoreGained} points) | Balance: ${newBalance} CTT`
                    : `😞 Round ${gameRound} ended. ${user.full_name} lost ${myBet.amount} CTT | Balance: ${newBalance} CTT`;
                
                addSystemMessage(resultMessage);
                
                console.log(`[Round ${gameRound}] ${won ? 'WON' : 'LOST'} - CTT: ${ctfGained}, Score: ${scoreGained}, Balance: ${newBalance}`);
                
            } catch (error) {
                console.error('[Round End Error]', error);
                addSystemMessage(`Round ${gameRound} ended with an error.`);
            }
        }
        
        setGameState('result');
        setTimeLeft(5);
        
        // 5초 후 다음 라운드
        setTimeout(() => {
            setGameRound(prev => prev + 1);
            setMyBet(null);
            setCurrentRoundId(null);
            setGameState('betting');
            setTimeLeft(currentRoom?.round_time || 30);
        }, 5000);
    };

    // 💬 시스템 메시지 추가
    const addSystemMessage = (message) => {
        const systemMessage = {
            id: Date.now(),
            userId: 'system',
            userName: 'System',
            message,
            timestamp: new Date(),
            isSystem: true
        };
        setChatMessages(prev => [...prev, systemMessage]);
    };

    // 채팅 메시지 전송
    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        
        const message = {
            id: Date.now(),
            userId: user.id,
            userName: user.full_name || user.name || 'Anonymous',
            message: newMessage.trim(),
            timestamp: new Date(),
            isMe: true
        };
        
        setChatMessages(prev => [...prev, message]);
        setNewMessage('');
        
        // 자동 응답 시뮬레이션 (개발용)
        setTimeout(() => {
            if (Math.random() > 0.7) {
                const responses = ['Good luck! 🍀', 'Nice bet! 💪', 'Let\'s go! 🚀', '화이팅! 💯'];
                const autoMessage = {
                    id: Date.now() + 1,
                    userId: 'bot_player',
                    userName: 'Other Player',
                    message: responses[Math.floor(Math.random() * responses.length)],
                    timestamp: new Date(),
                    isMe: false
                };
                setChatMessages(prev => [...prev, autoMessage]);
            }
        }, 1000 + Math.random() * 3000);
    };

    // 방 생성
    const handleCreateRoom = () => {
        if (!createRoomForm.roomName.trim()) {
            alert(t('enter_room_name'));
            return;
        }

        const roomCode = generateRoomCode();
        const newRoom = {
            id: `room_${Date.now()}`,
            room_code: roomCode,
            room_name: createRoomForm.roomName,
            game_mode: createRoomForm.gameMode,
            max_players: 10,
            round_time: createRoomForm.roundTime,
            selected_coin: createRoomForm.selectedCoin,
            current_players: [user.id],
            host_id: user.id,
            status: 'waiting',
            min_bet: 10,
            max_bet: 100,
            created_at: new Date().toISOString()
        };
        
        setCurrentRoom(newRoom);
        setRoomPlayers([{
            id: user.id,
            name: user.full_name || user.name || 'Anonymous',
            score: user.score || 0,
            isHost: true,
            ctt_balance: displayBalance,
            wallet_address: user.walletAddress
        }]);
        
        setChatMessages([{
            id: Date.now(),
            userId: 'system',
            userName: 'System',
            message: `🎉 Welcome to ${createRoomForm.roomName}! Room created by ${user.full_name}`,
            timestamp: new Date(),
            isSystem: true
        }]);
        
        alert(`${t('room_created')}\n${t('room_code_is', { code: roomCode })}`);
        setShowCreateRoom(false);
        
        setCreateRoomForm({
            roomName: '',
            gameMode: 'standard',
            roundTime: 30,
            selectedCoin: 'BTC'
        });
    };

    // 방 참가
    const handleJoinRoom = () => {
        if (!joinRoomForm.roomCode.trim()) {
            alert(t('enter_room_code'));
            return;
        }

        const roomCode = joinRoomForm.roomCode.toUpperCase();
        
        if (roomCode.length !== 6) {
            alert(t('invalid_room_code'));
            return;
        }

        const mockRoom = {
            id: 'joined_room',
            room_code: roomCode,
            room_name: `Room ${roomCode}`,
            game_mode: 'standard',
            max_players: 10,
            round_time: 30,
            selected_coin: 'ETH',
            host_id: 'other_player1',
            current_players: [user.id, 'other_player1', 'other_player2'],
            status: 'waiting',
            min_bet: 10,
            max_bet: 100
        };
        
        const mockPlayers = [
            { 
                id: 'other_player1', 
                name: 'Host Player', 
                score: 120, 
                isHost: true,
                ctt_balance: 150,
                wallet_address: '0x742d35cc6341234567890abcdef'
            },
            { 
                id: 'other_player2', 
                name: 'Player 2', 
                score: 95, 
                isHost: false,
                ctt_balance: 80,
                wallet_address: '0x852e46bb7452345678901bcdef'
            },
            { 
                id: user.id, 
                name: user.full_name || user.name || 'Anonymous', 
                score: user.score || 0, 
                isHost: false,
                ctt_balance: displayBalance,
                wallet_address: user.walletAddress
            }
        ];
        
        setCurrentRoom(mockRoom);
        setRoomPlayers(mockPlayers);
        
        setChatMessages([
            {
                id: 1,
                userId: 'system',
                userName: 'System',
                message: `🎮 Welcome to Room ${roomCode}!`,
                timestamp: new Date(Date.now() - 300000),
                isSystem: true
            },
            {
                id: 2,
                userId: 'other_player1',
                userName: 'Host Player',
                message: 'Hello everyone! Let\'s play! 🚀',
                timestamp: new Date(Date.now() - 240000),
                isMe: false
            },
            {
                id: 3,
                userId: 'other_player2',
                userName: 'Player 2',
                message: 'Ready to win some CTT! 💰',
                timestamp: new Date(Date.now() - 180000),
                isMe: false
            },
            {
                id: 4,
                userId: 'system',
                userName: 'System',
                message: `👋 ${user.full_name || user.name || 'Anonymous'} joined the room!`,
                timestamp: new Date(),
                isSystem: true
            }
        ]);
        
        alert(t('joined_room', { code: roomCode }));
        setShowJoinRoom(false);
        setJoinRoomForm({ roomCode: '' });
    };

    // 방 나가기
    const handleLeaveRoom = () => {
        setCurrentRoom(null);
        setRoomPlayers([]);
        setChatMessages([]);
        setShowCreateRoom(false);
        setShowJoinRoom(false);
        setGameState('waiting');
        setMyBet(null);
        setGameRound(1);
        setRoundResults([]);
        setCurrentRoundId(null);
    };

    // 게임 시작
    const handleStartGame = () => {
        if (currentRoom && roomPlayers.some(p => p.id === user.id && p.isHost)) {
            setCurrentRoom(prev => ({ ...prev, status: 'in_game' }));
            setGameState('betting');
            setGameRound(1);
            setTimeLeft(currentRoom.round_time);
            
            addSystemMessage(`🎮 Game Started! Round 1 - Predict ${currentRoom.selected_coin} price movement!`);
        }
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const getCurrentPrice = () => {
        return coinPrices[currentRoom?.selected_coin]?.price || 0;
    };

    // 💰 CTT 잔액 부족 경고
    const isInsufficientBalance = betAmount > displayBalance;

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
                <div className="text-center text-gray-200">
                    <h1 className="text-2xl font-bold mb-4 text-white">{t('multiplayer_auth_required')}</h1>
                    <p className="text-gray-300">{t('multiplayer_login_required')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* 페이지 헤더 */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-cyan-400 mb-2">{t('multiplayer_title')}</h1>
                    <p className="text-gray-200">{t('multiplayer_description')}</p>
                    
                    {/* 💰 사용자 잔액 표시 */}
                    <div className="mt-4 flex justify-center">
                        <Card className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border-green-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-center gap-4">
                                    <Wallet className="w-6 h-6 text-green-400" />
                                    <div className="text-center">
                                    <p className="text-2xl font-bold text-green-400">{formatCttPoints(displayBalance)} CTT</p>
                                    <p className="text-sm text-gray-300">{t('your_balance')}</p>
                                    </div>
                                    <div className="text-center">
                                    <p className="text-lg font-bold text-blue-400">{user?.score || 0}</p>
                                    <p className="text-sm text-gray-300">{t('score')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* 실시간 가격 표시 */}
                <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/30">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(coinPrices).map(([coin, data]) => (
                                <div key={coin} className="flex items-center justify-center space-x-2">
                                    <TrendingUp className={`w-6 h-6 ${coin === 'CTA' ? 'text-yellow-400' : coin === 'BTC' ? 'text-orange-400' : 'text-blue-400'}`} />
                                    <div className="text-center">
                                        <p className="text-sm text-gray-300">{coin}</p>
                                        <p className={`text-xl font-bold ${coin === 'CTA' ? 'text-yellow-400' : coin === 'BTC' ? 'text-orange-400' : 'text-blue-400'}`}>
                                            ${coin === 'CTA' ? data.price.toFixed(4) : data.price.toFixed(2)}
                                            <span className={`ml-2 text-xs ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {data.change >= 0 ? '+' : ''}{(data.change * 100).toFixed(2)}%
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-sm text-gray-300 mt-2">
                            {t('bet_amount')}: CTT • Real-time blockchain prices
                        </p>
                    </CardContent>
                </Card>

                {!currentRoom ? (
                    /* 🏢 로비 화면 */
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button 
                                onClick={() => setShowCreateRoom(true)}
                                className="h-16 text-lg bg-green-600 hover:bg-green-700"
                            >
                                <Users className="w-6 h-6 mr-2" />
                                {t('create_room')}
                            </Button>
                            <Button 
                                onClick={() => setShowJoinRoom(true)}
                                className="h-16 text-lg bg-blue-600 hover:bg-blue-700"
                            >
                                <ExternalLink className="w-6 h-6 mr-2" />
                                {t('join_room')}
                            </Button>
                        </div>

                        {/* 방 생성 폼 */}
                        {showCreateRoom && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <Card className="bg-gray-800/50 border-gray-700">
                                    <CardHeader>
                                        <CardTitle className="text-green-400 flex items-center gap-2">
                                            <Settings className="w-5 h-5" />
                                            {t('room_settings')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label htmlFor="roomName" className="text-gray-200">{t('room_name')}</Label>
                                            <Input
                                                id="roomName"
                                                placeholder={t('enter_room_name')}
                                                value={createRoomForm.roomName}
                                                onChange={(e) => setCreateRoomForm({
                                                    ...createRoomForm,
                                                    roomName: e.target.value
                                                })}
                                                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="gameMode" className="text-gray-200">{t('game_mode')}</Label>
                                                <select
                                                    id="gameMode"
                                                    value={createRoomForm.gameMode}
                                                    onChange={(e) => setCreateRoomForm({
                                                        ...createRoomForm,
                                                        gameMode: e.target.value
                                                    })}
                                                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                                                >
                                                    <option value="quick">{t('quick_game')}</option>
                                                    <option value="standard">{t('standard_game')}</option>
                                                    <option value="extended">{t('extended_game')}</option>
                                                </select>
                                            </div>

                                            <div>
                                                <Label htmlFor="roundTime" className="text-gray-200">{t('round_time')}</Label>
                                                <select
                                                    id="roundTime"
                                                    value={createRoomForm.roundTime}
                                                    onChange={(e) => setCreateRoomForm({
                                                        ...createRoomForm,
                                                        roundTime: parseInt(e.target.value)
                                                    })}
                                                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                                                >
                                                    <option value={30}>30{t('seconds_text')}</option>
                                                    <option value={60}>60{t('seconds_text')}</option>
                                                    <option value={120}>120{t('seconds_text')}</option>
                                                </select>
                                            </div>

                                            <div>
                                                <Label htmlFor="selectedCoin" className="text-gray-200">{t('coin_selection')}</Label>
                                                <select
                                                    id="selectedCoin"
                                                    value={createRoomForm.selectedCoin}
                                                    onChange={(e) => setCreateRoomForm({
                                                        ...createRoomForm,
                                                        selectedCoin: e.target.value
                                                    })}
                                                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                                                >
                                                    <option value="BTC">Bitcoin (BTC)</option>
                                                    <option value="ETH">Ethereum (ETH)</option>
                                                    <option value="CTA">Catena (CTA)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* 베팅 정보 */}
                                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                                            <p className="text-blue-300 font-medium text-center">{t('bet_amount')}: CTT {t('points_text')}</p>
                                            <p className="text-sm text-gray-300 text-center">{t('max_players')}: 10</p>
                                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                                                <div className="text-center">
                                                    <span className="text-gray-300">{t('min_bet')}: </span>
                                                    <span className="text-green-400">10 CTT</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-gray-300">{t('max_bet')}: </span>
                                                    <span className="text-red-400">100 CTT</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button 
                                                onClick={handleCreateRoom}
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                            >
                                                {t('create')}
                                            </Button>
                                            <Button 
                                                onClick={() => setShowCreateRoom(false)}
                                                variant="outline"
                                                className="flex-1 text-gray-200 border-gray-600"
                                            >
                                                {t('cancel')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* 방 참가 폼 */}
                        {showJoinRoom && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <Card className="bg-gray-800/50 border-gray-700">
                                    <CardHeader>
                                        <CardTitle className="text-blue-400">{t('join_room')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label htmlFor="roomCode" className="text-gray-200">{t('room_code')}</Label>
                                            <Input
                                                id="roomCode"
                                                placeholder={t('enter_room_code')}
                                                value={joinRoomForm.roomCode}
                                                onChange={(e) => setJoinRoomForm({
                                                    roomCode: e.target.value.toUpperCase()
                                                })}
                                                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                                maxLength={6}
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button 
                                                onClick={handleJoinRoom}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                            >
                                                {t('join')}
                                            </Button>
                                            <Button 
                                                onClick={() => setShowJoinRoom(false)}
                                                variant="outline"
                                                className="flex-1 text-gray-200 border-gray-600"
                                            >
                                                {t('cancel')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </div>
                ) : currentRoom.status === 'waiting' ? (
                    /* 🏠 대기실 화면 */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* 방 정보 */}
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                                            <Users className="w-6 h-6" />
                                            {currentRoom.room_name} ({currentRoom.room_code})
                                        </CardTitle>
                                        <Button onClick={handleLeaveRoom} variant="outline" className="text-gray-800 border-gray-600">
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            {t('leave_room')}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-cyan-400">{t(currentRoom.game_mode + '_game')}</p>
                                            <p className="text-sm text-gray-300">{t('game_mode')}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-400">{currentRoom.round_time}{t('seconds_text')}</p>
                                            <p className="text-sm text-gray-300">{t('round_time')}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-orange-400">{currentRoom.selected_coin}</p>
                                            <p className="text-sm text-gray-300">{t('coin_selection')}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-purple-400">
                                                {roomPlayers.length}/{currentRoom.max_players}
                                            </p>
                                            <p className="text-sm text-gray-300">{t('participants')}</p>
                                        </div>
                                        <div className="text-center">
                                            <Badge className="bg-green-500/20 text-green-400">
                                                {t('waiting')}
                                            </Badge>
                                            <p className="text-sm text-gray-300">{t('status')}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 참가자 목록 */}
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold text-purple-400">
                                        {t('participants')} ({roomPlayers.length}/{currentRoom.max_players})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 gap-3">
                                        {roomPlayers.map((player, index) => (
                                            <motion.div
                                                key={player.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className={`p-4 rounded-lg border ${
                                                    player.id === user.id 
                                                        ? 'bg-cyan-500/20 border-cyan-500/30' 
                                                        : 'bg-gray-700/50 border-gray-600'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        {player.isHost && <Crown className="w-5 h-5 text-yellow-400" />}
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-white text-lg">{player.name}</span>
                                                                {player.id === user.id && (
                                                                    <Badge className="bg-green-500/20 text-green-400 text-xs">{t('me')}</Badge>
                                                                )}
                                                                {player.isHost && (
                                                                    <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">{t('host')}</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-400">{player.wallet_address}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-green-400">{player.ctt_balance} CTT</div>
                                                        <div className="text-sm text-blue-400">{player.score} points</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                    
                                    {/* 게임 시작 버튼 */}
                                    {roomPlayers.some(p => p.id === user.id && p.isHost) && (
                                        <div className="mt-6 text-center">
                                            <Button 
                                                onClick={handleStartGame}
                                                className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
                                            >
                                                🚀 {t('start_game')}
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* 채팅 */}
                        <div className="lg:col-span-1">
                            <Card className="bg-gray-800/50 border-gray-700 h-[600px] flex flex-col">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-green-400 flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5" />
                                        {t('chat')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col p-0">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[480px]">
                                        {chatMessages.map((msg) => (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`${
                                                    msg.isSystem 
                                                        ? 'text-center' 
                                                        : msg.isMe 
                                                            ? 'text-right' 
                                                            : 'text-left'
                                                }`}
                                            >
                                                {msg.isSystem ? (
                                                    <div className="text-xs text-gray-400 bg-gray-700/30 rounded px-2 py-1 inline-block">
                                                        {msg.message}
                                                    </div>
                                                ) : (
                                                    <div className={`max-w-[80%] inline-block ${msg.isMe ? 'ml-auto' : 'mr-auto'}`}>
                                                        <div className="text-xs text-gray-400 mb-1">
                                                            {msg.userName} • {formatTime(msg.timestamp)}
                                                        </div>
                                                        <div className={`rounded-lg px-3 py-2 ${
                                                            msg.isMe 
                                                                ? 'bg-cyan-600 text-white' 
                                                                : 'bg-gray-700 text-gray-100'
                                                        }`}>
                                                            {msg.message}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>

                                    <div className="p-4 border-t border-gray-700">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder={t('chat_placeholder')}
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                                maxLength={200}
                                            />
                                            <Button 
                                                onClick={handleSendMessage}
                                                disabled={!newMessage.trim()}
                                                className="bg-cyan-600 hover:bg-cyan-700"
                                            >
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    /* 🎮 게임 플레이 화면 */
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3 space-y-6">
                            {/* 게임 상태 */}
                            <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-500/30">
                                <CardContent className="p-6">
                                    <div className="text-center space-y-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <Timer className="w-8 h-8 text-cyan-400" />
                                            <div>
                                                <h2 className="text-3xl font-bold text-white">Round {gameRound}</h2>
                                                <p className="text-lg text-gray-300">
                                                    {gameState === 'betting' && `⏰ Betting: ${timeLeft}s`}
                                                    {gameState === 'countdown' && `🔒 Lock: ${timeLeft}s`}
                                                    {gameState === 'result' && '✅ Round Ended'}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-green-400">{formatCttPoints(displayBalance)} CTT</p>
                                                <p className="text-sm text-gray-400">{t('balance')}</p>
                                            </div>
                                        </div>
                                        
                                        {/* 현재 가격 */}
                                        <div className="bg-gray-800/50 rounded-lg p-6">
                                            <h3 className="text-2xl font-bold text-orange-400 mb-2">{currentRoom.selected_coin} Price</h3>
                                            <p className="text-4xl font-bold text-white">
                                                ${getCurrentPrice().toFixed(4)}
                                            </p>
                                            {gameState === 'countdown' && startPrice > 0 && (
                                                <p className="text-lg text-gray-400 mt-2">
                                                    Start: ${startPrice.toFixed(4)}
                                                </p>
                                            )}
                                            {gameState === 'result' && (
                                                <div className="mt-4 space-y-2">
                                                    <p className="text-lg text-gray-400">Start: ${startPrice.toFixed(4)}</p>
                                                    <p className="text-lg text-gray-400">End: ${endPrice.toFixed(4)}</p>
                                                    <p className={`text-2xl font-bold ${endPrice > startPrice ? 'text-green-400' : 'text-red-400'}`}>
                                                        {endPrice > startPrice ? '⬆ UP' : '⬇ DOWN'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 베팅 영역 */}
                            {gameState === 'betting' && (
                                <Card className="bg-gray-800/50 border-gray-700">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold text-green-400 flex items-center gap-2">
                                            <Target className="w-5 h-5" />
                                            {t('place_your_bet')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* 베팅 금액 설정 */}
                                        <div>
                                            <Label className="text-gray-200">{t('bet_amount_ctt')}</Label>
                                            <div className="flex gap-2 mt-2">
                                                <Input
                                                    type="number"
                                                    value={betAmount}
                                                    onChange={(e) => setBetAmount(Number(e.target.value))}
                                                    min={10}
                                                    max={Math.min(100, displayBalance)}
                                                    className={`bg-gray-700 border-gray-600 text-white ${isInsufficientBalance ? 'border-red-500' : ''}`}
                                                />
                                                <Button
                                                    onClick={() => setBetAmount(10)}
                                                    variant="outline"
                                                    className="text-gray-800 border-gray-600"
                                                >
                                                    {t('min')}
                                                </Button>
                                                <Button
                                                    onClick={() => setBetAmount(Math.min(100, displayBalance))}
                                                    variant="outline"
                                                    className="text-gray-800 border-gray-600"
                                                >
                                                    {t('max')}
                                                </Button>
                                            </div>
                                            {isInsufficientBalance && (
                                                <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                                                    <AlertCircle className="w-4 h-4" />
                                                    {t('insufficient_balance_available', { balance: formatCttPoints(displayBalance) })}
                                                </div>
                                            )}
                                        </div>

                                        {/* 베팅 버튼 */}
                                        {!myBet ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                <Button
                                                    onClick={() => handleBet('up')}
                                                    disabled={isInsufficientBalance}
                                                    className="h-20 text-2xl bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    <div className="text-center">
                                                        <div>⬆ {t('game_predict_up')}</div>
                                                        <div className="text-sm">{t('win_label', { amount: betAmount * 2 })}</div>
                                                    </div>
                                                </Button>
                                                <Button
                                                    onClick={() => handleBet('down')}
                                                    disabled={isInsufficientBalance}
                                                    className="h-20 text-2xl bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    <div className="text-center">
                                                        <div>⬇ {t('game_predict_down')}</div>
                                                        <div className="text-sm">{t('win_label', { amount: betAmount * 2 })}</div>
                                                    </div>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center p-6 bg-blue-900/20 rounded-lg border border-blue-500/30">
                                                <p className="text-2xl font-bold text-blue-300">🎯 {t('bet_placed')}</p>
                                                <p className="text-xl text-white mt-2">
                                                    {formatCttPoints(myBet.amount)} CTT on {myBet.direction.toUpperCase()}
                                                </p>
                                                <p className="text-sm text-gray-400">{t('wait_for_round')}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* 게임 결과 */}
                            {gameState === 'result' && myBet && roundResults.length > 0 && (
                                <Card className="bg-gray-800/50 border-gray-700">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold text-purple-400">🏁 Round Result</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center space-y-4">
                                            <div className={`text-4xl font-bold ${roundResults[roundResults.length - 1].won ? 'text-green-400' : 'text-red-400'}`}>
                                                {roundResults[roundResults.length - 1].won ? '🎉 YOU WON!' : '😞 YOU LOST'}
                                            </div>
                                            <div className="text-xl text-white space-y-2">
                                                <p>Your bet: {myBet.amount} CTT on {myBet.direction.toUpperCase()}</p>
                                                <p className={`text-2xl font-bold ${roundResults[roundResults.length - 1].won ? 'text-green-400' : 'text-red-400'}`}>
                                                    {roundResults[roundResults.length - 1].won ? 
                                                        `+${roundResults[roundResults.length - 1].ctfGained} CTT` : 
                                                        `-${myBet.amount} CTT`
                                                    }
                                                </p>
                                                {roundResults[roundResults.length - 1].scoreGained > 0 && (
                                                    <p className="text-blue-400">+{roundResults[roundResults.length - 1].scoreGained} Score!</p>
                                                )}
                                                <p className="text-gray-400">New Balance: {roundResults[roundResults.length - 1].newBalance} CTT</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* 이전 라운드 결과 히스토리 */}
                            {roundResults.length > 1 && (
                                <Card className="bg-gray-800/50 border-gray-700">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold text-gray-300">📊 Game History</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 max-h-32 overflow-y-auto">
                                            {roundResults.slice(-5).reverse().map((result, index) => (
                                                <div key={result.round} className="flex justify-between items-center text-sm p-2 bg-gray-700/30 rounded">
                                                    <span>Round {result.round}</span>
                                                    <span>{result.bet.direction.toUpperCase()}</span>
                                                    <span className={result.won ? 'text-green-400' : 'text-red-400'}>
                                                        {result.won ? `+${result.ctfGained}` : `-${result.bet.amount}`} CTT
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* 채팅 */}
                        <div className="lg:col-span-1">
                            <Card className="bg-gray-800/50 border-gray-700 h-[800px] flex flex-col">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-green-400 flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5" />
                                        {t('live_chat')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col p-0">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {chatMessages.map((msg) => (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`${
                                                    msg.isSystem 
                                                        ? 'text-center' 
                                                        : msg.isMe 
                                                            ? 'text-right' 
                                                            : 'text-left'
                                                }`}
                                            >
                                                {msg.isSystem ? (
                                                    <div className="text-xs text-gray-400 bg-gray-700/30 rounded px-2 py-1 inline-block">
                                                        {msg.message}
                                                    </div>
                                                ) : (
                                                    <div className={`max-w-[80%] inline-block ${msg.isMe ? 'ml-auto' : 'mr-auto'}`}>
                                                        <div className="text-xs text-gray-400 mb-1">
                                                            {msg.userName} • {formatTime(msg.timestamp)}
                                                        </div>
                                                        <div className={`rounded-lg px-3 py-2 ${
                                                            msg.isMe 
                                                                ? 'bg-cyan-600 text-white' 
                                                                : 'bg-gray-700 text-gray-100'
                                                        }`}>
                                                            {msg.message}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>

                                    <div className="p-4 border-t border-gray-700">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder={t('type_message')}
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                                maxLength={200}
                                            />
                                            <Button 
                                                onClick={handleSendMessage}
                                                disabled={!newMessage.trim()}
                                                className="bg-cyan-600 hover:bg-cyan-700"
                                            >
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}