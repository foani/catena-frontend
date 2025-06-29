import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { HybridDataManager, ServerConnectionMonitor, BulkScoreSync, SyncStatusMonitor } from '@/api/serverAPI';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Crown, Medal, Gem, Trophy, Users, Target, Shield, Coins, Gift, Download, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Database, Trash2, CheckCircle, XCircle, RotateCw } from 'lucide-react';

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

// 관리자 데이터 관리 컴포넌트
const AdminDataManager = ({ onDataChanged, exportUserData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleRemoveDuplicates = async () => {
        setIsLoading(true);
        try {
            const remainingCount = User.removeDuplicates();
            alert(`중복 사용자 제거 완료!\n남은 사용자: ${remainingCount}명`);
            onDataChanged();
        } catch (error) {
            console.error('중복 제거 실패:', error);
            alert('중복 제거에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearAllData = async () => {
        if (!confirm('⚠️ 경고!\n\n모든 사용자 데이터, 게임 기록, 점수가 삭제됩니다.\n정말로 계속하시겠습니까?')) {
            return;
        }
        
        if (!confirm('⚠️ 최종 확인!\n\n이 작업은 되돌릴 수 없습니다.\n모든 데이터를 삭제하시겠습니까?')) {
            return;
        }

        setIsLoading(true);
        try {
            User.clearAllData();
            alert('모든 데이터가 초기화되었습니다.\n페이지를 새로고침합니다.');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('데이터 초기화 실패:', error);
            alert('데이터 초기화에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsOpen(true)} 
                className="flex items-center text-xs px-3 py-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
            >
                <Database className="w-4 h-4 mr-1" />
                데이터 관리
            </Button>
            <DialogContent className="sm:max-w-[500px] bg-gray-900 text-white border-gray-700">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-yellow-400 flex items-center">
                        <Database className="w-5 h-5 mr-2" />
                        관리자 데이터 관리
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        개발/테스트용 데이터 관리 도구입니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <h3 className="font-bold text-green-400 mb-2 flex items-center">
                            <Download className="w-4 h-4 mr-1" />
                            사용자 데이터 내보내기
                        </h3>
                        <p className="text-gray-300 text-sm mb-3">
                            localStorage의 모든 사용자 데이터를 JSON 파일로 내보냅니다.
                        </p>
                        <Button 
                            onClick={() => {
                                exportUserData();
                                setIsOpen(false);
                            }}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <Download className="w-4 h-4 mr-1" />
                            데이터 내보내기
                        </Button>
                    </div>
                    
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <h3 className="font-bold text-blue-400 mb-2">중복 사용자 제거</h3>
                        <p className="text-gray-300 text-sm mb-3">
                            동일한 이메일의 중복 사용자를 제거합니다.
                        </p>
                        <Button 
                            onClick={handleRemoveDuplicates}
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isLoading ? '처리 중...' : '중복 제거'}
                        </Button>
                    </div>
                    
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <h3 className="font-bold text-red-400 mb-2 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            전체 데이터 초기화
                        </h3>
                        <p className="text-gray-300 text-sm mb-3">
                            ⚠️ 모든 사용자 데이터, 게임 기록, 점수가 삭제됩니다.
                        </p>
                        <Button 
                            onClick={handleClearAllData}
                            disabled={isLoading}
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {isLoading ? '삭제 중...' : '전체 삭제'}
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        variant="outline" 
                        onClick={() => setIsOpen(false)} 
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                        닫기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// 🔄 관리자용 점수 동기화 컴포넌트
const AdminSyncManager = ({ onSyncComplete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null);
    const [lastSyncResult, setLastSyncResult] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    // 동기화 상태 확인
    const checkStatus = async () => {
        setCheckingStatus(true);
        try {
            const status = await SyncStatusMonitor.checkSyncStatus();
            setSyncStatus(status);
            console.log('🔍 [AdminSync] 상태 확인 결과:', status);
        } catch (error) {
            console.error('❌ [AdminSync] 상태 확인 실패:', error);
            setSyncStatus({ error: error.message, isSynced: false });
        } finally {
            setCheckingStatus(false);
        }
    };

    // 대량 동기화 실행
    const handleBulkSync = async () => {
        setIsLoading(true);
        setLastSyncResult(null);
        
        try {
            console.log('🚀 [AdminSync] 대량 동기화 시작');
            const result = await BulkScoreSync.syncAllScoresToBackend();
            setLastSyncResult(result);
            
            if (result.success) {
                const message = `✅ 점수 동기화 완료!\n\n📊 결과:\n• 총 대상: ${result.totalUsers}명\n• 성공: ${result.successCount}명\n• 실패: ${result.failCount}명`;
                
                alert(message);
                console.log('🎉 [AdminSync] 동기화 성공:', result);
                
                // 완료 후 상태 재확인 및 콜백 호출
                await checkStatus();
                if (onSyncComplete) onSyncComplete();
                
            } else {
                const errorMessage = `❌ 동기화 실패:\n${result.error || '알 수 없는 오류'}`;
                alert(errorMessage);
                console.error('💥 [AdminSync] 동기화 실패:', result);
            }
            
        } catch (error) {
            const errorMessage = `💥 동기화 중 오류 발생:\n${error.message}`;
            alert(errorMessage);
            console.error('💥 [AdminSync] 동기화 오류:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 컴포넌트 마운트 시 상태 확인
    useEffect(() => {
        if (isOpen) {
            checkStatus();
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsOpen(true)} 
                className="flex items-center text-xs px-3 py-2 border-orange-500 text-orange-400 hover:bg-orange-500/10"
            >
                <RotateCw className="w-4 h-4 mr-1" />
                점수 동기화
            </Button>
            
            <DialogContent className="sm:max-w-[600px] bg-gray-900 text-white border-gray-700">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-orange-400 flex items-center">
                        <RotateCw className="w-5 h-5 mr-2" />
                        점수 동기화 관리
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        localStorage와 백엔드 서버 간 점수 데이터를 동기화합니다.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    {/* 동기화 상태 표시 */}
                    <div className="p-4 bg-gray-800/50 border border-gray-600 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-gray-300">📊 현재 동기화 상태</h3>
                            <Button 
                                onClick={checkStatus}
                                disabled={checkingStatus}
                                variant="outline"
                                size="sm"
                                className="border-gray-600 text-gray-400 hover:bg-gray-700"
                            >
                                <RefreshCw className={`w-4 h-4 mr-1 ${checkingStatus ? 'animate-spin' : ''}`} />
                                새로고침
                            </Button>
                        </div>
                        
                        {checkingStatus ? (
                            <div className="text-gray-400 text-sm">
                                🔄 상태 확인 중...
                            </div>
                        ) : syncStatus ? (
                            <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-gray-400">로컬 사용자:</p>
                                        <p className="text-white font-bold">
                                            {syncStatus.localUsersTotal}명 
                                            <span className="text-cyan-400 ml-1">
                                                ({syncStatus.localUsersWithScores}명 점수보유)
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">백엔드 사용자:</p>
                                        <p className="text-white font-bold">
                                            {syncStatus.backendUsersTotal}명 
                                            <span className="text-cyan-400 ml-1">
                                                ({syncStatus.backendUsersWithScores}명 점수보유)
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                
                                <div className={`flex items-center gap-2 p-2 rounded ${
                                    syncStatus.isSynced 
                                        ? 'bg-green-500/20 border border-green-500/30' 
                                        : 'bg-red-500/20 border border-red-500/30'
                                }`}>
                                    {syncStatus.isSynced ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                            <span className="text-green-400 font-bold">✅ 완전히 동기화됨</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-4 h-4 text-red-400" />
                                            <span className="text-red-400 font-bold">
                                                ⚠️ {syncStatus.syncIssues}개 불일치 발견
                                            </span>
                                        </>
                                    )}
                                </div>
                                
                                {/* 불일치 상세 정보 */}
                                {!syncStatus.isSynced && syncStatus.issues && syncStatus.issues.length > 0 && (
                                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded max-h-32 overflow-y-auto">
                                        <p className="text-yellow-400 font-bold text-xs mb-2">🔍 불일치 상세:</p>
                                        {syncStatus.issues.map((issue, index) => (
                                            <div key={index} className="text-xs text-gray-300 mb-1">
                                                {issue.type === 'missing_in_backend' && (
                                                    <span>• {issue.user}: 로컬({issue.localScore}점) → 백엔드(없음)</span>
                                                )}
                                                {issue.type === 'score_mismatch' && (
                                                    <span>• {issue.user}: 로컬({issue.localScore}점) ≠ 백엔드({issue.backendScore}점)</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-gray-400 text-sm">
                                상태를 확인하려면 새로고침 버튼을 클릭하세요.
                            </div>
                        )}
                    </div>
                    
                    {/* 동기화 실행 섹션 */}
                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <h3 className="font-bold text-orange-400 mb-3 flex items-center">
                            🔄 점수 동기화 실행
                        </h3>
                        <p className="text-gray-300 text-sm mb-4">
                            localStorage의 모든 점수 데이터를 백엔드 서버로 동기화합니다.
                            <br />
                            <span className="text-yellow-400">⚠️ 이 작업은 몇 초에서 몇 분 소요될 수 있습니다.</span>
                        </p>
                        
                        <Button 
                            onClick={handleBulkSync}
                            disabled={isLoading || checkingStatus}
                            className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    동기화 진행 중...
                                </>
                            ) : (
                                <>
                                    <RotateCw className="w-4 h-4 mr-2" />
                                    점수 동기화 실행
                                </>
                            )}
                        </Button>
                        
                        {/* 마지막 동기화 결과 */}
                        {lastSyncResult && (
                            <div className="mt-3 p-3 bg-gray-800/70 border border-gray-600 rounded text-xs">
                                <p className="text-gray-400 mb-1">📋 마지막 동기화 결과:</p>
                                <div className="text-white">
                                    • 총 대상: <span className="text-cyan-400">{lastSyncResult.totalUsers}명</span>
                                    • 성공: <span className="text-green-400">{lastSyncResult.successCount}명</span>
                                    • 실패: <span className="text-red-400">{lastSyncResult.failCount}명</span>
                                </div>
                                {lastSyncResult.results && lastSyncResult.results.length > 0 && (
                                    <details className="mt-2">
                                        <summary className="text-gray-400 cursor-pointer hover:text-white">상세 결과 보기</summary>
                                        <div className="mt-2 max-h-24 overflow-y-auto">
                                            {lastSyncResult.results.map((result, index) => (
                                                <div key={index} className="text-xs">
                                                    <span className={
                                                        result.status === 'success' ? 'text-green-400' :
                                                        result.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                                                    }>
                                                        {result.status === 'success' ? '✅' : 
                                                         result.status === 'failed' ? '❌' : '⚠️'} 
                                                        {result.name} ({result.score}점)
                                                        {result.newRank && ` - 랭킹: ${result.newRank}위`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <DialogFooter>
                    <Button 
                        variant="outline" 
                        onClick={() => setIsOpen(false)} 
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        disabled={isLoading}
                    >
                        닫기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// 관리자 포인트 지급 컴포넌트
const AdminPointGiver = ({ user, onPointsGiven }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGivePoints = async () => {
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert('지급할 포인트를 숫자로 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const currentPoints = user.ctt_points || 0;
            const newPoints = currentPoints + parsedAmount;

            await User.update(user.id, { ctt_points: newPoints });

            alert(`${user.full_name}님에게 ${parsedAmount} CTT 포인트를 성공적으로 지급했습니다.\n(새로운 포인트: ${newPoints} CTT)`);
            onPointsGiven();
            setIsOpen(false);
            setAmount('');
        } catch (error) {
            console.error('포인트 지급 실패:', error);
            alert(`포인트 지급에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="flex items-center text-xs px-2 py-1 h-auto">
                <Gift className="w-4 h-4 mr-1 text-cyan-400" />
                포인트 지급
            </Button>
            <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-cyan-400">{user.full_name}에게 CTT 포인트 지급</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        현재 CTT 포인트: <span className="font-bold text-lg text-yellow-400">{formatCttPoints(user.ctt_points || 0)}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="amount" className="text-gray-300">지급할 CTT 포인트</Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="예: 100"
                            min="1"
                            className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">취소</Button>
                    <Button onClick={handleGivePoints} disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                        {isLoading ? '지급 중...' : '확인'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function RankingPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [totalUsers, setTotalUsers] = useState(0);
    
    // 🔄 하이브리드 연동을 위한 상태들
    const [serverStatus, setServerStatus] = useState({ isConnected: false, mode: 'local' });
    const [dataSource, setDataSource] = useState('local');
    const [isRealtime, setIsRealtime] = useState(false);
    
    const { t } = useTranslation();

    // 📄 localStorage 데이터를 JSON 파일로 내보내기
    const exportUserDataToFile = () => {
        console.log('📄 [Export] localStorage 데이터 내보내기 시작');
        
        try {
            const rawUsers = localStorage.getItem('catena_users');
            const users = rawUsers ? JSON.parse(rawUsers) : [];
            
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-');
            const filename = `catena_users_${timestamp}.json`;
            
            const exportData = {
                exportDate: now.toISOString(),
                totalUsers: users.length,
                users: users.map(user => ({
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    score: user.score,
                    ctt_points: user.ctt_points,
                    is_admin: user.is_admin,
                    created_at: user.created_at,
                    updated_at: user.updated_at
                }))
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(dataBlob);
            downloadLink.download = filename;
            downloadLink.click();
            
            console.log('✅ [Export] 파일 다운로드 완료:', filename);
            alert(`✅ 사용자 데이터 내보내기 완료!\n\n파일명: ${filename}\n총 사용자: ${users.length}명\n\n다운로드 폴더를 확인하세요.`);
            
        } catch (error) {
            console.error('❌ [Export] 내보내기 실패:', error);
            alert('❌ 데이터 내보내기에 실패했습니다.');
        }
    };

    // 🔄 **핵심 수정**: 하이브리드 랭킹 조회 함수 (백엔드 강제 우선 방식)
    const fetchRankingsHybrid = async () => {
        console.log('🔄 [Hybrid] 강제 서버 모드 랭킹 조회 시작');
        setIsLoading(true);
        
        try {
            // 1. 현재 사용자 정보 로컬에서 가져오기
            const localUser = await User.me().catch(() => null);
            setCurrentUser(localUser);
            setIsAdmin(localUser?.is_admin === true);
            
            // 2. 🔥 강제 서버 데이터 새로고침 먼저 실행
            console.log('🔥 [Hybrid] 서버 데이터 강제 새로고침 시작');
            const forceRefreshResult = await HybridDataManager.forceServerRefresh();
            
            if (forceRefreshResult && forceRefreshResult.length > 0) {
                console.log('✅ [Hybrid] 강제 새로고침 성공 - 서버 데이터 사용');
                setUsers(forceRefreshResult);
                setTotalUsers(forceRefreshResult.length);
                setDataSource('server');
                setIsRealtime(true);
                
                console.log('🎆 [Hybrid] 강제 서버 모드 성공:', {
                    totalUsers: forceRefreshResult.length,
                    topUsers: forceRefreshResult.slice(0, 3).map(u => ({ 
                        name: u.full_name, 
                        score: u.score,
                        rank: u.rank
                    }))
                });
                return; // 서버 데이터 사용 성공 시 여기서 종료
            }
            
            // 3. 서버 새로고침 실패 시 하이브리드 조회
            console.log('⚠️ [Hybrid] 서버 새로고침 실패 - 하이브리드 모드 시도');
            const hybridResult = await HybridDataManager.hybridGetRankings(async () => {
                // 로컬 대체 함수
                console.log('💾 [Hybrid] 로컬 대체 모드 실행');
                const rankedUsers = await User.listWithSync('-score', 100);
                const validUsers = rankedUsers.filter(u => u.score && u.score > 0);
                validUsers.sort((a, b) => (b.score || 0) - (a.score || 0));
                return validUsers;
            });
            
            // 4. 결과 설정
            const rankedUsers = hybridResult.data || [];
            setUsers(rankedUsers);
            setTotalUsers(rankedUsers.length);
            setDataSource(hybridResult.source);
            setIsRealtime(hybridResult.isRealtime);
            
            console.log('📋 [Hybrid] 하이브리드 랭킹 조회 완료:', {
                source: hybridResult.source,
                isRealtime: hybridResult.isRealtime,
                totalUsers: rankedUsers.length,
                serverConnected: serverStatus.isConnected,
                topUsers: rankedUsers.slice(0, 3).map(u => ({ 
                    name: u.full_name, 
                    score: u.score 
                }))
            });
            
        } catch (error) {
            console.error('❌ [Hybrid] 하이브리드 랭킹 조회 실패:', error);
            
            // 완전 실패 시 로컬 전용 모드
            console.log('💾 [Fallback] 로컬 전용 모드로 전환');
            const localRankedUsers = await User.listWithSync('-score', 100);
            const validUsers = localRankedUsers.filter(u => u.score && u.score > 0);
            validUsers.sort((a, b) => (b.score || 0) - (a.score || 0));
            
            setUsers(validUsers);
            setTotalUsers(validUsers.length);
            setDataSource('local-fallback');
            setIsRealtime(false);
        } finally {
            setIsLoading(false);
        }
    };

    // 🔄 수동 새로고침 함수
    const handleManualRefresh = async () => {
        console.log('🔄 [Manual] 수동 새로고침 실행');
        setIsLoading(true);
        
        try {
            // 1. 서버 연결 강제 체크
            await HybridDataManager.checkServerConnection();
            
            // 2. 서버 데이터 강제 새로고침
            if (HybridDataManager.isServerConnected) {
                await HybridDataManager.forceServerRefresh();
            }
            
            // 3. 랭킹 다시 조회
            await fetchRankingsHybrid();
            
            console.log('✅ [Manual] 수동 새로고침 완료');
        } catch (error) {
            console.error('❌ [Manual] 수동 새로고침 실패:', error);
        }
    };

    const getRankIcon = (rank) => {
        if (rank === 0) return <Crown className="w-6 h-6 text-yellow-400" />;
        if (rank >= 1 && rank <= 19) return <Medal className="w-6 h-6 text-gray-300" />;
        if (rank >= 20 && rank <= 519) return <Gem className="w-6 h-6 text-yellow-600" />;
        return <span className="text-lg font-bold w-6 text-center">{rank + 1}</span>;
    };

    const getRankReward = (rank) => {
        if (rank === 0) return { cta: 1000, usdt: 5000, tier: '1st' };
        if (rank >= 1 && rank <= 19) return { cta: 50, usdt: 250, tier: '2nd' };
        if (rank >= 20 && rank <= 519) return { cta: 2, usdt: 0, tier: '3rd' };
        if (rank >= 520 && rank <= 1519) return { cta: 1, usdt: 0, tier: '4th' };
        if (rank >= 1520 && rank <= 3519) return { cta: 0.5, usdt: 0, tier: '5th' };
        if (rank >= 3520 && rank <= 8519) return { cta: 0.2, usdt: 0, tier: '6th' };
        if (rank >= 8520 && rank <= 18519) return { cta: 0.1, usdt: 0, tier: '7th' };
        return { cta: 0, usdt: 0, tier: 'Unranked' };
    };

    const getCurrentUserRank = () => {
        // 🔍 디버그 로그 추가
        console.log('🏆 [My Rank Debug] ===================');
        console.log('현재 사용자 (currentUser):', currentUser);
        console.log('전체 사용자 수 (users.length):', users.length);
        console.log('전체 사용자 목록 (users):', users.map(u => ({ id: u.id, name: u.full_name, score: u.score })));
        
        if (!currentUser || users.length === 0) {
            console.log('⚠️ [My Rank] 조건 체크 실패:', !currentUser ? '현재 사용자 없음' : '사용자 목록 비어있음');
            return null;
        }
        
        const userRank = users.findIndex(u => u.id === currentUser.id);
        console.log('사용자 랭크 검색 결과 (userRank):', userRank);
        console.log('사용자 ID 매칭:', {
            currentUserId: currentUser.id,
            foundInUsers: users.some(u => u.id === currentUser.id),
            matchingUsers: users.filter(u => u.id === currentUser.id)
        });
        console.log('==========================================');
        
        return userRank === -1 ? null : userRank;
    };

    useEffect(() => {
        console.log('🚀 [Ranking] 컴포넌트 마운트 - 하이브리드 시스템 시작');
        
        // 1. 즉시 하이브리드 랭킹 조회
        fetchRankingsHybrid();
        
        // 2. 서버 연결 모니터링 시작
        ServerConnectionMonitor.startMonitoring((status) => {
            console.log('🔄 [Server Status]', status);
            setServerStatus(status);
            
            // 서버 연결 상태가 변경되면 자동으로 데이터 새로고침
            if (status.changed) {
                console.log('🔄 [Auto Refresh] 서버 상태 변경으로 인한 자동 새로고침');
                fetchRankingsHybrid();
            }
        });
        
        // 3. localStorage 변경 감지
        const handleStorageChange = (e) => {
            if (e.key === 'catena_users') {
                console.log('🔄 [Storage] localStorage 변경 감지 - 하이브리드 새로고침');
                fetchRankingsHybrid();
            }
        };
        
        // 4. 탭 포커스 시 새로고침
        const handleFocus = () => {
            console.log('🔄 [Focus] 탭 포커스 - 하이브리드 새로고침');
            fetchRankingsHybrid();
        };
        
        // 5. 이벤트 리스너 등록
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('focus', handleFocus);
        
        // 6. 정리 함수
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', handleFocus);
            ServerConnectionMonitor.stopMonitoring();
        };
    }, []);

    return (
        <div className="container mx-auto p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white border-0">
                        <CardContent className="p-6 text-center">
                            <Trophy className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-2xl font-bold">
                                {(() => {
                                    const myRank = getCurrentUserRank();
                                    console.log('🏆 [UI Display] My Rank 표시:', {
                                        myRank,
                                        displayValue: myRank !== null ? myRank + 1 : '-',
                                        currentUser: currentUser ? { id: currentUser.id, name: currentUser.full_name } : null
                                    });
                                    return myRank !== null ? myRank + 1 : '-';
                                })()}
                            </p>
                            <p className="text-sm opacity-90">{t('my_rank')}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-600 to-pink-700 text-white border-0">
                        <CardContent className="p-6 text-center">
                            <Users className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-2xl font-bold">{totalUsers}</p>
                            <p className="text-sm opacity-90">{t('total_participants')}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-600 to-teal-700 text-white border-0">
                        <CardContent className="p-6 text-center">
                            <Target className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-2xl font-bold">{currentUser?.score || 0}</p>
                            <p className="text-sm opacity-90">{t('my_score')}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-center text-cyan-400">🎁 {t('reward_system')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center mb-6">
                            <div className="p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                                <Crown className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                                <p className="font-bold text-yellow-400">1st (1)</p>
                                <p className="text-xl font-bold text-white">1,000 CTA</p>
                                <p className="text-lg font-bold text-green-400">+ 5,000 USDT</p>
                            </div>
                            <div className="p-4 bg-gray-500/20 rounded-lg border border-gray-500/30">
                                <Medal className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                                <p className="font-bold text-gray-300">2nd (20)</p>
                                <p className="text-lg font-bold text-white">50 CTA</p>
                                <p className="text-md font-bold text-green-400">+ 250 USDT</p>
                            </div>
                            <div className="p-4 bg-orange-500/20 rounded-lg border border-orange-500/30">
                                <Gem className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                                <p className="font-bold text-orange-400">3rd (500)</p>
                                <p className="text-lg font-bold text-white">2 CTA</p>
                            </div>
                            <div className="p-4 bg-purple-500/20 rounded-lg border border-purple-500/30">
                                <Trophy className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                                <p className="font-bold text-purple-400">4th (1000)</p>
                                <p className="text-lg font-bold text-white">1 CTA</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                            <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20">
                                <p className="font-bold text-blue-400">5th (2000)</p>
                                <p className="text-white">0.5 CTA</p>
                            </div>
                            <div className="p-3 bg-indigo-500/10 rounded border border-indigo-500/20">
                                <p className="font-bold text-indigo-400">6th (5000)</p>
                                <p className="text-white">0.2 CTA</p>
                            </div>
                            <div className="p-3 bg-pink-500/10 rounded border border-pink-500/20">
                                <p className="font-bold text-pink-400">7th (10000)</p>
                                <p className="text-white">0.1 CTA</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700 shadow-2xl shadow-cyan-500/10">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-2xl font-bold text-cyan-400 tracking-widest">
                                {t('ranking_title')}
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                {/* 🔄 수동 새로고침 버튼 추가 */}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleManualRefresh}
                                    disabled={isLoading}
                                    className="flex items-center text-xs px-3 py-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                    새로고침
                                </Button>
                                
                                {/* 서버 연결 상태 표시기 (개선) */}
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium
                                    ${serverStatus.isConnected 
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    }`}>
                                    <div className={`w-2 h-2 rounded-full 
                                        ${serverStatus.isConnected ? 'bg-green-400' : 'bg-yellow-400'}
                                    `}></div>
                                    <span>
                                        {dataSource === 'server' && isRealtime ? '서버 (실시간)' :
                                         dataSource === 'server' ? '서버 (캐시)' :
                                         dataSource === 'server-cache' ? '서버 (캐시)' :
                                         dataSource === 'local-fallback' ? '로컬 (오프라인)' :
                                         '로컬 모드'}
                                    </span>
                                </div>
                                
                                {isAdmin && (
                                    <div className="flex gap-2">
                                        <AdminDataManager 
                                            onDataChanged={fetchRankingsHybrid} 
                                            exportUserData={exportUserDataToFile}
                                        />
                                        <AdminSyncManager 
                                            onSyncComplete={fetchRankingsHybrid}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-700 hover:bg-transparent">
                                        <TableHead className="w-[80px] text-center text-gray-400">{t('rank')}</TableHead>
                                        <TableHead className="text-gray-400">{t('user')}</TableHead>
                                        <TableHead className="text-right text-gray-400">{t('ranking_score')}</TableHead>
                                        <TableHead className="text-right text-gray-400">{t('predictions')}</TableHead>
                                        <TableHead className="text-right text-gray-400">{t('expected_reward')}</TableHead>
                                        {isAdmin && <TableHead className="text-center text-gray-400">관리</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array(10).fill(0).map((_, i) => (
                                            <TableRow key={i} className="border-gray-700">
                                                <TableCell className="text-center"><Skeleton className="h-6 w-6 rounded-full mx-auto" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                                {isAdmin && <TableCell className="text-center"><Skeleton className="h-8 w-24 mx-auto" /></TableCell>}
                                            </TableRow>
                                        ))
                                    ) : users.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-gray-400 py-8">
                                                {t('no_rankers_yet')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.map((user, index) => {
                                            const reward = getRankReward(index);
                                            const isCurrentUser = currentUser && user.id === currentUser.id;
                                            return (
                                                <TableRow 
                                                    key={user.id} 
                                                    className={`border-gray-700 transition-colors hover:bg-gray-800 ${
                                                        index < 3 ? 'bg-cyan-500/5' : ''
                                                    } ${isCurrentUser ? 'bg-green-500/10 border-green-500/30' : ''}`}
                                                >
                                                    <TableCell className="font-medium text-center">
                                                        <div className="flex justify-center items-center h-full">
                                                            {getRankIcon(index)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-lg text-white">
                                                        {user.full_name || 'Anonymous'}
                                                        {isCurrentUser && <span className="ml-2 text-xs bg-green-500 px-2 py-1 rounded">{t('me_badge')}</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-lg text-cyan-300">
                                                        {(user.score || 0).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right text-gray-400">
                                                        {user.prediction_count || 0}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold">
                                                        {reward.cta > 0 && (
                                                            <div className="text-yellow-400">
                                                                {reward.cta} CTA
                                                                {reward.usdt > 0 && (
                                                                    <div className="text-green-400 text-sm">
                                                                        +{reward.usdt} USDT
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {reward.cta === 0 && <span className="text-gray-500">-</span>}
                                                    </TableCell>
                                                    {isAdmin && (
                                                        <TableCell className="text-center">
                                                           <AdminPointGiver user={user} onPointsGiven={fetchRankingsHybrid} />
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
