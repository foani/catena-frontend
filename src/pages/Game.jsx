
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Clock, HelpCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { InvokeLLM } from '@/api/integrations';
import { User } from '@/api/entities';
import { GameRound } from '@/api/entities';
import { Prediction } from '@/api/entities';
import { Bet } from '@/api/entities';
import { useWeb3Auth } from '@/components/Web3AuthProvider';
import { useTranslation } from '@/components/i18n';
import GameModeSelector from '@/components/GameModeSelector';
import BettingPanel from '@/components/BettingPanel';
import RoundResultDisplay from '@/components/RoundResultDisplay'; // Added import

const COINS = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'Binance Coin' },
    { symbol: 'SOL', name: 'Solana' }
];



const generateInitialData = (price) => {
    let data = [];
    if (!price) return data;
    for (let i = 0; i < 60; i++) {
        data.push({ time: `-${60 - i}s`, price });
    }
    return data;
};

export default function GamePage() {
    const { user: authUser, ensureAuthenticated, isAuthenticated } = useWeb3Auth();
    const { t } = useTranslation();
    
    // 💰 CTT 포인트 포맷팅 함수 (부동소수점 오류 해결)
    const formatCttPoints = (points) => {
        return Math.round(points || 0);
    };
    
    // 다국어 게임 모드 정의
    const GAME_MODES = [
        { id: 'quick', name: t('quick_game'), duration: 15, icon: TrendingUp, description: t('quick_game_desc'), multiplier: 1.8, minBet: 1, maxBet: 50 },
        { id: 'standard', name: t('standard_game'), duration: 30, icon: TrendingUp, description: t('standard_desc'), multiplier: 2.0, minBet: 1, maxBet: 100 },
        { id: 'extended', name: t('extended_game'), duration: 60, icon: TrendingUp, description: t('extended_desc'), multiplier: 2.2, minBet: 5, maxBet: 200 },
        { id: 'pro', name: t('pro_mode'), duration: 180, icon: TrendingUp, description: t('pro_mode_desc'), multiplier: 2.5, minBet: 10, maxBet: 500 },
        { id: 'expert', name: t('expert_mode'), duration: 300, icon: TrendingUp, description: t('expert_desc'), multiplier: 3.0, minBet: 20, maxBet: 1000 }
    ];
    const [selectedCoin, setSelectedCoin] = useState(COINS[0]);
    const [selectedMode, setSelectedMode] = useState(GAME_MODES[1]); // 기본값: 스탠다드 모드
    const [chartData, setChartData] = useState([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [bet, setBet] = useState(null);
    const [isRoundActive, setIsRoundActive] = useState(false);
    const [roundResult, setRoundResult] = useState(null);
    const [currentRound, setCurrentRound] = useState(null);
    const [user, setUser] = useState(null);
    const [cttPoints, setCttPoints] = useState(100);
    const [isLoadingPrice, setIsLoadingPrice] = useState(true);
    const [userStats, setUserStats] = useState({ todayPredictions: 0, winRate: 0 });
    const [dailyGamesLeft, setDailyGamesLeft] = useState(20);
    const gameTimerRef = useRef(null); // 타이머 ref 추가
    const [roundFinished, setRoundFinished] = useState(false); // 라운드 종료 상태 추가

    const fetchRealPrice = async (coinSymbol) => {
        try {
            const result = await InvokeLLM({
                prompt: `Get the current price of ${coinSymbol} cryptocurrency in USD. Return only the numeric price value.`,
                add_context_from_internet: true,
                response_json_schema: { type: "object", properties: { price: { type: "number" } } }
            });
            return result?.price;
        } catch (error) {
            console.error('Failed to fetch real price:', error);
            return null;
        }
    };

    const initializeCoin = async (coin) => {
        if (!isAuthenticated) return;

        setIsLoadingPrice(true);
        setBet(null);
        setRoundResult(null);

        const initialPrice = await fetchRealPrice(coin.symbol);
        if (initialPrice) {
            setCurrentPrice(initialPrice);
            setChartData(generateInitialData(initialPrice));
            await startNewRound(initialPrice, selectedMode.duration);
        } else {
             setIsRoundActive(false);
        }
        setIsLoadingPrice(false);
    };

    const startNewRound = async (startPrice, duration) => {
        try {
            await ensureAuthenticated();
            
            const roundDuration = duration || selectedMode.duration;
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + roundDuration * 1000);
            
            const round = await GameRound.create({
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                start_price: startPrice,
                is_active: true
            });
            
            setCurrentRound(round);
            setTimeLeft(roundDuration);
            setIsRoundActive(true);
        } catch (error) {
            console.error('Failed to create round:', error);
            setIsRoundActive(false);
        }
    };

    const finishRound = useCallback(async () => {
        setIsRoundActive(false);
        
        // 🔧 수정: 차트에서 보이는 가격으로 판정 (사용자 혼란 방지)
        const finalPrice = currentPrice;
        setCurrentPrice(finalPrice);

        if (currentRound) {
            try {
                // 라운드 종료 기록
                await GameRound.update(currentRound.id, { end_price: finalPrice, is_active: false });
                const startPrice = currentRound.start_price;
                const actualResult = finalPrice > startPrice ? 'UP' : 'DOWN';

                // 🔍 디버그 로그 추가
                console.log('🎯 [BETTING DEBUG] =================');
                console.log('시작 가격 (Start Price):', startPrice);
                console.log('종료 가격 (Final Price):', finalPrice);
                console.log('차트 마지막 가격 (Chart Price):', currentPrice);
                console.log('가격 변화:', finalPrice > startPrice ? '상승 (UP)' : '하락 (DOWN)');
                console.log('실제 결과 (Actual Result):', actualResult);

                // 베팅 여부 확인 - 더 간단한 조건으로 변경
                if (bet && bet.bet_amount > 0 && bet.prediction_type) {
                    const isCorrect = bet.prediction_type === actualResult;
                    const pointsEarned = isCorrect ? 10 : 0;
                    const payout = isCorrect ? bet.potential_win : 0;

                    // 🔍 베팅 결과 디버그 로그
                    console.log('🎲 사용자 베팅 (User Bet):', bet.prediction_type);
                    console.log('🏆 결과 비교:', bet.prediction_type, '===', actualResult, '?', isCorrect);
                    console.log('💰 판정 결과 (Is Correct):', isCorrect ? '성공 (SUCCESS)' : '실패 (FAIL)');
                    console.log('💵 지급 금액 (Payout):', payout, 'CTT');
                    console.log('===========================================');

                    await Bet.update(bet.id, { is_correct: isCorrect, payout: payout });
                    await Prediction.create({ 
                        user_id: user.id, 
                        round_id: currentRound.id, 
                        prediction_type: bet.prediction_type, 
                        is_correct: isCorrect, 
                        points_earned: pointsEarned 
                    });
                    
                    const newCttPoints = Math.round(cttPoints + payout);
                    setCttPoints(newCttPoints);
                    
                    await User.updateMyUserData({ 
                        score: (user.score || 0) + pointsEarned, 
                        prediction_count: (user.prediction_count || 0) + 1,
                        ctt_points: Math.round(newCttPoints)
                    });

                    setRoundResult({ 
                        correct: isCorrect, 
                        actual: actualResult, 
                        startPrice, 
                        finalPrice, 
                        pointsEarned, 
                        payout,
                        betAmount: bet.bet_amount,
                        hasBet: true // 명시적으로 베팅했음을 표시
                    });
                } else {
                    setRoundResult({ 
                        correct: null, 
                        actual: actualResult, 
                        startPrice, 
                        finalPrice,
                        payout: 0,
                        betAmount: 0,
                        hasBet: false // 명시적으로 베팅 안했음을 표시
                    });
                }
            } catch (error) {
                console.error('Failed to process round result:', error);
            }
        }
    }, [selectedCoin, currentPrice, currentRound, bet, user, cttPoints]);

    useEffect(() => {
        const fetchUserAndData = async () => {
            if (!isAuthenticated) return;
            
            try {
                const userData = await ensureAuthenticated();
                setUser(userData);
                setCttPoints(Math.round(userData.ctt_points || 100));
                
                const predictions = await Prediction.filter({ user_id: userData.id });
                const todayPredictions = predictions.filter(p => new Date(p.created_date).toDateString() === new Date().toDateString()).length;
                const correctPredictions = predictions.filter(p => p.is_correct).length;
                const winRate = predictions.length > 0 ? (correctPredictions / predictions.length * 100).toFixed(1) : 0;
                setUserStats({ todayPredictions, winRate });
                
                const today = new Date().toDateString();
                const lastGameDate = userData.last_game_date;
                
                if (lastGameDate && new Date(lastGameDate).toDateString() === today) {
                    setDailyGamesLeft(Math.max(0, 20 - (userData.daily_games_played || 0)));
                } else {
                    setDailyGamesLeft(20);
                    await User.updateMyUserData({
                        daily_games_played: 0,
                        last_game_date: today
                    });
                }
                
                // 최초 진입 시 코인 초기화
                await initializeCoin(selectedCoin);
            } catch (error) {
                console.error('Failed to initialize user data:', error);
                setUser(null);
            }
        };
        
        if (isAuthenticated) {
            fetchUserAndData();
        }
    }, [isAuthenticated]);

    // 타이머 로직
    useEffect(() => {
        if (!isRoundActive) {
            if (gameTimerRef.current) clearInterval(gameTimerRef.current);
            return;
        }

        gameTimerRef.current = setInterval(() => {
            setCurrentPrice(prevPrice => {
                const volatility = prevPrice * 0.01;
                const change = (Math.random() - 0.5) * volatility;
                const newPrice = Math.max(prevPrice + change, prevPrice * 0.95);
                
                setChartData(prevData => {
                    if (prevData.length < 1) return [];
                    return [...prevData.slice(1), { time: 'now', price: newPrice }];
                });
                return newPrice;
            });

            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(gameTimerRef.current);
                    setRoundFinished(true); // 라운드 종료 상태 설정
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(gameTimerRef.current);
    }, [isRoundActive]);

    // 라운드 종료 처리 로직 분리
    useEffect(() => {
        if (roundFinished) {
            finishRound();
            setRoundFinished(false);
        }
    }, [roundFinished, finishRound]);

    const handleNextRound = () => {
        setRoundResult(null); // Clear the result display
        initializeCoin(selectedCoin); // Start a new round for the current coin
    };

    const handlePlaceBet = async (type, amount) => {
        if (dailyGamesLeft <= 0) {
            alert(t('daily_games_exhausted_alert'));
            return;
        }

        if (isRoundActive && !bet && isAuthenticated && cttPoints >= amount) {
            const potentialWin = Math.round(amount * selectedMode.multiplier);
            const newBet = await Bet.create({
                user_id: user.id,
                round_id: currentRound.id,
                prediction_type: type,
                bet_amount: amount,
                potential_win: potentialWin
            });
            setBet(newBet);
            
            // 🔍 베팅 시점 디버그 로그
            console.log('🎰 [BET PLACED] ===================');
            console.log('베팅 시점 현재 가격:', currentPrice);
            console.log('라운드 시작 가격:', currentRound.start_price);
            console.log('사용자 베팅:', type);
            console.log('========================================');
            
            const newPoints = Math.round(cttPoints - amount);
            setCttPoints(newPoints);
            
            const today = new Date().toDateString();
            const newDailyCount = (user.daily_games_played || 0) + 1;
            setDailyGamesLeft(20 - newDailyCount);
            
            await User.updateMyUserData({
                ctt_points: Math.round(newPoints),
                daily_games_played: newDailyCount,
                last_game_date: today
            });
        }
    };

    const handleCoinChange = (coin) => {
        if (isLoadingPrice || !isAuthenticated) return;
        setSelectedCoin(coin);
        initializeCoin(coin); // 코인 변경 시 바로 초기화
    };
    
    const handleModeChange = (mode) => {
        if (isLoadingPrice || !isAuthenticated) {
            alert(t('loading_or_login_required')); // 다국어 처리
            return;
        }

        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current);
        }

        setIsRoundActive(false);
        setBet(null);
        setRoundResult(null); // Clear result when mode changes
        setSelectedMode(mode);
        
        if (currentPrice > 0) {
            startNewRound(currentPrice, mode.duration);
        } else {
            console.error("가격 정보가 없어 새 라운드를 시작할 수 없습니다.");
        }
    };

    const formatPrice = (price) => {
        if (typeof price !== 'number' || !price) return '$--';
        return price >= 1000 ? `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : `$${price.toFixed(4)}`;
    };

    const yDomain = [currentPrice * 0.95, currentPrice * 1.05];

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
                <div className="text-center text-gray-400">
                    <h1 className="text-2xl font-bold mb-4">{t('authentication_required')}</h1>
                    <p>{t('login_to_play_game')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 relative">
            <div className="mb-4">
                <GameModeSelector selectedMode={selectedMode} onModeSelect={handleModeChange} />
            </div>
            
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-center text-yellow-400 text-sm">
                    {t('daily_games_left')}: <span className="font-bold">{dailyGamesLeft}/20</span> | 
                    {t('ctt_points')}: <span className="font-bold">{formatCttPoints(cttPoints)}</span>
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="bg-gray-800/50 border-gray-700 shadow-2xl shadow-cyan-500/10">
                        <CardContent className="p-2 md:p-4">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 px-2 gap-4">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                                        {selectedCoin.symbol}/USDT
                                        {isLoadingPrice && <TrendingUp className="w-4 h-4 animate-pulse text-cyan-500" />}
                                    </h2>
                                    <div className="flex gap-2">
                                        {COINS.map((coin) => (
                                            <Button key={coin.symbol} variant={selectedCoin.symbol === coin.symbol ? "default" : "outline"} size="sm" onClick={() => handleCoinChange(coin)} className={selectedCoin.symbol === coin.symbol ? "bg-cyan-600 hover:bg-cyan-700" : "border-gray-600 hover:bg-gray-700"} disabled={isLoadingPrice || !isAuthenticated}>
                                                {coin.symbol}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">
                                    <Clock className="w-4 h-4 text-cyan-400" />
                                    <span className="text-sm font-mono">{isRoundActive ? t('round_end_countdown', { seconds: timeLeft }) : t('checking_results')}</span>
                                </div>
                            </div>
                            <div className="h-80 md:h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartData.length > 0 ? (
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                            <XAxis dataKey="time" stroke="#A0AEC0" tick={{ fontSize: 12 }} />
                                            <YAxis 
                                                domain={yDomain} 
                                                stroke="#A0AEC0" 
                                                tickFormatter={(value) => formatPrice(value)} 
                                                tick={{ fontSize: 12 }} 
                                                allowDataOverflow={true}
                                                tickCount={10}
                                            />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#E2E8F0' }} 
                                                labelStyle={{ fontWeight: 'bold' }} 
                                                formatter={(value) => [formatPrice(value), selectedCoin.symbol]} 
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="price" 
                                                stroke="#0891b2" 
                                                strokeWidth={3}
                                                dot={false} 
                                                isAnimationActive={false} 
                                            />
                                        </LineChart>
                                    ) : (
                                        <div className="flex justify-center items-center h-full text-gray-400">
                                            <p>{isLoadingPrice ? t('loading_price_data') : t('failed_to_load_data_retry')}</p>
                                        </div>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="flex flex-col gap-4">
                     <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-4 flex flex-col items-center gap-3">
                            <div className="text-center">
                                <p className="text-gray-400 text-sm">{selectedCoin.name} {t('game_current_price')}</p>
                                <p className="text-3xl font-bold text-white">{formatPrice(currentPrice)}</p>
                            </div>
                            
                            <BettingPanel
                                cttPoints={formatCttPoints(cttPoints)}
                                mode={selectedMode}
                                onPlaceBet={handlePlaceBet}
                                disabled={!isRoundActive || !!bet || isLoadingPrice || !isAuthenticated || dailyGamesLeft <= 0}
                                prediction={bet?.prediction_type}
                            />

                            <AnimatePresence>
                                {bet && isRoundActive && !roundResult && ( // Added !roundResult condition
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center mt-2 p-3 bg-gray-700/50 rounded-lg w-full">
                                        <p className="font-semibold"><span className={bet.prediction_type === 'UP' ? 'text-green-400' : 'text-red-400'}>{bet.prediction_type}</span> bet: <span className="text-cyan-400">{formatCttPoints(bet.bet_amount)} CTT</span>!</p>
                                        <p className="text-sm text-gray-400">{t('wait_for_round_end')}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <HelpCircle className="w-6 h-6 text-cyan-400 mt-1" />
                                <div>
                                    <h3 className="font-bold text-lg text-white">{t('game_how_to_play')}</h3>
                                    <p className="text-sm text-gray-400 mt-2">{t('game_instructions')}</p>
                                    <p className="text-xs text-cyan-400 mt-2">{t('game_tip')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* New RoundResultDisplay component outside the main grid */}
            <AnimatePresence>
                {roundResult && (
                    <RoundResultDisplay
                        result={roundResult}
                        onNextRound={handleNextRound}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
