import React, { useState, useEffect } from 'react';
import { CatenaAirdrops, CatenaUsers } from '@/components/CatenaData';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Gift, Coins, ExternalLink, Clock, CheckCircle, Shield, AlertTriangle, Network, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { useWeb3Auth } from '@/components/Web3AuthProvider';
import { sendCTAToken, addCatenaToWallet, getCTABalance, CATENA_NETWORKS, copyNetworkInfo } from '@/components/CatenaBlockchain';
import { useTranslation } from '@/components/i18n';
import { ServerAPI } from '@/api/serverAPI';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

const AdminAirdropManager = ({ onAirdropCreated }) => {
    // 🔧 부동소수점 오류 수정: CTT 포인트 긔끔하게 표시하는 함수
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
    const { user: adminUser } = useWeb3Auth();
    const { t } = useTranslation();
    const [topUsers, setTopUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingTx, setIsSendingTx] = useState(false);
    const [isSendingCttOnly, setIsSendingCttOnly] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState(0);
    const [eventType, setEventType] = useState('manual');
    const [network, setNetwork] = useState('testnet');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [adminBalance, setAdminBalance] = useState(0);

    const fetchTopUsers = async () => {
        setIsLoading(true);
        try {
            console.log('[Airdrop] 🔍 사용자 목록 조회 시작...');
            
            // 🔥 백엔드에서 직접 사용자 데이터 가져오기 (localStorage 대신)
            const backendUsers = await ServerAPI.getAllUsers();
            
            if (backendUsers && backendUsers.length > 0) {
                console.log('[Airdrop] ✅ 백엔드에서 사용자 데이터 가져오기 성공:', backendUsers.length, '명');
                
                // 점수 순으로 정렬 (내림차순)
                const sortedUsers = backendUsers
                    .filter(user => user.score > 0) // 점수가 있는 사용자만
                    .sort((a, b) => Number(b.score) - Number(a.score))
                    .slice(0, 20); // 상위 20명
                
                console.log('[Airdrop] 📊 정렬된 사용자 목록:', sortedUsers.map(u => ({
                    name: u.full_name,
                    email: u.email,
                    score: u.score,
                    ctt_points: u.ctt_points
                })));
                
                setTopUsers(sortedUsers);
            } else {
                console.warn('[Airdrop] ⚠️ 백엔드 연결 실패 - localStorage 사용');
                
                // 백엔드 실패 시 기존 방식 사용
                const localUsers = await CatenaUsers.list('-score', 20);
                setTopUsers(localUsers);
            }
            
            // 관리자 잔액 조회
            if (adminUser?.wallet_address) {
                const balance = await getCTABalance(adminUser.wallet_address, network);
                setAdminBalance(balance);
            }
        } catch (error) {
            console.error('[Airdrop] ❌ 사용자 목록 조회 실패:', error);
            
            // 에러 시 기존 방식 사용
            try {
                const localUsers = await CatenaUsers.list('-score', 20);
                setTopUsers(localUsers);
            } catch (localError) {
                console.error('[Airdrop] ❌ 로컬 사용자 목록도 실패:', localError);
                setTopUsers([]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 🎯 CTT 포인트만 지급하는 함수 (블록체인 트랜잭션 없이) - 수정된 버전
    const handleCttPointsOnly = async () => {
        // 🔎 첫 번째 체크: 기본 입력 검증 및 디버깅
        console.log('🚀 [CTT Only] 함수 시작 - 기본 데이터 체크:');
        console.log('- selectedUser:', selectedUser);
        console.log('- amount:', amount);
        console.log('- selectedUser 상세:', {
            id: selectedUser?.id,
            full_name: selectedUser?.full_name,
            email: selectedUser?.email,
            score: selectedUser?.score,
            ctt_points: selectedUser?.ctt_points
        });
        
        if (!selectedUser || !amount) {
            const errorMsg = `수령자와 지급 수량을 입력해주세요.\n\n디버깅 정보:\n- selectedUser: ${selectedUser ? '있음' : '없음'}\n- amount: ${amount}`;
            alert(errorMsg);
            return;
        }
        
        // 🔎 두 번째 체크: 이메일 유효성 검증
        if (!selectedUser.email) {
            alert(`❌ 선택된 사용자에 이메일이 없습니다!\n\n사용자 데이터:\n- 이름: ${selectedUser.full_name}\n- ID: ${selectedUser.id}\n- 이메일: ${selectedUser.email || '없음'}`);
            return;
        }

        setIsSendingCttOnly(true);
        try {
            console.log(`[CTT Only] ${selectedUser.full_name}에게 ${amount} CTT 포인트 지급 시작...`);
            
            // 현재 사용자의 CTT 포인트 조회 및 업데이트
            const currentCttPoints = selectedUser.ctt_points || 0;
            let newCttPoints = currentCttPoints + Number(amount);
            
            console.log(`[CTT Only] CTT 포인트 업데이트:`, {
                user: selectedUser.full_name,
                email: selectedUser.email,
                previousCtt: currentCttPoints,
                addedAmount: Number(amount),
                newCttTotal: newCttPoints
            });
            
            // 1. 백엔드 데이터베이스에 CTT 포인트 업데이트
            console.log(`[CTT Only] 🎯 백엔드 API 호출 시작:`, {
                email: selectedUser.email,
                score: selectedUser.score || 0,
                newCttPoints,
                full_name: selectedUser.full_name
            });
            
            const backendUpdateResult = await ServerAPI.updateScore(
                selectedUser.email,
                selectedUser.score || 0,
                newCttPoints,
                selectedUser.full_name
            );

            if (backendUpdateResult) {
                console.log(`[CTT Only] ✅ 백엔드 CTT 포인트 업데이트 성공:`, backendUpdateResult);
                
                // 2. 🔥 중요: localStorage의 해당 사용자 데이터도 업데이트
                try {
                    console.log(`[CTT Only] 🔄 localStorage 동기화 시작...`);
                    
                    // localStorage에서 사용자 목록 가져오기
                    const rawUsers = localStorage.getItem('catena_users');
                    if (rawUsers) {
                        const users = JSON.parse(rawUsers);
                        
                        // 해당 사용자 찾기 및 업데이트
                        const userIndex = users.findIndex(u => u.email === selectedUser.email);
                        if (userIndex !== -1) {
                            users[userIndex].ctt_points = newCttPoints;
                            users[userIndex].updated_at = new Date().toISOString();
                            
                            // localStorage 업데이트
                            localStorage.setItem('catena_users', JSON.stringify(users));
                            
                            console.log(`[CTT Only] ✅ localStorage 동기화 성공:`, {
                                user: selectedUser.full_name,
                                newCttPoints: newCttPoints
                            });
                        } else {
                            console.warn(`[CTT Only] ⚠️ localStorage에서 사용자를 찾을 수 없음:`, selectedUser.email);
                        }
                    }
                } catch (localStorageError) {
                    console.error(`[CTT Only] ❌ localStorage 동기화 실패:`, localStorageError);
                    // localStorage 실패해도 백엔드는 성공했으므로 계속 진행
                }
                
                // 3. 로컬 에어드롭 기록에도 추가 (블록체인 트랜잭션 정보 없이)
                const newAirdrop = await CatenaAirdrops.create({
                    user_id: selectedUser.id,
                    amount: Number(amount),
                    rank: topUsers.findIndex(u => u.id === selectedUser.id) + 1,
                    event_type: eventType,
                    transaction_hash: null, // 블록체인 트랜잭션 없음
                    block_number: null,
                    gas_used: null,
                    network: 'database_only', // 데이터베이스만 업데이트
                    explorer_url: null,
                    status: 'completed',
                });
                
                onAirdropCreated(newAirdrop);
                
                setSelectedUser(null);
                setAmount(0);
                setDialogOpen(false);
                
                // 4. 🎉 성공 메시지 (실시간 반영 안내 포함)
                alert(`🎉 CTT 포인트가 성공적으로 지급되었습니다!\n\n📊 사용자: ${selectedUser.full_name}\n📧 이메일: ${selectedUser.email}\n💰 지급량: ${amount} CTT\n📈 새로운 CTT 포인트: ${newCttPoints}\n\n✅ 백엔드 데이터베이스: 즉시 반영\n✅ 사용자 localStorage: 즉시 동기화\n🔄 프로필 페이지에서 실시간 확인 가능`);
                
                // 5. 사용자 목록 새로고침
                await fetchTopUsers();
                
                // 6. 🚀 추가: 실시간 반영을 위한 브로드캐스트 이벤트 발생
                try {
                    // CustomEvent를 통해 다른 컴포넌트에 알림
                    const cttUpdateEvent = new CustomEvent('cttPointsUpdated', {
                        detail: {
                            userEmail: selectedUser.email,
                            newCttPoints: newCttPoints,
                            addedAmount: Number(amount)
                        }
                    });
                    window.dispatchEvent(cttUpdateEvent);
                    
                    console.log(`[CTT Only] 📡 실시간 업데이트 이벤트 발생:`, cttUpdateEvent.detail);
                } catch (eventError) {
                    console.error(`[CTT Only] ⚠️ 이벤트 발생 실패:`, eventError);
                }
                
            } else {
                console.error('[CTT Only] ❌ 백엔드 업데이트 대상 없음 - 결과 누락:', backendUpdateResult);
                throw new Error('백엔드 업데이트 결과가 없습니다. 서버 연결을 확인해주세요.');
            }

        } catch (error) {
            console.error('[CTT Only] 💥 CTT 포인트 지급 실패:', {
                error: error.message,
                stack: error.stack,
                selectedUser: selectedUser.email,
                amount: amount
            });
            
            // 사용자에게 더 상세한 에러 메시지 제공
            let errorMessage = `❌ CTT 포인트 지급 실패\n\n📊 사용자: ${selectedUser.full_name}\n📧 이메일: ${selectedUser.email}\n💰 지급 시도 수량: ${amount} CTT\n\n❌ 에러: ${error.message}`;
            
            // 네트워크 에러인 경우 추가 안내
            if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
                errorMessage += `\n\n🌐 네트워크 문제일 가능성:\n1. 백엔드 서버가 실행 중인지 확인해주세요\n2. http://localhost:3001 연결을 확인해주세요`;
            }
            
            errorMessage += `\n\n🔄 잠시 후 다시 시도해주세요.`;
            
            alert(errorMessage);
        } finally {
            setIsSendingCttOnly(false);
        }
    };

    // 기존 CTA 토큰 + CTT 포인트 지급 함수
    const handleCreateAirdrop = async () => {
        if (!selectedUser || !amount) {
             alert('수령자와 지급 수량을 입력해주세요.');
             return;
        }
        if (!selectedUser.wallet_address) {
            alert('선택된 유저의 지갑 주소가 없습니다.\n\nCTT 포인트만 지급하려면 "CTT 포인트만 지급" 버튼을 사용하세요.');
            return;
        }
        if (!adminUser?.private_key) {
            alert('관리자 개인키가 없습니다. 관리자 계정으로 로그인해주세요.');
            return;
        }

        setIsSendingTx(true);
        try {
            console.log(`Catena ${network} 네트워크에서 ${amount} CTA 토큰 전송 시작...`);
            
            // Catena 블록체인에 실제 토큰 전송
            const txResult = await sendCTAToken(
                selectedUser.wallet_address,
                amount,
                adminUser.private_key,
                network
            );

            // 백엔드 데이터베이스에 CTT 포인트 업데이트
            console.log(`[Airdrop] 백엔드 데이터베이스 CTT 포인트 업데이트 시작...`);
            
            const currentCttPoints = selectedUser.ctt_points || 0;
            let newCttPoints = currentCttPoints + Number(amount);
            
            const backendUpdateResult = await ServerAPI.updateScore(
                selectedUser.email,
                selectedUser.score || 0,
                newCttPoints,
                selectedUser.full_name
            );

            if (backendUpdateResult) {
                console.log(`[Airdrop] ✅ 백엔드 CTT 포인트 업데이트 성공:`, {
                    user: selectedUser.full_name,
                    previousCtt: currentCttPoints,
                    addedAmount: amount,
                    newCttTotal: newCttPoints
                });
                
                // 🔥 중요: localStorage의 해당 사용자 데이터도 업데이트
                try {
                    console.log(`[Airdrop] 🔄 localStorage 동기화 시작...`);
                    
                    const rawUsers = localStorage.getItem('catena_users');
                    if (rawUsers) {
                        const users = JSON.parse(rawUsers);
                        const userIndex = users.findIndex(u => u.email === selectedUser.email);
                        if (userIndex !== -1) {
                            users[userIndex].ctt_points = newCttPoints;
                            users[userIndex].updated_at = new Date().toISOString();
                            localStorage.setItem('catena_users', JSON.stringify(users));
                            
                            console.log(`[Airdrop] ✅ localStorage 동기화 성공`);
                        }
                    }
                } catch (localStorageError) {
                    console.error(`[Airdrop] ❌ localStorage 동기화 실패:`, localStorageError);
                }
                
            } else {
                console.warn(`[Airdrop] ⚠️ 백엔드 CTT 포인트 업데이트 실패 - 로컬에만 기록됨`);
                newCttPoints = currentCttPoints; // 로드백 방지
            }

            // 블록체인 트랜잭션 성공 후 앱 데이터베이스에 기록
            const newAirdrop = await CatenaAirdrops.create({
                user_id: selectedUser.id,
                amount: Number(amount),
                rank: topUsers.findIndex(u => u.id === selectedUser.id) + 1,
                event_type: eventType,
                transaction_hash: txResult.hash,
                block_number: txResult.blockNumber,
                gas_used: txResult.gasUsed,
                network: network,
                explorer_url: txResult.explorerUrl,
                status: 'completed',
            });
            
            onAirdropCreated(newAirdrop);
            
            // 관리자 잔액 업데이트
            const newBalance = await getCTABalance(adminUser.wallet_address, network);
            setAdminBalance(newBalance);
            
            setSelectedUser(null);
            setAmount(0);
            setDialogOpen(false);
            
            // 성공 메시지 개선
            alert(`🎉 CTA 토큰 + CTT 포인트가 성공적으로 지급되었습니다!\n\n📊 사용자: ${selectedUser.full_name}\n💰 지급량: ${amount} CTA + ${amount} CTT\n🔗 트랜잭션: ${txResult.hash}\n📈 새로운 CTT 포인트: ${newCttPoints}\n\n✅ 블록체인: 트랜잭션 완료\n✅ 백엔드 데이터베이스: 즉시 반영\n✅ 사용자 localStorage: 즉시 동기화\n\n익스플로러에서 확인하세요.`);

            // 🚀 실시간 반영을 위한 브로드캐스트 이벤트 발생
            try {
                const cttUpdateEvent = new CustomEvent('cttPointsUpdated', {
                    detail: {
                        userEmail: selectedUser.email,
                        newCttPoints: newCttPoints,
                        addedAmount: Number(amount)
                    }
                });
                window.dispatchEvent(cttUpdateEvent);
                
                console.log(`[Airdrop] 📡 실시간 업데이트 이벤트 발생 (CTA+CTT):`, cttUpdateEvent.detail);
            } catch (eventError) {
                console.error(`[Airdrop] ⚠️ 이벤트 발생 실패:`, eventError);
            }

        } catch (error) {
            console.error('Failed to create airdrop:', error);
            alert('에어드롭 지급 실패: ' + error.message);
        } finally {
            setIsSendingTx(false);
        }
    };

    const handleAddNetwork = async () => {
        try {
            await addCatenaToWallet(network);
            alert(`${CATENA_NETWORKS[network].name} 네트워크가 지갑에 추가되었습니다!`);
        } catch (error) {
            console.error('Network add error:', error);
            alert(`네트워크 추가 실패: ${error.message}\n\n수동으로 추가하려면 네트워크 정보 복사 버튼을 사용하세요.`);
        }
    };

    const handleCopyNetworkInfo = () => {
        try {
            copyNetworkInfo(network);
            alert('네트워크 정보가 클립보드에 복사되었습니다!\n메타마스크에서 수동으로 네트워크를 추가할 수 있습니다.');
        } catch (error) {
            alert('클립보드 복사에 실패했습니다.');
        }
    };
    
    return (
        <Card className="bg-gradient-to-br from-indigo-800 to-purple-900 border-indigo-600">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-yellow-300 flex items-center gap-2">
                    <Shield className="w-6 h-6" />
                    {t('admin_real_token_distribution')}
                </CardTitle>
                <p className="text-gray-300 text-sm">
                    {t('blockchain_sending_description')} • {t('current_balance')}: {adminBalance} CTA
                </p>
                <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded border border-green-500/30">
                    🔄 <strong>동기화 개선:</strong> CTT 포인트 지급 시 백엔드 데이터베이스도 자동 업데이트됩니다.
                    <br />
                    ⚡ <strong>신규 기능:</strong> 블록체인 트랜잭션 없이 CTT 포인트만 지급 가능합니다.
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <Label htmlFor="network">{t('network')}</Label>
                        <Select value={network} onValueChange={setNetwork}>
                            <SelectTrigger id="network">
                                <SelectValue placeholder={t('network')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="testnet">
                                    🧪 {t('catena_testnet')}
                                </SelectItem>
                                <SelectItem value="mainnet">
                                    🏢 {t('catena_mainnet')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleAddNetwork} variant="outline" className="w-full text-xs">
                            <Network className="w-3 h-3 mr-1" />
                            {t('auto_add')}
                        </Button>
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleCopyNetworkInfo} variant="outline" className="w-full text-xs">
                            📋 {t('network_info_copy')}
                        </Button>
                    </div>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={fetchTopUsers} className="w-full">
                            {isLoading ? '랭커 불러오는 중...' : t('select_recipient')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>에어드롭 대상 선택</DialogTitle>
                            <DialogDescription>상위 20명의 유저 목록입니다.</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-80 overflow-y-auto">
                            {topUsers.length === 0 && !isLoading ? (
                                <p className="text-gray-400 text-center">불러올 유저가 없습니다.</p>
                            ) : (
                                topUsers.map((user, index) => (
                                    <div
                                        key={user.id}
                                        className={`p-3 my-1 rounded-lg cursor-pointer ${selectedUser?.id === user.id ? 'bg-cyan-500/20' : 'hover:bg-gray-700'}`}
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setDialogOpen(false);
                                        }}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold">{index + 1}위. {user.full_name}</span>
                                            <span className="text-sm text-gray-400">{t('score')}: {user.score}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-mono">
                                                {user.wallet_address || '지갑 주소 없음'}
                                            </span>
                                            <span className="text-yellow-400">
                                                CTT: {formatCttPoints(user.ctt_points || 0)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{user.email}</p>
                                    </div>
                                ))
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>닫기</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {selectedUser && (
                    <div className="p-3 bg-cyan-500/10 rounded border border-cyan-500/30">
                        <p className="text-center text-cyan-300 font-bold">
                            선택된 유저: {selectedUser.full_name}
                        </p>
                        <p className="text-xs text-gray-400 text-center">{selectedUser.email}</p>
                        <p className="text-xs text-gray-400 text-center font-mono">
                            {selectedUser.wallet_address || '지갑 주소 없음'}
                        </p>
                        <p className="text-xs text-yellow-400 text-center">
                            현재 CTT 포인트: {formatCttPoints(selectedUser.ctt_points || 0)} → 지급 후: {formatCttPoints((selectedUser.ctt_points || 0) + Number(amount || 0))}
                        </p>
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="amount">{t('distribution_amount')} (CTT)</Label>
                        <Input 
                            id="amount" 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(Number(e.target.value))} 
                            placeholder="e.g. 90" 
                            min="0.1"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="eventType">{t('event_type')}</Label>
                        <Select value={eventType} onValueChange={setEventType}>
                            <SelectTrigger id="eventType">
                                <SelectValue placeholder="선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manual">{t('manual_distribution')}</SelectItem>
                                <SelectItem value="special">{t('special_event')}</SelectItem>
                                <SelectItem value="weekly">{t('weekly_reward')}</SelectItem>
                                <SelectItem value="monthly">{t('monthly_reward')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="text-xs text-gray-400 p-2 bg-gray-800/50 rounded">
                    <p className="text-gray-300">🔗 <strong>{t('network')}:</strong> {CATENA_NETWORKS[network].name}</p>
                    <p className="text-gray-300">⛽ <strong>{t('estimated_gas')}:</strong> ~0.001 CTA</p>
                    <p className="text-gray-300">🌐 <strong>RPC:</strong> {CATENA_NETWORKS[network].rpcUrl}</p>
                    <p className="text-green-300">💾 <strong>데이터베이스:</strong> 백엔드 자동 동기화</p>
                </div>
            </CardContent>
            <CardFooter className="grid grid-cols-1 gap-2">
                {/* CTT 포인트만 지급 버튼 (신규) */}
                <Button 
                    onClick={handleCttPointsOnly} 
                    disabled={!selectedUser || amount <= 0 || isSendingCttOnly} 
                    className="w-full bg-green-600 text-white hover:bg-green-700"
                >
                    {isSendingCttOnly ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            CTT 포인트 지급 중...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            💎 {amount} CTT 포인트만 지급 (즉시 반영)
                        </div>
                    )}
                </Button>
                
                {/* 기존 CTA + CTT 동시 지급 버튼 */}
                <Button 
                    onClick={handleCreateAirdrop} 
                    disabled={!selectedUser || amount <= 0 || isSendingTx || !selectedUser?.wallet_address} 
                    className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                >
                    {isSendingTx ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                            {t('blockchain_sending')}
                        </div>
                    ) : (
                        `🚀 ${amount} CTA 토큰 + CTT 포인트 지급 (${network})`
                    )}
                </Button>
                
                {selectedUser && !selectedUser.wallet_address && (
                    <p className="text-xs text-yellow-400 text-center">
                        ⚠️ 지갑 주소가 없어 CTA 토큰 지급 불가 (CTT 포인트만 지급 가능)
                    </p>
                )}
            </CardFooter>
        </Card>
    );
};

export default function AirdropPage() {
    const [airdrops, setAirdrops] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user: currentUser } = useWeb3Auth();
    const { t } = useTranslation();
    const [stats, setStats] = useState({
        totalReceived: 0,
        pendingAmount: 0,
        completedCount: 0
    });
    const [isAdmin, setIsAdmin] = useState(false);

    const updateStats = (data) => {
        const totalReceived = data
            .filter(a => a.status === 'completed')
            .reduce((sum, a) => sum + a.amount, 0);
        const pendingAmount = data
            .filter(a => a.status === 'pending')
            .reduce((sum, a) => sum + a.amount, 0);
        const completedCount = data.filter(a => a.status === 'completed').length;
        setStats({ totalReceived, pendingAmount, completedCount });
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (currentUser) {
                setIsAdmin(currentUser.role === 'admin');
                const userAirdrops = await CatenaAirdrops.filter({ user_id: currentUser.id }, '-created_date');
                setAirdrops(userAirdrops);
                updateStats(userAirdrops);
            } else {
                setAirdrops([]);
                updateStats([]);
            }
        } catch (error) {
            console.error('Failed to fetch airdrop data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentUser]);

    const handleAirdropCreated = (newAirdrop) => {
        if (newAirdrop.user_id === currentUser?.id) {
            fetchData();
        }
    };
    
    const getStatusBadge = (status) => {
        const variants = {
            completed: { variant: 'default', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
            pending: { variant: 'secondary', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
            failed: { variant: 'destructive', className: 'bg-red-500/20 text-red-400 border-red-500/30' }
        };
        return variants[status] || variants.pending;
    };

    const getEventTypeLabel = (type) => {
        const labels = {
            weekly: t('weekly_reward'),
            monthly: t('monthly_reward'),
            special: t('special_event'),
            manual: t('manual_distribution')
        };
        return labels[type] || type;
    };

    const getNetworkBadge = (network) => {
        if (network === 'mainnet') return `🏢 ${t('catena_mainnet')}`;
        if (network === 'testnet') return `🧪 ${t('catena_testnet')}`;
        if (network === 'database_only') return `💾 Database Only`;
        return '🔗 Unknown';
    };

    const getStatusText = (status) => {
        if (status === 'completed') return t('completed');
        if (status === 'pending') return t('pending');
        if (status === 'failed') return t('failed');
        return status;
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-cyan-400 mb-2">{t('cta_airdrop')}</h1>
                    <p className="text-gray-400">{t('catena_airdrop_description')}</p>
                </div>

                {isAdmin && <AdminAirdropManager onAirdropCreated={handleAirdropCreated} />}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <Card className="bg-gradient-to-br from-green-600 to-emerald-700 text-white border-0">
                        <CardContent className="p-6 text-center">
                            <Coins className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-3xl font-bold">{stats.totalReceived.toLocaleString()}</p>
                            <p className="text-sm opacity-90">{t('total_received_cta')}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-yellow-600 to-orange-700 text-white border-0">
                        <CardContent className="p-6 text-center">
                            <Clock className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-3xl font-bold">{stats.pendingAmount.toLocaleString()}</p>
                            <p className="text-sm opacity-90">{t('pending_cta')}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-600 to-pink-700 text-white border-0">
                        <CardContent className="p-6 text-center">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-3xl font-bold">{stats.completedCount}</p>
                            <p className="text-sm opacity-90">{t('completed_airdrops')}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="bg-gray-800/50 border-gray-700 shadow-2xl shadow-cyan-500/10">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-cyan-400">{t('my_airdrop_history')}</CardTitle>
                        <p className="text-gray-400 text-sm">{t('catena_real_tokens')}</p>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-700">
                                        <TableHead className="text-gray-400">{t('date')}</TableHead>
                                        <TableHead className="text-gray-400">{t('event_type')}</TableHead>
                                        <TableHead className="text-gray-400">{t('network')}</TableHead>
                                        <TableHead className="text-right text-gray-400">{t('amount')}</TableHead>
                                        <TableHead className="text-center text-gray-400">{t('status')}</TableHead>
                                        <TableHead className="text-center text-gray-400">{t('transaction_hash')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array(3).fill(0).map((_, i) => (
                                            <TableRow key={i} className="border-gray-700">
                                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : airdrops.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                                                {t('no_airdrop_history')}<br/>
                                                <span className="text-sm">{t('participate_game_for_cta')}</span>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        airdrops.map((airdrop) => {
                                            const statusBadge = getStatusBadge(airdrop.status);
                                            return (
                                                <TableRow key={airdrop.id} className="border-gray-700 hover:bg-gray-800">
                                                    <TableCell className="font-medium">
                                                        {format(new Date(airdrop.created_date), 'yyyy-MM-dd HH:mm')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                                                            {getEventTypeLabel(airdrop.event_type)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                                                            {getNetworkBadge(airdrop.network)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-green-400">
                                                        {airdrop.amount} CTT
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge className={statusBadge.className}>
                                                            {getStatusText(airdrop.status)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {airdrop.transaction_hash ? (
                                                            <a
                                                                href={airdrop.explorer_url || `${CATENA_NETWORKS[airdrop.network || 'testnet'].explorerUrl}/tx/${airdrop.transaction_hash}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center"
                                                                title={`블록 ${airdrop.block_number || 'Unknown'} | 가스 ${airdrop.gas_used || 'Unknown'}`}
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-500">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                 <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <AlertTriangle className="w-8 h-8 text-yellow-400" />
                        <div>
                            <CardTitle className="text-xl font-bold text-yellow-400">{t('catena_blockchain_guide')}</CardTitle>
                            <p className="text-sm text-gray-400">
                                {t('catena_guide_description')}
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20">
                                <h4 className="font-bold text-blue-400 mb-2">🧪 {t('catena_testnet_info')}</h4>
                                <p className="text-gray-300">Chain ID: 9000 (0x2328)</p>
                                <p className="text-gray-300">RPC: consensus.testnet.cvm.creatachain.com</p>
                            </div>
                            <div className="p-3 bg-green-500/10 rounded border border-green-500/20">
                                <h4 className="font-bold text-green-400 mb-2">🏢 {t('catena_mainnet_info')}</h4>
                                <p className="text-gray-300">Chain ID: 1000 (0x3E8)</p>
                                <p className="text-gray-300">RPC: cvm.node.creatachain.com</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}