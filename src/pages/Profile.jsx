import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWeb3Auth } from '@/components/Web3AuthProvider';
import { Prediction } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, Trophy, Target, TrendingUp, Edit, Save, X, Copy, LogIn, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import LanguageSelector from '@/components/LanguageSelector';
import { useTranslation } from '@/components/i18n';
import CatenaWallet from '@/components/CatenaWallet';
import { ServerAPI, KeepAliveManager, HybridDataManager } from '@/api/serverAPI';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

export default function ProfilePage() {
    const { user, updateUserData } = useWeb3Auth();
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: '' });
    const [ctaBalance, setCTABalance] = useState(0);
    const [backendCttPoints, setBackendCttPoints] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalPredictions: 0,
        correctPredictions: 0,
        winRate: 0,
        bestStreak: 0,
        coinStats: []
    });
    const [privateKeyVisible, setPrivateKeyVisible] = useState(false);
    const { t } = useTranslation();
    
    // 🔧 메모리 누수 방지: useRef로 최신 값 참조
    const userRef = useRef(user);
    const backendCttPointsRef = useRef(backendCttPoints);
    
    // 최신 값으로 ref 업데이트
    useEffect(() => {
        userRef.current = user;
    }, [user]);
    
    useEffect(() => {
        backendCttPointsRef.current = backendCttPoints;
    }, [backendCttPoints]);

    // 🔧 부동소수점 오류 수정: CTT 포인트 깔끔하게 표시하는 함수
    const formatCttPoints = useCallback((points) => {
        if (!points && points !== 0) return '0';
        
        const num = Number(points);
        if (isNaN(num)) return '0';
        
        // 정수면 정수로 표시, 소수면 최대 2자리까지 표시
        if (Number.isInteger(num)) {
            return num.toString();
        } else {
            // 소수점 2자리까지 표시하고 불필요한 0 제거
            return parseFloat(num.toFixed(2)).toString();
        }
    }, []);

    // 🔧 최적화: 단일 사용자 조회로 변경
    const fetchBackendCttPoints = useCallback(async () => {
        if (!userRef.current?.email) return;
        
        setIsRefreshing(true);
        try {
            console.log('[Profile] 백엔드에서 최신 CTT 포인트 조회:', userRef.current.email);
            
            // 🔧 개선: 전체 사용자 목록 대신 단일 사용자 조회 (백엔드 API가 있다면)
            // 현재는 전체 목록에서 찾는 방식 유지하되, 캐싱 추가
            const allUsers = await ServerAPI.getAllUsers();
            if (allUsers) {
                const backendUser = allUsers.find(u => u.email === userRef.current.email);
                if (backendUser) {
                    console.log('[Profile] 백엔드에서 조회된 CTT 포인트:', backendUser.ctt_points);
                    setBackendCttPoints(backendUser.ctt_points || 0);
                } else {
                    console.warn('[Profile] 백엔드에서 사용자를 찾을 수 없음:', userRef.current.email);
                    setBackendCttPoints(userRef.current.ctt_points || 0);
                }
            } else {
                console.warn('[Profile] 백엔드 연결 실패, 로컬 데이터 사용');
                setBackendCttPoints(userRef.current.ctt_points || 0);
            }
        } catch (error) {
            console.error('[Profile] 백엔드 CTT 포인트 조회 실패:', error);
            setBackendCttPoints(userRef.current.ctt_points || 0);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    // 🔧 메모리 누수 방지: useCallback으로 이벤트 핸들러 최적화
    const handleCttPointsUpdate = useCallback((event) => {
        console.log('[Profile] 🔔 CTT 포인트 업데이트 이벤트 수신:', event.detail);
        
        // 현재 사용자와 업데이트된 사용자가 같은지 확인
        if (userRef.current && userRef.current.email === event.detail.userEmail) {
            console.log('[Profile] ✅ 현재 사용자의 CTT 포인트 업데이트!');
            
            // 🔥 중요: 상태만 업데이트 (updateUserData 호출하지 않음)
            setBackendCttPoints(event.detail.newCttPoints);
            
            // 📝 localStorage 업데이트 (선택적 - 직접 업데이트)
            try {
                const rawUsers = localStorage.getItem('catena_users');
                if (rawUsers) {
                    const users = JSON.parse(rawUsers);
                    const userIndex = users.findIndex(u => u.email === userRef.current.email);
                    if (userIndex !== -1) {
                        users[userIndex].ctt_points = event.detail.newCttPoints;
                        users[userIndex].updated_at = new Date().toISOString();
                        localStorage.setItem('catena_users', JSON.stringify(users));
                        console.log('[Profile] ✅ localStorage CTT 포인트 업데이트 성공');
                    }
                }
            } catch (localError) {
                console.warn('[Profile] ⚠️ localStorage 업데이트 실패:', localError);
            }
            
            console.log('[Profile] 🎉 CTT 포인트 실시간 업데이트 완료:', {
                previousCtt: backendCttPointsRef.current,
                newCtt: event.detail.newCttPoints,
                addedAmount: event.detail.addedAmount
            });
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                setIsLoading(true);
                return;
            };

            setIsLoading(true);
            try {
                setEditForm({ full_name: user.full_name });
                setCTABalance(user.cta_balance || 0); 
                
                // 백엔드에서 최신 CTT 포인트 가져오기
                await fetchBackendCttPoints();

                const predictions = await Prediction.filter({ user_id: user.id }, '-created_date');

                const totalPredictions = predictions.length;
                const correctPredictions = predictions.filter(p => p.is_correct).length;
                const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions * 100) : 0;
                
                // 연승 계산
                let currentStreak = 0;
                let bestStreak = 0;
                predictions.slice().reverse().forEach(p => {
                    if (p.is_correct) {
                        currentStreak++;
                    } else {
                        bestStreak = Math.max(bestStreak, currentStreak);
                        currentStreak = 0;
                    }
                });
                bestStreak = Math.max(bestStreak, currentStreak);

                // 코인별 통계 (시뮬레이션)
                const coinStats = [
                    { name: 'BTC', predictions: Math.floor(totalPredictions * 0.4), correct: Math.floor(correctPredictions * 0.4) },
                    { name: 'ETH', predictions: Math.floor(totalPredictions * 0.3), correct: Math.floor(correctPredictions * 0.3) },
                    { name: 'BNB', predictions: Math.floor(totalPredictions * 0.2), correct: Math.floor(correctPredictions * 0.2) },
                    { name: 'SOL', predictions: Math.floor(totalPredictions * 0.1), correct: Math.floor(correctPredictions * 0.1) }
                ];

                setStats({
                    totalPredictions,
                    correctPredictions,
                    winRate: winRate.toFixed(1),
                    bestStreak,
                    coinStats
                });

            } catch (error) {
                console.error('Failed to fetch profile data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        // 🚀 실시간 CTT 포인트 업데이트 이벤트 리스너 추가
        window.addEventListener('cttPointsUpdated', handleCttPointsUpdate);
        
        fetchData();
        
        // 정리 함수 - 컴포넌트 언마운트 시 이벤트 리스너 제거
        return () => {
            window.removeEventListener('cttPointsUpdated', handleCttPointsUpdate);
        };
    }, [user, fetchBackendCttPoints, handleCttPointsUpdate]);

    const handleSave = () => {
        try {
            updateUserData(editForm);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    };

    const handleCancel = () => {
        if(user) setEditForm({ full_name: user.full_name });
        setIsEditing(false);
    };

    const copyToClipboard = (text, type) => {
        if (!text) {
            console.warn(`Cannot copy ${type}: text is null or undefined.`);
            return;
        }
        navigator.clipboard.writeText(text);
        alert(`${type} copied to clipboard!`);
    };
    
    const handleLanguageChange = (newLanguage) => {
        try {
            updateUserData({ language: newLanguage });
        } catch (error) {
            console.error('Failed to update language preference:', error);
        }
    }

    // 🔧 최적화: 강력한 서버 깨우기 + 데이터 동기화 함수
    const handleForceWakeupAndSync = useCallback(async () => {
        setIsRefreshing(true);
        
        try {
            console.log('🚀 [Profile] 강력한 서버 깨우기 + 데이터 동기화 시작...');
            
            // 1. 백엔드 서버 강제 깨우기 (최대 3회 시도)
            console.log('😴 [Profile] 백엔드 서버 깨우기 시도...');
            const wakeUpSuccess = await KeepAliveManager.wakeUpServer();
            
            if (wakeUpSuccess) {
                console.log('✅ [Profile] 서버 깨우기 성공! 데이터 동기화 시작...');
                
                // 2. 사용자 데이터 동기화
                await syncUserDataFromBackend();
                
                alert('🎉 서버 연결 및 데이터 동기화 완료!');
            } else {
                console.log('❌ [Profile] 서버 깨우기 실패');
                alert('⚠️ 서버 연결에 실패했습니다. 로컬 데이터를 사용합니다.');
                
                // 로컬 데이터로 대체
                setBackendCttPoints(userRef.current?.ctt_points || 0);
            }
            
        } catch (error) {
            console.error('💥 [Profile] 강제 동기화 오류:', error);
            alert('❌ 동기화 중 오류가 발생했습니다.');
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    // 🔧 최적화: 백엔드에서 사용자 데이터 완전 동기화 (스코어 보존)
    const syncUserDataFromBackend = useCallback(async () => {
        if (!userRef.current?.email) return;
        
        try {
            console.log('📊 [Profile] 백엔드 데이터 동기화 시작 (스코어 보존 모드):', userRef.current.email);
            
            // 1. 백엔드에서 최신 사용자 데이터 가져오기
            const allUsers = await ServerAPI.getAllUsers();
            if (!allUsers) {
                throw new Error('백엔드에서 사용자 데이터를 가져올 수 없습니다.');
            }
            
            const backendUser = allUsers.find(u => u.email === userRef.current.email);
            if (!backendUser) {
                console.warn('[Profile] 백엔드에 사용자가 없음 - 로컬 데이터로 새로 등록');
                
                // 🔧 수정: 로컬 데이터를 백엔드에 등록 (스코어 보존)
                const registeredUser = await ServerAPI.registerUser({
                    id: userRef.current.id,
                    full_name: userRef.current.full_name,
                    email: userRef.current.email,
                    walletAddress: userRef.current.walletAddress || '',
                    score: userRef.current.score || 0,
                    ctt_points: userRef.current.ctt_points || 0,
                    is_admin: userRef.current.is_admin || false
                });
                
                if (registeredUser) {
                    console.log('✅ [Profile] 로컬 데이터로 백엔드 등록 성공');
                    setBackendCttPoints(registeredUser.ctt_points || 0);
                } else {
                    throw new Error('사용자 등록 실패');
                }
            } else {
                console.log('✅ [Profile] 백엔드 데이터 발견:', {
                    backend_score: backendUser.score,
                    backend_ctt: backendUser.ctt_points,
                    local_score: userRef.current.score,
                    local_ctt: userRef.current.ctt_points
                });
                
                // 🔧 수정: 로컬과 백엔드 데이터 중 더 큰 값을 사용
                const finalScore = Math.max(Number(backendUser.score) || 0, Number(userRef.current.score) || 0);
                const finalCttPoints = Math.max(Number(backendUser.ctt_points) || 0, Number(userRef.current.ctt_points) || 0);
                
                console.log('🔄 [Profile] 최종 데이터 결정:', {
                    final_score: finalScore,
                    final_ctt: finalCttPoints,
                    score_source: finalScore === (userRef.current.score || 0) ? 'local' : 'backend',
                    ctt_source: finalCttPoints === (userRef.current.ctt_points || 0) ? 'local' : 'backend'
                });
                
                // 2. 백엔드 데이터가 로컬보다 작으면 백엔드를 업데이트
                if (finalScore > (backendUser.score || 0) || finalCttPoints > (backendUser.ctt_points || 0)) {
                    console.log('📤 [Profile] 로컬 데이터가 더 최신 - 백엔드 업데이트');
                    
                    await ServerAPI.updateScore(
                        userRef.current.email,
                        finalScore,
                        finalCttPoints,
                        userRef.current.full_name
                    );
                    
                    console.log('✅ [Profile] 백엔드 업데이트 완료');
                }
                
                // 3. React 상태 업데이트 (최종 값으로)
                const updatedUserData = {
                    score: finalScore,
                    ctt_points: finalCttPoints,
                    synced_with_backend: true,
                    last_sync: new Date().toISOString()
                };
                
                await updateUserData(updatedUserData);
                setBackendCttPoints(finalCttPoints);
                
                // 4. localStorage도 최종 값으로 업데이트
                const rawUsers = localStorage.getItem('catena_users');
                if (rawUsers) {
                    const localUsers = JSON.parse(rawUsers);
                    const userIndex = localUsers.findIndex(u => u.email === userRef.current.email);
                    
                    if (userIndex !== -1) {
                        localUsers[userIndex] = {
                            ...localUsers[userIndex],
                            score: finalScore,
                            ctt_points: finalCttPoints,
                            updated_at: new Date().toISOString(),
                            synced_with_backend: true
                        };
                        
                        localStorage.setItem('catena_users', JSON.stringify(localUsers));
                        console.log('✅ [Profile] localStorage 최종 동기화 완료');
                    }
                }
                
                // 5. 통계 데이터 다시 계산
                await recalculateStats();
                
                console.log('🎉 [Profile] 완전 동기화 성공 - 스코어 보존됨:', {
                    email: userRef.current.email,
                    final_score: finalScore,
                    final_ctt: finalCttPoints
                });
            }
            
        } catch (error) {
            console.error('💥 [Profile] 백엔드 동기화 실패:', error);
            throw error;
        }
    }, [updateUserData]);

    // 🔧 최적화: 통계 데이터 재계산
    const recalculateStats = useCallback(async () => {
        try {
            const predictions = await Prediction.filter({ user_id: userRef.current.id }, '-created_date');
            const totalPredictions = predictions.length;
            const correctPredictions = predictions.filter(p => p.is_correct).length;
            const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions * 100) : 0;
            
            // 연승 계산
            let currentStreak = 0;
            let bestStreak = 0;
            predictions.slice().reverse().forEach(p => {
                if (p.is_correct) {
                    currentStreak++;
                } else {
                    bestStreak = Math.max(bestStreak, currentStreak);
                    currentStreak = 0;
                }
            });
            bestStreak = Math.max(bestStreak, currentStreak);
            
            setStats(prevStats => ({
                ...prevStats,
                totalPredictions,
                correctPredictions,
                winRate: winRate.toFixed(1),
                bestStreak
            }));
            
            console.log('📈 [Profile] 통계 재계산 완료:', {
                totalPredictions,
                correctPredictions,
                winRate: winRate.toFixed(1),
                bestStreak
            });
            
        } catch (error) {
            console.error('💥 [Profile] 통계 재계산 실패:', error);
        }
    }, []);

    // 수동 새로고침 핸들러 (기존)
    const handleRefreshCttPoints = useCallback(async () => {
        await fetchBackendCttPoints();
    }, [fetchBackendCttPoints]);

    // 🔧 무한 루프 방지: useRef로 최신 값 참조하여 무한 루프 방지
    const handleBalanceUpdate = useCallback((newBalance) => {
        setCTABalance(newBalance);
        
        // 중요: 무한 루프를 방지하기 위해, 잔액 값이 실제로 변경되었을 때만
        // 전역 user 컨텍스트를 업데이트합니다.
        if (user && user.cta_balance !== newBalance) {
            console.log(`[Profile.jsx] Global CTA balance updating from ${user.cta_balance} to ${newBalance}.`);
            updateUserData({ cta_balance: newBalance });
        }
    }, [user, updateUserData]);

    const predictionData = [
        { name: t('correct_answer'), value: stats.correctPredictions, color: '#10B981' },
        { name: t('wrong_answer'), value: stats.totalPredictions - stats.correctPredictions, color: '#EF4444' }
    ];
    
    const getProviderIcon = (provider) => {
        if (provider === 'google') return 'G';
        if (provider === 'kakao') return 'K';
        return 'U';
    }

    const getProviderText = (provider) => {
        if (provider === 'google') return t('google_account');
        if (provider === 'kakao') return t('kakao_account');
        return t('email_account');
    }

    if (isLoading) {
        return <div className="p-8"><Skeleton className="w-full h-96" /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
                 <Card className="bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                             <div className="relative w-24 h-24">
                                <img 
                                    src={user?.social_profile?.profile_image || `https://avatar.vercel.sh/${user?.email}.png`}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full object-cover bg-gradient-to-br from-cyan-400 to-blue-600"
                                    onError={(e) => { e.target.onerror = null; e.target.src=`https://avatar.vercel.sh/${user?.email}.png` }}
                                />
                                <span className={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg ${user?.provider === 'google' ? 'bg-red-500' : user?.provider === 'kakao' ? 'bg-yellow-500' : 'bg-gray-500'}`}>
                                    {getProviderIcon(user?.provider)}
                                </span>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="name">{t('profile_name')}</Label>
                                            <Input id="name" value={editForm.full_name} onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} className="mt-1 bg-gray-700 border-gray-600" />
                                        </div>
                                        <div className="flex gap-2 justify-center md:justify-start">
                                            <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700"><Save className="w-4 h-4 mr-1" /> {t('save')}</Button>
                                            <Button onClick={handleCancel} variant="outline" size="sm"><X className="w-4 h-4 mr-1" /> {t('cancel')}</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-3xl font-bold text-white mb-1">{user?.full_name}</h1>
                                        <p className="text-gray-400 mb-2">{user?.email}</p>
                                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 justify-center md:justify-start">
                                            <LogIn className="w-4 h-4" />
                                            <span>
                                                {getProviderText(user?.provider)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-4 items-center justify-center md:justify-start">
                                            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm"><Edit className="w-4 h-4 mr-1" /> {t('edit_profile')}</Button>
                                            <LanguageSelector onLanguageChange={handleLanguageChange} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                            <p className="text-2xl font-bold text-white">{user?.score || 0}</p>
                            <p className="text-sm text-gray-400">{t('total_score_profile')}</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-4 text-center">
                            <Target className="w-8 h-8 mx-auto mb-2 text-green-400" />
                            <p className="text-2xl font-bold text-white">{stats.winRate}%</p>
                            <p className="text-sm text-gray-400">{t('win_rate_profile')}</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-4 text-center">
                            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                            <p className="text-2xl font-bold text-white">{stats.bestStreak}</p>
                            <p className="text-sm text-gray-400">{t('best_streak_profile')}</p>
                        </CardContent>
                    </Card>

                    {/* 백엔드 CTT Points 표시 (개선된 버전) */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Wallet className="w-8 h-8 text-cyan-400" />
                                <Button
                                    onClick={handleRefreshCttPoints}
                                    disabled={isRefreshing}
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 h-auto text-cyan-400 hover:text-cyan-300"
                                    title="약한 새로고침"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                    onClick={handleForceWakeupAndSync}
                                    disabled={isRefreshing}
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 h-auto text-yellow-400 hover:text-yellow-300"
                                    title="강력한 서버 깨우기 + 데이터 동기화"
                                >
                                    🚀
                                </Button>
                            </div>
                            <p className="text-2xl font-bold text-white">{formatCttPoints(backendCttPoints)}</p>
                            <p className="text-sm text-gray-400">{t('ctt_points')}</p>
                            {backendCttPoints !== (user?.ctt_points || 0) && (
                                <p className="text-xs text-yellow-400 mt-1">
                                    🔄 서버 동기화됨
                                </p>
                            )}
                        </CardContent>
                    </Card>

                </div>

                {/* Replaced existing wallet card with CatenaWallet component */}
                <CatenaWallet user={user} ctaBalance={ctaBalance} onBalanceUpdate={handleBalanceUpdate} />
                
                <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                            <Wallet className="w-6 h-6" />
                            {t('my_auto_wallet_title')}
                        </CardTitle>
                        <p className="text-sm text-gray-400">
                            {t('auto_wallet_description')}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-gray-400">{t('wallet_address_public')}</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Input 
                                    readOnly 
                                    value={user?.wallet_address || ''} 
                                    className="bg-gray-700 border-gray-600 font-mono"
                                />
                                <Button onClick={() => copyToClipboard(user?.wallet_address, t('wallet_address'))} variant="outline" size="icon">
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div>
                            <Label className="text-gray-400">{t('private_key_private')}</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Input 
                                    readOnly 
                                    type={privateKeyVisible ? 'text' : 'password'}
                                    value={user?.private_key || ''} 
                                    className="bg-gray-700 border-gray-600 font-mono"
                                />
                                <Button onClick={() => setPrivateKeyVisible(!privateKeyVisible)} variant="outline" size="icon">
                                    {privateKeyVisible ? '🙈' : '👁️'}
                                </Button>
                                <Button onClick={() => copyToClipboard(user?.private_key, t('private_key'))} variant="outline" size="icon">
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <Alert variant="destructive" className="bg-red-900/50 border-red-500/30 text-red-300">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>{t('private_key_warning_title')}</AlertTitle>
                          <AlertDescription className="text-red-400">
                            {t('private_key_warning_description').split('\\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    {i < t('private_key_warning_description').split('\\n').length - 1 && <br/>}
                                </React.Fragment>
                            ))}
                          </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader><CardTitle className="text-lg font-bold text-cyan-400">{t('prediction_performance')}</CardTitle></CardHeader>
                        <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={predictionData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">{predictionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></CardContent>
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader><CardTitle className="text-lg font-bold text-cyan-400">{t('coin_performance')}</CardTitle></CardHeader>
                        <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.coinStats}><XAxis dataKey="name" stroke="#A0AEC0" /><YAxis stroke="#A0AEC0" /><Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: '#E2E8F0' }} /><Bar dataKey="correct" fill="#10B981" /><Bar dataKey="predictions" fill="#374151" /></BarChart></ResponsiveContainer></div></CardContent>
                    </Card>
                </div>
            </motion.div>
        </div>
    );
}
