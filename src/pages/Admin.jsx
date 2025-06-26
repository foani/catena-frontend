import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Settings, 
    Users, 
    Coins, 
    Send, 
    Download,
    UserCheck,
    AlertTriangle,
    CheckCircle,
    XCircle,
    TrendingUp,
    Activity,
    Trash2  // 🗑️ 삭제 아이콘 추가
} from 'lucide-react';
import { useWeb3Auth } from '@/components/Web3AuthProvider';
import { User, Bet, GameRound, Prediction } from '@/api/entities';
import { ServerAPI } from '@/api/serverAPI'; // 🚀 백엔드 API 추가
import { useTranslation } from '@/components/i18n';

export default function AdminPage() {
    const { user: authUser, isAuthenticated } = useWeb3Auth();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [allUsers, setAllUsers] = useState([]);
    const [systemStats, setSystemStats] = useState({
        totalUsers: 0,
        totalBets: 0,
        totalPredictions: 0,
        totalCttPoints: 0,
        activeRounds: 0
    });
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [multiSendAmount, setMultiSendAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [alerts, setAlerts] = useState([]);

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

    // 관리자 권한 확인
    const isAdmin = authUser?.is_admin || authUser?.email === 'admin@catena.com' || authUser?.full_name?.toLowerCase().includes('admin');

    useEffect(() => {
        if (!isAuthenticated || !isAdmin) return;
        
        loadSystemData();
    }, [isAuthenticated, isAdmin]);

    const loadSystemData = async () => {
        try {
            console.log('🔄 [Admin] Loading system data from backend...');
            
            // 백엔드에서 사용자 데이터 가져오기
            const backendUsers = await ServerAPI.getAllUsers();
            
            let users;
            if (backendUsers && backendUsers.length > 0) {
                console.log('✅ [Admin] Backend users loaded:', backendUsers.length);
                users = backendUsers;
            } else {
                console.log('⚠️ [Admin] Backend failed, using localStorage');
                users = User.filter();
            }
            
            const bets = Bet.filter();
            const predictions = Prediction.filter();
            const rounds = GameRound.filter();
            
            setAllUsers(users);
            
            const stats = {
                totalUsers: users.length,
                totalBets: bets.length,
                totalPredictions: predictions.length,
                totalCttPoints: users.reduce((sum, user) => sum + (user.ctt_points || 0), 0),
                activeRounds: rounds.filter(r => r.is_active).length
            };
            
            setSystemStats(stats);
            
            console.log('[Admin] System data loaded:', stats);
        } catch (error) {
            console.error('[Admin] Failed to load system data:', error);
            addAlert('error', 'Failed to load system data');
        }
    };

    const addAlert = (type, message) => {
        const alert = {
            id: Date.now(),
            type,
            message,
            timestamp: new Date().toLocaleTimeString()
        };
        setAlerts(prev => [alert, ...prev.slice(0, 4)]);
        
        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== alert.id));
        }, 5000);
    };

    const handleUserSelection = (userId, checked) => {
        if (checked) {
            setSelectedUsers(prev => [...prev, userId]);
        } else {
            setSelectedUsers(prev => prev.filter(id => id !== userId));
        }
    };

    const handleSelectAllUsers = () => {
        if (selectedUsers.length === allUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(allUsers.map(user => user.id));
        }
    };

    const handlePointsAdjustment = async (userId, adjustment) => {
        try {
            console.log(`[Admin] CTT 포인트 조정 시작: userId=${userId}, adjustment=${adjustment}`);
            
            // 1. 백엔드에서 사용자 찾기 (localStorage 대신)
            const backendUsers = await ServerAPI.getAllUsers();
            const user = backendUsers ? backendUsers.find(u => u.id === userId) : null;
            
            if (!user) {
                console.error(`[Admin] 사용자를 찾을 수 없음: userId=${userId}`);
                addAlert('error', 'User not found in backend');
                return;
            }
            
            console.log(`[Admin] 사용자 찾음:`, user);

            const newPoints = Math.max(0, (user.ctt_points || 0) + adjustment);
            
            console.log(`[Admin] CTT 포인트 업데이트: ${user.ctt_points || 0} → ${newPoints}`);
            
            // 2. 백엔드 데이터베이스 업데이트
            const backendUpdateResult = await ServerAPI.updateScore(
                user.email,
                user.score || 0,
                newPoints,
                user.full_name
            );
            
            if (backendUpdateResult) {
                console.log(`[Admin] ✅ 백엔드 업데이트 성공:`, backendUpdateResult);
                
                // 3. localStorage도 업데이트 (기존 방식 유지)
                try {
                    User.update(userId, { ctt_points: newPoints });
                    console.log(`[Admin] ✅ localStorage 업데이트 성공`);
                } catch (localError) {
                    console.warn(`[Admin] ⚠️ localStorage 업데이트 실패:`, localError);
                }
                
                // 4. 🔥 실시간 이벤트 발생 (Profile 페이지 즉시 반영)
                try {
                    const cttUpdateEvent = new CustomEvent('cttPointsUpdated', {
                        detail: {
                            userEmail: user.email,
                            newCttPoints: newPoints,
                            addedAmount: adjustment
                        }
                    });
                    window.dispatchEvent(cttUpdateEvent);
                    
                    console.log(`[Admin] 📡 실시간 이벤트 발생:`, {
                        userEmail: user.email,
                        newCttPoints: newPoints,
                        addedAmount: adjustment
                    });
                } catch (eventError) {
                    console.error(`[Admin] ❌ 이벤트 발생 실패:`, eventError);
                }
                
                // 5. 시스템 데이터 새로고침
                loadSystemData();
                
                addAlert('success', `Points adjusted for ${user.full_name}: ${adjustment > 0 ? '+' : ''}${adjustment} CTT → ${newPoints} CTT`);
                
            } else {
                console.error(`[Admin] ❌ 백엔드 업데이트 실패`);
                addAlert('error', 'Backend update failed');
            }
            
        } catch (error) {
            console.error('[Admin] Points adjustment failed:', error);
            addAlert('error', `Points adjustment failed: ${error.message}`);
        }
    };

    const handleMultiSend = async () => {
        if (selectedUsers.length === 0 || !multiSendAmount || isProcessing) return;
        
        setIsProcessing(true);
        try {
            const amount = parseInt(multiSendAmount);
            if (isNaN(amount) || amount <= 0) {
                addAlert('error', 'Invalid amount');
                return;
            }

            console.log(`[Admin] Multi-send 시작: ${selectedUsers.length}명에게 ${amount} CTT 지급`);
            
            // 백엔드에서 사용자 데이터 가져오기
            const backendUsers = await ServerAPI.getAllUsers();
            if (!backendUsers) {
                addAlert('error', 'Failed to load users from backend');
                return;
            }

            let successCount = 0;
            let failCount = 0;

            for (const userId of selectedUsers) {
                try {
                    const user = backendUsers.find(u => u.id === userId);
                    if (user) {
                        const newPoints = (user.ctt_points || 0) + amount;
                        
                        // 백엔드 업데이트
                        const backendResult = await ServerAPI.updateScore(
                            user.email,
                            user.score || 0,
                            newPoints,
                            user.full_name
                        );
                        
                        if (backendResult) {
                            // localStorage 업데이트
                            try {
                                User.update(userId, { ctt_points: newPoints });
                            } catch (localError) {
                                console.warn(`[Admin] localStorage 업데이트 실패:`, localError);
                            }
                            
                            // 실시간 이벤트 발생
                            try {
                                const cttUpdateEvent = new CustomEvent('cttPointsUpdated', {
                                    detail: {
                                        userEmail: user.email,
                                        newCttPoints: newPoints,
                                        addedAmount: amount
                                    }
                                });
                                window.dispatchEvent(cttUpdateEvent);
                            } catch (eventError) {
                                console.error(`[Admin] 이벤트 발생 실패:`, eventError);
                            }
                            
                            successCount++;
                            console.log(`[Admin] ✅ ${user.full_name}: ${amount} CTT 지급 성공`);
                        } else {
                            failCount++;
                            console.error(`[Admin] ❌ ${user.full_name}: 백엔드 업데이트 실패`);
                        }
                    } else {
                        failCount++;
                        console.error(`[Admin] ❌ 사용자를 찾을 수 없음: ${userId}`);
                    }
                } catch (error) {
                    console.error(`[Admin] Failed to send to user ${userId}:`, error);
                    failCount++;
                }
            }

            loadSystemData();
            setSelectedUsers([]);
            setMultiSendAmount('');
            
            addAlert('success', `Multi-send completed: ${successCount} success, ${failCount} failed`);
        } catch (error) {
            console.error('[Admin] Multi-send failed:', error);
            addAlert('error', 'Multi-send operation failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAdminToggle = async (userId) => {
        try {
            const user = User.findById(userId);
            if (!user) {
                addAlert('error', 'User not found');
                return;
            }

            const newAdminStatus = !user.is_admin;
            User.update(userId, { is_admin: newAdminStatus });
            
            loadSystemData();
            addAlert('success', `${user.full_name} admin status: ${newAdminStatus ? 'Enabled' : 'Disabled'}`);
        } catch (error) {
            console.error('[Admin] Admin toggle failed:', error);
            addAlert('error', 'Admin status change failed');
        }
    };

    // 🗑️ 개별 사용자 삭제 함수
    const handleDeleteUser = async (userId) => {
        try {
            const user = allUsers.find(u => u.id === userId);
            if (!user) {
                addAlert('error', '사용자를 찾을 수 없습니다');
                return;
            }

            // 중요한 사용자 삭제 방지
            const protectedEmails = [
                'tradenbot@gmail.com',  // gina park
                'john.choi775@gmail.com',  // john choi
                'allbandex@gmail.com',  // all band
                'creatanetwork@gmail.com'  // creatanetwork
            ];

            if (protectedEmails.includes(user.email)) {
                addAlert('error', `${user.full_name}니다. 실제 사용자는 삭제할 수 없습니다.`);
                return;
            }

            // 확인 메시지
            if (!confirm(`정말로 "${user.full_name}" 사용자를 삭제하시겠습니까?\n\n이메일: ${user.email}\n점수: ${user.score || 0}\nCTT: ${user.ctt_points || 0}\n\n이 작업은 되돌릴 수 없습니다.`)) {
                return;
            }

            setIsProcessing(true);
            
            // 백엔드 API 호출
            const result = await ServerAPI.deleteUser(userId);
            
            if (result) {
                // localStorage에서도 삭제
                const localUsers = JSON.parse(localStorage.getItem('catena_users') || '[]');
                const updatedLocalUsers = localUsers.filter(u => u.id !== userId);
                localStorage.setItem('catena_users', JSON.stringify(updatedLocalUsers));
                
                // 데이터 새로고침
                await loadSystemData();
                
                addAlert('success', `${user.full_name} 사용자가 삭제되었습니다.`);
            } else {
                addAlert('error', '사용자 삭제에 실패했습니다.');
            }

        } catch (error) {
            console.error('[Admin] Delete user failed:', error);
            addAlert('error', '사용자 삭제 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    // 🧹 테스트 사용자 일괄 삭제 함수
    const handleCleanupTestUsers = async () => {
        try {
            // 확인 메시지
            if (!confirm('테스트 사용자들을 일괄 삭제하시겠습니까?\n\n다음 사용자들은 보호됩니다:\n- gina park\n- john choi\n- all band\n- creatanetwork\n\n나머지 테스트 사용자들이 삭제됩니다.')) {
                return;
            }

            setIsProcessing(true);
            
            // 🔄 1단계: localStorage에서 먼저 정리
            console.log('🧹 [1단계] localStorage 테스트 사용자 정리...');
            const protectedEmails = [
                'tradenbot@gmail.com',
                'john.choi775@gmail.com',
                'allbandex@gmail.com',
                'creatanetwork@gmail.com'
            ];
            
            const localUsers = JSON.parse(localStorage.getItem('catena_users') || '[]');
            const cleanedLocalUsers = localUsers.filter(user => {
                if (protectedEmails.includes(user.email)) {
                    return true; // 보호된 사용자는 유지
                }
                
                // 테스트 사용자 패턴 체크
                const testPatterns = [
                    /^test@/i,
                    /^user_.*@gmail\.com$/i,
                    /^user_.*@kakao\.com$/i,
                    /^kakao_user_.*@kakao\.com$/i,
                    /^Google User/i,
                    /^카카오 사용자/i
                ];
                
                const isTestUser = testPatterns.some(pattern => 
                    pattern.test(user.email) || pattern.test(user.full_name)
                );
                
                return !isTestUser; // 테스트 사용자가 아니면 유지
            });
            
            localStorage.setItem('catena_users', JSON.stringify(cleanedLocalUsers));
            console.log(`✅ [1단계] localStorage 정리 완료: ${localUsers.length} → ${cleanedLocalUsers.length}`);
            
            // 🚀 2단계: 백엔드 API 호출
            console.log('🧹 [2단계] 백엔드 테스트 사용자 정리...');
            const result = await ServerAPI.cleanupTestUsers();
            
            if (result) {
                // 🔄 3단계: 데이터 새로고침
                console.log('🔄 [3단계] 데이터 새로고침...');
                await loadSystemData();
                
                addAlert('success', `테스트 사용자 정리 완료: ${result.deletedCount}명 삭제, ${result.remainingCount}명 남음`);
            } else {
                addAlert('error', '테스트 사용자 정리에 실패했습니다.');
            }

        } catch (error) {
            console.error('[Admin] Cleanup test users failed:', error);
            addAlert('error', '테스트 사용자 정리 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    const exportUserData = () => {
        try {
            const data = allUsers.map(user => ({
                id: user.id,
                name: user.full_name,
                email: user.email,
                ctt_points: user.ctt_points,
                score: user.score,
                prediction_count: user.prediction_count,
                is_admin: user.is_admin,
                created_at: user.created_at
            }));

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `catena_users_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            addAlert('success', 'User data exported successfully');
        } catch (error) {
            console.error('[Admin] Export failed:', error);
            addAlert('error', 'Export failed');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
                <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
                        <p className="text-gray-400">Please log in to access the admin panel.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
                <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-8 text-center">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                        <p className="text-gray-400">You don't have administrator privileges.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Settings className="w-8 h-8 text-cyan-400" />
                    Admin Dashboard
                </h1>
                <p className="text-gray-400">Manage users, points, and system operations</p>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="mb-6 space-y-2">
                    {alerts.map(alert => (
                        <Alert key={alert.id} className={`${
                            alert.type === 'error' ? 'bg-red-900/20 border-red-500' : 
                            alert.type === 'success' ? 'bg-green-900/20 border-green-500' : 
                            'bg-blue-900/20 border-blue-500'
                        }`}>
                            <AlertDescription className="text-white">
                                [{alert.timestamp}] {alert.message}
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-gray-800 border-gray-700">
                    <TabsTrigger value="dashboard" className="data-[state=active]:bg-cyan-600">
                        <Activity className="w-4 h-4 mr-2" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="users" className="data-[state=active]:bg-cyan-600">
                        <Users className="w-4 h-4 mr-2" />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="points" className="data-[state=active]:bg-cyan-600">
                        <Coins className="w-4 h-4 mr-2" />
                        Points
                    </TabsTrigger>
                    <TabsTrigger value="multisend" className="data-[state=active]:bg-cyan-600">
                        <Send className="w-4 h-4 mr-2" />
                        Multi-Send
                    </TabsTrigger>
                </TabsList>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-400 text-sm">Total Users</p>
                                        <p className="text-2xl font-bold text-white">{systemStats.totalUsers}</p>
                                    </div>
                                    <Users className="w-8 h-8 text-cyan-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-400 text-sm">Total Bets</p>
                                        <p className="text-2xl font-bold text-white">{systemStats.totalBets}</p>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-green-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-400 text-sm">Total CTT Points</p>
                                        <p className="text-2xl font-bold text-white">{formatCttPoints(systemStats.totalCttPoints)}</p>
                                    </div>
                                    <Coins className="w-8 h-8 text-yellow-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-400 text-sm">Active Rounds</p>
                                        <p className="text-2xl font-bold text-white">{systemStats.activeRounds}</p>
                                    </div>
                                    <Activity className="w-8 h-8 text-blue-400" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-4">
                                <Button onClick={loadSystemData} variant="outline" className="border-gray-600">
                                    <Activity className="w-4 h-4 mr-2" />
                                    Refresh Data
                                </Button>
                                <Button onClick={exportUserData} variant="outline" className="border-gray-600">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export Users
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-white">User Management</CardTitle>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleCleanupTestUsers}
                                        disabled={isProcessing}
                                        variant="destructive"
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {isProcessing ? (
                                            <>Processing...</>
                                        ) : (
                                            <>
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                테스트 사용자 일괄 삭제
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {allUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center">
                                                <span className="font-bold text-white">{user.full_name[0]}</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{user.full_name}</p>
                                                <p className="text-sm text-gray-400">{user.email}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                                                        {formatCttPoints(user.ctt_points || 0)} CTT
                                                    </Badge>
                                                    <Badge variant="outline" className="text-green-400 border-green-400">
                                                        Score: {user.score || 0}
                                                    </Badge>
                                                    {user.is_admin && (
                                                        <Badge className="bg-purple-600">Admin</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAdminToggle(user.id)}
                                                className={user.is_admin ? "border-red-500 text-red-400" : "border-purple-500 text-purple-400"}
                                            >
                                                <UserCheck className="w-4 h-4 mr-1" />
                                                {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={isProcessing}
                                                className="bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                삭제
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Points Tab */}
                <TabsContent value="points" className="space-y-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">CTT Points Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {allUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center">
                                                <span className="font-bold text-white">{user.full_name[0]}</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{user.full_name}</p>
                                                <p className="text-xl font-bold text-cyan-400">{formatCttPoints(user.ctt_points || 0)} CTT</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handlePointsAdjustment(user.id, -10)}
                                                className="border-red-500 text-red-400"
                                            >
                                                -10
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handlePointsAdjustment(user.id, -100)}
                                                className="border-red-500 text-red-400"
                                            >
                                                -100
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handlePointsAdjustment(user.id, 10)}
                                                className="border-green-500 text-green-400"
                                            >
                                                +10
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handlePointsAdjustment(user.id, 100)}
                                                className="border-green-500 text-green-400"
                                            >
                                                +100
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Multi-Send Tab */}
                <TabsContent value="multisend" className="space-y-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Multi-Send CTT Points</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4 items-center">
                                <Button
                                    onClick={handleSelectAllUsers}
                                    variant="outline"
                                    className="border-gray-600"
                                >
                                    {selectedUsers.length === allUsers.length ? 'Deselect All' : 'Select All'}
                                </Button>
                                <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                                    {selectedUsers.length} users selected
                                </Badge>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {allUsers.map(user => (
                                    <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                                            className="w-4 h-4 text-cyan-600 rounded"
                                        />
                                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center">
                                            <span className="font-bold text-white text-sm">{user.full_name[0]}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-white">{user.full_name}</p>
                                            <p className="text-sm text-cyan-400">{formatCttPoints(user.ctt_points || 0)} CTT</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4">
                                <Input
                                    type="number"
                                    placeholder="Amount to send"
                                    value={multiSendAmount}
                                    onChange={(e) => setMultiSendAmount(e.target.value)}
                                    className="bg-gray-700 border-gray-600 text-white"
                                />
                                <Button
                                    onClick={handleMultiSend}
                                    disabled={selectedUsers.length === 0 || !multiSendAmount || isProcessing}
                                    className="bg-cyan-600 hover:bg-cyan-700"
                                >
                                    {isProcessing ? (
                                        <>Processing...</>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Send CTT
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}