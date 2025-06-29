import React, { useState, useEffect, useCallback } from 'react';
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
import { ServerAPI } from '@/api/serverAPI';
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
    const [ctaBalance, setCTABalance] = useState(0); // This state is primarily updated by CatenaWallet and passed back up.
    const [backendCttPoints, setBackendCttPoints] = useState(0); // 백엔드에서 가져온 실제 CTT 포인트
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

    // 🔧 부동소수점 오류 수정: CTT 포인트 깔끔하게 표시하는 함수
    const formatCttPoints = (points) => {
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
    };

    // 백엔드에서 최신 CTT 포인트 가져오기 (개선된 버전)
    const fetchBackendCttPoints = async () => {
        if (!user?.email) {
            console.warn('[Profile] 사용자 이메일이 없어 백엔드 조회 불가');
            setBackendCttPoints(user?.ctt_points || 0);
            return;
        }
        
        setIsRefreshing(true);
        
        try {
            console.log('[Profile] 🔄 백엔드에서 최신 CTT 포인트 조회 시작:', user.email);
            
            // 1. 먼저 서버 연결 상태 확인
            const isServerConnected = await ServerAPI.checkHealth();
            
            if (!isServerConnected) {
                console.warn('[Profile] ⚠️ 백엔드 서버 연결 실패 - 로컬 데이터 사용');
                setBackendCttPoints(user.ctt_points || 0);
                return;
            }
            
            console.log('[Profile] ✅ 백엔드 서버 연결 확인됨');
            
            // 2. 전체 사용자 목록에서 현재 사용자 찾기
            const allUsers = await ServerAPI.getAllUsers();
            
            if (allUsers && Array.isArray(allUsers)) {
                const backendUser = allUsers.find(u => 
                    u.email === user.email || 
                    u.email?.toLowerCase() === user.email?.toLowerCase()
                );
                
                if (backendUser) {
                    console.log('[Profile] ✅ 백엔드에서 사용자 찾음:', {
                        name: backendUser.full_name,
                        email: backendUser.email,
                        ctt_points: backendUser.ctt_points,
                        score: backendUser.score
                    });
                    
                    // 백엔드 CTT 포인트 설정
                    const backendCtt = Number(backendUser.ctt_points) || 0;
                    setBackendCttPoints(backendCtt);
                    
                    // 💡 로컬 데이터와 백엔드 데이터 비교
                    const localCtt = Number(user.ctt_points) || 0;
                    if (Math.abs(backendCtt - localCtt) > 0.01) {
                        console.log('[Profile] 📊 CTT 포인트 차이 발견:', {
                            local: localCtt,
                            backend: backendCtt,
                            difference: backendCtt - localCtt
                        });
                        
                        // 🔄 백엔드 데이터가 더 최신인 경우 로컬 업데이트
                        if (backendUser.updated_at && user.updated_at) {
                            const backendTime = new Date(backendUser.updated_at).getTime();
                            const localTime = new Date(user.updated_at).getTime();
                            
                            if (backendTime > localTime) {
                                console.log('[Profile] 🔄 백엔드 데이터가 더 최신 - 동기화 고려');
                                // 주의: updateUserData 호출 시 무한 루프 방지를 위해 조건부 실행
                                // updateUserData({ ctt_points: backendCtt });
                            }
                        }
                    } else {
                        console.log('[Profile] ✅ 로컬-백엔드 CTT 포인트 일치:', backendCtt);
                    }
                } else {
                    console.warn('[Profile] ⚠️ 백엔드에서 사용자를 찾을 수 없음:', {
                        searchEmail: user.email,
                        totalBackendUsers: allUsers.length,
                        backendEmails: allUsers.map(u => u.email).slice(0, 5)
                    });
                    
                    // 백엔드에 사용자가 없는 경우 등록 시도
                    console.log('[Profile] 🔄 백엔드에 사용자 등록 시도...');
                    const registrationResult = await ServerAPI.registerUser({
                        id: user.id,
                        full_name: user.full_name,
                        email: user.email,
                        walletAddress: user.wallet_address || '',
                        score: user.score || 0,
                        ctt_points: user.ctt_points || 0,
                        is_admin: user.is_admin || false
                    });
                    
                    if (registrationResult) {
                        console.log('[Profile] ✅ 백엔드 사용자 등록 성공');
                        setBackendCttPoints(registrationResult.ctt_points || user.ctt_points || 0);
                    } else {
                        console.warn('[Profile] ❌ 백엔드 사용자 등록 실패');
                        setBackendCttPoints(user.ctt_points || 0);
                    }
                }
            } else {
                console.warn('[Profile] ⚠️ 백엔드에서 사용자 목록 조회 실패:', {
                    response: allUsers,
                    type: typeof allUsers
                });
                setBackendCttPoints(user.ctt_points || 0);
            }
            
        } catch (error) {
            console.error('[Profile] 💥 백엔드 CTT 포인트 조회 오류:', {
                error: error.message,
                stack: error.stack,
                userEmail: user.email
            });
            
            // 오류 발생 시 로컬 데이터 사용
            setBackendCttPoints(user.ctt_points || 0);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                console.log('[Profile] 🚫 사용자 데이터 없음 - fetchData 종료');
                setIsLoading(true);
                return;
            };

            console.log('[Profile] 🚀 fetchData 시작 - 사용자:', {
                name: user.full_name,
                email: user.email,
                local_ctt_points: user.ctt_points,
                local_score: user.score
            });

            setIsLoading(true);
            try {
                setEditForm({ full_name: user.full_name });
                setCTABalance(user.cta_balance || 0); 
                
                console.log('[Profile] 🔄 백엔드 CTT 포인트 조회 시작...');
                // 백엔드에서 최신 CTT 포인트 가져오기
                await fetchBackendCttPoints();

                console.log('[Profile] 📈 예측 통계 조회 시작...');
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

                const finalStats = {
                    totalPredictions,
                    correctPredictions,
                    winRate: winRate.toFixed(1),
                    bestStreak,
                    coinStats
                };

                setStats(finalStats);

                console.log('[Profile] ✅ fetchData 완료:', {
                    user: user.full_name,
                    stats: finalStats,
                    backend_ctt_points: backendCttPoints
                });

            } catch (error) {
                console.error('[Profile] 💥 fetchData 오류:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        // 🚀 실시간 CTT 포인트 업데이트 이벤트 리스너 추가
        const handleCttPointsUpdate = (event) => {
            console.log('[Profile] 🔔 CTT 포인트 업데이트 이벤트 수신:', event.detail);
            
            // 현재 사용자와 업데이트된 사용자가 같은지 확인
            if (user && user.email === event.detail.userEmail) {
                console.log('[Profile] ✅ 현재 사용자의 CTT 포인트 업데이트!');
                
                // 🔥 중요: 상태만 업데이트 (updateUserData 호출하지 않음)
                setBackendCttPoints(event.detail.newCttPoints);
                
                // 📝 localStorage 업데이트 (선택적 - 직접 업데이트)
                try {
                    const rawUsers = localStorage.getItem('catena_users');
                    if (rawUsers) {
                        const users = JSON.parse(rawUsers);
                        const userIndex = users.findIndex(u => u.email === user.email);
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
                
                // 성공 알림 (선택적)
                // alert(`🎉 CTT 포인트가 업데이트되었습니다!\n새로운 포인트: ${event.detail.newCttPoints} CTT`);
                
                console.log('[Profile] 🎉 CTT 포인트 실시간 업데이트 완료:', {
                    previousCtt: backendCttPoints,
                    newCtt: event.detail.newCttPoints,
                    addedAmount: event.detail.addedAmount
                });
            }
        };
        
        // 이벤트 리스너 등록
        window.addEventListener('cttPointsUpdated', handleCttPointsUpdate);
        
        fetchData();
        
        // 정리 함수 - 컴포넌트 언마운트 시 이벤트 리스너 제거
        return () => {
            window.removeEventListener('cttPointsUpdated', handleCttPointsUpdate);
        };
    }, [user]); // updateUserData dependency 제거 - 세션 안정성을 위해

    const handleSave = () => {
        try {
            updateUserData(editForm); // Update user data in global context
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
            updateUserData({ language: newLanguage }); // Update user data in global context
        } catch (error) {
            console.error('Failed to update language preference:', error);
        }
    }

    // 수동 새로고침 핸들러
    const handleRefreshCttPoints = async () => {
        console.log('[Profile] 🔄 수동 CTT 포인트 새로고침 시작');
        await fetchBackendCttPoints();
    };

    // 🔍 백엔드 연결 테스트 함수 (새로 추가)
    const testBackendConnection = async () => {
        console.log('[Profile] 🔍 백엔드 연결 테스트 시작');
        setIsRefreshing(true);
        
        try {
            // 1. 헬스 체크
            console.log('[Profile] 1지: 헬스 체크...');
            const healthCheck = await ServerAPI.checkHealth();
            console.log('[Profile] 헬스 체크 결과:', healthCheck);
            
            if (!healthCheck) {
                alert('❌ 백엔드 서버 연결 실패!\n\nhttp://localhost:3001에 연결할 수 없습니다.\n백엔드 서버가 실행되고 있는지 확인해주세요.');
                return;
            }
            
            // 2. 전체 사용자 목록 조회
            console.log('[Profile] 2지: 사용자 목록 조회...');
            const allUsers = await ServerAPI.getAllUsers();
            console.log('[Profile] 사용자 목록 결과:', allUsers);
            
            if (!allUsers) {
                alert('⚠️ 사용자 목록 조회 실패!\n\n백엔드 API에 문제가 있습니다.');
                return;
            }
            
            // 3. 현재 사용자 찾기
            console.log('[Profile] 3지: 현재 사용자 찾기...');
            const currentUser = allUsers.find(u => 
                u.email === user.email || 
                u.email?.toLowerCase() === user.email?.toLowerCase()
            );
            
            console.log('[Profile] 현재 사용자 검색 결과:', currentUser);
            
            // 4. 결과 보고
            if (currentUser) {
                alert(`✅ 백엔드 연결 성공!\n\n현재 사용자: ${currentUser.full_name}\n이메일: ${currentUser.email}\nCTT 포인트: ${currentUser.ctt_points || 0}\n점수: ${currentUser.score || 0}\n\n전체 사용자 수: ${allUsers.length}명`);
                
                // 백엔드 데이터로 CTT 포인트 업데이트
                setBackendCttPoints(currentUser.ctt_points || 0);
            } else {
                alert(`⚠️ 사용자를 찾을 수 없음!\n\n찾는 이메일: ${user.email}\n백엔드 사용자 수: ${allUsers.length}명\n\n백엔드에 사용자가 등록되지 않았을 수 있습니다.`);
                
                // 사용자 등록 시도
                console.log('[Profile] 4지: 사용자 등록 시도...');
                const registered = await ServerAPI.registerUser({
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    walletAddress: user.wallet_address || '',
                    score: user.score || 0,
                    ctt_points: user.ctt_points || 0,
                    is_admin: user.is_admin || false
                });
                
                if (registered) {
                    alert('✅ 사용자 등록 성공!\n\n이제 백엔드에 데이터가 동기화되었습니다.');
                    setBackendCttPoints(registered.ctt_points || 0);
                } else {
                    alert('❌ 사용자 등록 실패!');
                }
            }
            
        } catch (error) {
            console.error('[Profile] 💥 백엔드 연결 테스트 오류:', error);
            alert(`❌ 백엔드 연결 테스트 실패!\n\n오류: ${error.message}\n\n자세한 내용은 개발자 도구 콘솔을 확인해주세요.`);
        } finally {
            setIsRefreshing(false);
        }
    };

    // `useCallback`을 사용하여 `handleBalanceUpdate` 함수가 재생성되는 것을 방지합니다.
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
                                <div className="flex gap-1">
                                    <Button
                                        onClick={handleRefreshCttPoints}
                                        disabled={isRefreshing}
                                        variant="ghost"
                                        size="sm"
                                        className="p-1 h-auto text-cyan-400 hover:text-cyan-300"
                                        title="CTT 포인트 새로고침"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button
                                        onClick={testBackendConnection}
                                        disabled={isRefreshing}
                                        variant="ghost"
                                        size="sm"
                                        className="p-1 h-auto text-orange-400 hover:text-orange-300"
                                        title="백엔드 연결 테스트"
                                    >
                                        🔍
                                    </Button>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-white">{formatCttPoints(backendCttPoints)}</p>
                            <p className="text-sm text-gray-400">{t('ctt_points')}</p>
                            {backendCttPoints !== (user?.ctt_points || 0) && (
                                <p className="text-xs text-yellow-400 mt-1">
                                    🔄 서버 동기화됨
                                </p>
                            )}
                            {isRefreshing && (
                                <p className="text-xs text-blue-400 mt-1">
                                    🔄 데이터 조회 중...
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
