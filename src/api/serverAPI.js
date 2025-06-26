// 백엔드 서버 API 연동 함수들
// 프론트엔드 기존 코드는 절대 건드리지 않고, 새로운 API 호출 함수만 추가

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// 유틸리티 함수들
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options
    };

    try {
        const response = await fetch(url, defaultOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error(`API Request Error [${endpoint}]:`, error);
        // 서버 연결 실패 시 null 반환 (하이브리드 모드)
        return null;
    }
};

// 백엔드 API 함수들
export const ServerAPI = {
    // 서버 상태 확인
    async checkHealth() {
        console.log('[ServerAPI] 서버 상태 확인...');
        const result = await apiRequest('/health');
        if (result) {
            console.log('[ServerAPI] 서버 연결 성공:', result.message);
            return true;
        } else {
            console.log('[ServerAPI] 서버 연결 실패, 로컬 모드로 전환');
            return false;
        }
    },

    // 사용자 등록/로그인
    async registerUser(userData) {
        console.log('[ServerAPI] 사용자 등록/로그인:', userData.email);
        
        const result = await apiRequest('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (result && result.success) {
            console.log('[ServerAPI] 사용자 등록/로그인 성공:', {
                email: result.user.email,
                isNewUser: result.isNewUser
            });
            return result.user;
        }
        
        return null;
    },

    // 점수 업데이트
    async updateScore(email, score, ctt_points, full_name) {
        console.log('[ServerAPI] 🎯 점수 업데이트 시작:', { email, score, ctt_points, full_name });
        
        try {
            const result = await apiRequest('/update-score', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    score: Number(score),
                    ctt_points: Number(ctt_points),
                    full_name
                })
            });

            if (result && result.success) {
                console.log('[ServerAPI] ✅ 점수 업데이트 성공:', {
                    email: result.user.email,
                    score: result.user.score,
                    ctt_points: result.user.ctt_points,
                    newRank: result.newRank
                });
                return {
                    user: result.user,
                    newRank: result.newRank
                };
            } else {
                console.error('[ServerAPI] ❌ 점수 업데이트 응답 실패:', result);
                throw new Error(result?.error || '서버 응답이 올바르지 않습니다.');
            }
        } catch (error) {
            console.error('[ServerAPI] 💥 점수 업데이트 에러:', {
                error: error.message,
                email,
                score,
                ctt_points
            });
            throw error; // 에러를 다시 던져서 호출하는 곳에서 처리할 수 있도록
        }
    },

    // 랭킹 조회
    async getRankings() {
        console.log('[ServerAPI] 랭킹 조회...');
        
        const result = await apiRequest('/rankings');

        if (result && result.success) {
            console.log('[ServerAPI] 랭킹 조회 성공:', {
                count: result.count,
                topUser: result.data[0]?.full_name || 'None'
            });
            return result.data;
        }
        
        return null;
    },

    // 전체 사용자 조회 (관리자용)
    async getAllUsers() {
        console.log('[ServerAPI] 전체 사용자 조회 (관리자용)...');
        
        const result = await apiRequest('/admin/users');

        if (result && result.success) {
            console.log('[ServerAPI] 전체 사용자 조회 성공:', {
                count: result.count
            });
            return result.users;
        }
        
        return null;
    },

    // 🗑️ 개별 사용자 삭제 (관리자용)
    async deleteUser(userId) {
        console.log('[ServerAPI] 사용자 삭제:', userId);
        
        const result = await apiRequest(`/admin/users/${userId}`, {
            method: 'DELETE'
        });

        if (result && result.success) {
            console.log('[ServerAPI] 사용자 삭제 성공:', {
                deletedUser: result.deletedUser.full_name
            });
            return result;
        }
        
        return null;
    },

    // 🧹 테스트 사용자 일괄 삭제 (관리자용)
    async cleanupTestUsers() {
        console.log('[ServerAPI] 테스트 사용자 일괄 삭제...');
        
        const result = await apiRequest('/admin/cleanup-test-users', {
            method: 'DELETE'
        });

        if (result && result.success) {
            console.log('[ServerAPI] 테스트 사용자 정리 성공:', {
                deletedCount: result.deletedCount,
                remainingCount: result.remainingCount
            });
            return result;
        }
        
        return null;
    }
};

// 하이브리드 데이터 관리자 (개선된 버전)
export const HybridDataManager = {
    // 서버 연결 상태
    isServerConnected: false,
    
    // 데이터 캐시
    lastServerData: null,
    lastServerCheck: 0,
    cacheTimeout: 10000, // 10초 캐시

    // 서버 연결 상태 확인 및 설정
    async checkServerConnection() {
        this.isServerConnected = await ServerAPI.checkHealth();
        console.log('[HybridDataManager] 서버 연결 상태:', this.isServerConnected ? '연결됨' : '끊어짐');
        return this.isServerConnected;
    },

    // 강화된 하이브리드 랭킹 조회 (서버 우선, 일관성 보장)
    async hybridGetRankings(localGetRankingsFn) {
        console.log('[HybridDataManager] 🔄 강제 서버 모드 랭킹 조회 시작');
        
        const now = Date.now();
        
        // 🔧 강제 서버 모드: 항상 서버 데이터 우선 사용
        const isConnected = await this.checkServerConnection();
        
        if (isConnected) {
            console.log('[HybridDataManager] 🔄 서버 연결됨 - 서버 데이터 우선 사용');
            const serverRankings = await ServerAPI.getRankings();
            if (serverRankings && serverRankings.length > 0) {
                this.lastServerData = serverRankings;
                this.lastServerCheck = now;
                console.log('[HybridDataManager] ✅ 서버 데이터 사용 (강제 모드):', {
                    count: serverRankings.length,
                    topUsers: serverRankings.slice(0, 3).map(u => ({ name: u.full_name, score: u.score, rank: u.rank }))
                });
                return {
                    data: serverRankings,
                    source: 'server',
                    isRealtime: true,
                    timestamp: new Date().toISOString()
                };
            } else {
                console.log('[HybridDataManager] ⚠️ 서버 연결됨but 데이터 없음');
            }
        }

        // 3. 캐시된 서버 데이터 사용 (10초 이내)
        if (this.lastServerData && (now - this.lastServerCheck) < this.cacheTimeout) {
            console.log('[HybridDataManager] 📋 캐시된 서버 데이터 사용');
            return {
                data: this.lastServerData,
                source: 'server-cache',
                isRealtime: false,
                timestamp: new Date(this.lastServerCheck).toISOString()
            };
        }

        // 4. 마지막 수단으로 로컬 데이터 사용
        console.log('[HybridDataManager] 💾 로컬 데이터 사용 (마지막 수단)');
        const localRankings = await localGetRankingsFn();
        return {
            data: localRankings,
            source: 'local',
            isRealtime: false,
            timestamp: new Date().toISOString()
        };
    },

    // 강제 서버 데이터 새로고침
    async forceServerRefresh() {
        console.log('[HybridDataManager] 🔄 강제 서버 데이터 새로고침');
        this.lastServerData = null;
        this.lastServerCheck = 0;
        
        // 강제 서버 연결 체크
        const isConnected = await this.checkServerConnection();
        
        if (isConnected) {
            console.log('[HybridDataManager] 🎆 서버 연결 확인됨 - 새로운 데이터 요청');
            const serverRankings = await ServerAPI.getRankings();
            if (serverRankings && serverRankings.length > 0) {
                this.lastServerData = serverRankings;
                this.lastServerCheck = Date.now();
                
                console.log('🎉 [ForceRefresh] 서버 데이터 새로고침 성공:', {
                    count: serverRankings.length,
                    ranking: serverRankings.map((u, i) => `${i+1}위: ${u.full_name}(${u.score}점)`)
                });
                
                return serverRankings;
            } else {
                console.log('⚠️ [ForceRefresh] 서버 연결되었지만 데이터 없음');
            }
        } else {
            console.log('❌ [ForceRefresh] 서버 연결 실패');
        }
        return null;
    },

    // 하이브리드 사용자 등록 (로컬 + 서버)
    async hybridRegisterUser(userData, localUserCreateFn) {
        console.log('[HybridDataManager] 하이브리드 사용자 등록 시작');
        
        // 1. 서버 우선 등록
        if (this.isServerConnected) {
            const serverUser = await ServerAPI.registerUser(userData);
            if (serverUser) {
                console.log('[HybridDataManager] ✅ 서버 사용자 등록 성공');
                // 캐시 무효화
                this.lastServerData = null;
                return serverUser;
            }
        }

        // 2. 서버 실패 시 로컬 등록
        console.log('[HybridDataManager] 💾 로컬 사용자 등록');
        const localUser = localUserCreateFn(userData);
        return localUser;
    },

    // 하이브리드 점수 업데이트 (로컬 + 서버)
    async hybridUpdateScore(email, score, ctt_points, full_name, localUpdateFn) {
        console.log('[HybridDataManager] 하이브리드 점수 업데이트 시작');
        
        // 1. 서버 우선 업데이트
        if (this.isServerConnected) {
            const serverResult = await ServerAPI.updateScore(email, score, ctt_points, full_name);
            if (serverResult) {
                console.log('[HybridDataManager] ✅ 서버 점수 업데이트 성공, 랭킹:', serverResult.newRank);
                // 캐시 무효화
                this.lastServerData = null;
                return serverResult;
            }
        }

        // 2. 서버 실패 시 로컬 업데이트
        console.log('[HybridDataManager] 💾 로컬 점수 업데이트');
        const localResult = await localUpdateFn(email, score, ctt_points, full_name);
        return localResult;
    }
};

// 백엔드 서버 연결 상태 모니터링 (개선된 버전)
export const ServerConnectionMonitor = {
    // 연결 상태 체크 간격 (60초로 증가 - API 부하 감소)
    checkInterval: 60000,
    intervalId: null,
    onStatusChangeCallback: null,

    // 연결 상태 모니터링 시작
    startMonitoring(onStatusChange) {
        console.log('[ServerConnectionMonitor] 🚀 실시간 모니터링 시작 (5초 간격)');
        
        this.onStatusChangeCallback = onStatusChange;
        
        // 즉시 한 번 체크
        this.checkConnection();
        
        // 5초마다 정기적으로 체크
        this.intervalId = setInterval(() => {
            this.checkConnection();
        }, this.checkInterval);
    },

    // 연결 상태 모니터링 중지
    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[ServerConnectionMonitor] ⏹️ 모니터링 중지');
        }
    },

    // 연결 상태 체크 (개선된 버전)
    async checkConnection() {
        const previousState = HybridDataManager.isServerConnected;
        const isConnected = await HybridDataManager.checkServerConnection();
        
        // 연결 상태가 변경되었을 때만 콜백 호출
        if (isConnected !== previousState || this.onStatusChangeCallback) {
            console.log('[ServerConnectionMonitor] 🔄 연결 상태 변경:', isConnected ? '서버 모드' : '로컬 모드');
            
            if (this.onStatusChangeCallback) {
                this.onStatusChangeCallback({
                    isConnected,
                    timestamp: new Date().toISOString(),
                    mode: isConnected ? 'server' : 'local',
                    changed: isConnected !== previousState
                });
            }
        }
    },

    // 수동 새로고침
    async manualRefresh() {
        console.log('[ServerConnectionMonitor] 🔄 수동 새로고침');
        await this.checkConnection();
        if (HybridDataManager.isServerConnected) {
            await HybridDataManager.forceServerRefresh();
        }
    }
};

// 📊 강화된 점수 동기화 시스템
export const BulkScoreSync = {
    // localStorage에서 백엔드로 모든 사용자 점수 동기화
    async syncAllScoresToBackend() {
        console.log('🔄 [BulkSync] localStorage → 백엔드 점수 동기화 시작');
        
        try {
            // 1. localStorage에서 모든 사용자 데이터 가져오기
            const rawUsers = localStorage.getItem('catena_users');
            if (!rawUsers) {
                console.log('⚠️ [BulkSync] localStorage에 사용자 데이터 없음');
                return { success: false, message: 'No local data found' };
            }
            
            const localUsers = JSON.parse(rawUsers);
            console.log('📋 [BulkSync] localStorage 사용자 수:', localUsers.length);
            
            // 2. 점수가 있는 사용자만 필터링
            const usersWithScores = localUsers.filter(user => 
                user.email && (user.score > 0 || user.ctt_points > 0)
            );
            
            console.log('📊 [BulkSync] 점수가 있는 사용자:', usersWithScores.length, '명');
            console.log('🏆 [BulkSync] 점수 현황:', usersWithScores.map(u => ({
                name: u.full_name,
                email: u.email,
                score: u.score,
                ctt_points: u.ctt_points
            })));
            
            // 3. 각 사용자별로 백엔드에 점수 업데이트
            const syncResults = [];
            let successCount = 0;
            let failCount = 0;
            
            for (const user of usersWithScores) {
                try {
                    // 먼저 사용자 등록/확인
                    // 먼저 사용자 등록/확인
                    await ServerAPI.registerUser({
                        id: user.id,
                        full_name: user.full_name,
                        email: user.email,
                        walletAddress: user.walletAddress || '',
                        score: user.score || 0,
                        ctt_points: user.ctt_points || 0,
                        is_admin: user.is_admin || false
                    });
                    
                    // 점수 업데이트
                    const scoreResult = await ServerAPI.updateScore(
                        user.email,
                        user.score || 0,
                        user.ctt_points || 0,
                        user.full_name
                    );
                    
                    if (scoreResult) {
                        successCount++;
                        syncResults.push({
                            email: user.email,
                            name: user.full_name,
                            score: user.score,
                            status: 'success',
                            newRank: scoreResult.newRank
                        });
                        console.log(`✅ [BulkSync] ${user.full_name} 동기화 성공 (점수: ${user.score})`);
                    } else {
                        failCount++;
                        syncResults.push({
                            email: user.email,
                            name: user.full_name,
                            score: user.score,
                            status: 'failed'
                        });
                        console.log(`❌ [BulkSync] ${user.full_name} 동기화 실패`);
                    }
                    
                } catch (error) {
                    failCount++;
                    syncResults.push({
                        email: user.email,
                        name: user.full_name,
                        score: user.score,
                        status: 'error',
                        error: error.message
                    });
                    console.error(`💥 [BulkSync] ${user.full_name} 동기화 오류:`, error);
                }
                
                // API 부하 방지를 위한 딜레이
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const summary = {
                success: true,
                totalUsers: usersWithScores.length,
                successCount,
                failCount,
                results: syncResults
            };
            
            console.log('🎉 [BulkSync] 대량 동기화 완료:', {
                총사용자: summary.totalUsers,
                성공: summary.successCount,
                실패: summary.failCount
            });
            
            return summary;
            
        } catch (error) {
            console.error('💥 [BulkSync] 대량 동기화 오류:', error);
            return {
                success: false,
                error: error.message,
                totalUsers: 0,
                successCount: 0,
                failCount: 0
            };
        }
    },

    // 🎯 단일 사용자 점수 강제 동기화
    async forceSyncUserScore(userEmail) {
        console.log('🎯 [ForceSync] 단일 사용자 점수 동기화:', userEmail);
        
        try {
            // localStorage에서 해당 사용자 찾기
            const rawUsers = localStorage.getItem('catena_users');
            if (!rawUsers) return { success: false, message: 'No local data' };
            
            const localUsers = JSON.parse(rawUsers);
            const localUser = localUsers.find(u => u.email === userEmail);
            
            if (!localUser) {
                return { success: false, message: 'User not found in localStorage' };
            }
            
            // 백엔드에 강제 동기화
            const result = await ServerAPI.updateScore(
                localUser.email,
                localUser.score || 0,
                localUser.ctt_points || 0,
                localUser.full_name
            );
            
            if (result) {
                console.log(`✅ [ForceSync] ${localUser.full_name} 동기화 성공`);
                return {
                    success: true,
                    user: localUser,
                    newRank: result.newRank
                };
            } else {
                console.log(`❌ [ForceSync] ${localUser.full_name} 동기화 실패`);
                return { success: false, message: 'Backend sync failed' };
            }
            
        } catch (error) {
            console.error('💥 [ForceSync] 단일 동기화 오류:', error);
            return { success: false, error: error.message };
        }
    }
};

// 📊 동기화 상태 모니터링
export const SyncStatusMonitor = {
    // 동기화 상태 체크
    async checkSyncStatus() {
        console.log('🔍 [SyncCheck] 동기화 상태 확인');
        
        try {
            // 1. 로컬 데이터 분석
            const rawLocalUsers = localStorage.getItem('catena_users');
            const localUsers = rawLocalUsers ? JSON.parse(rawLocalUsers) : [];
            const localUsersWithScores = localUsers.filter(u => u.score > 0);
            
            // 2. 백엔드 데이터 분석
            const backendUsers = await ServerAPI.getAllUsers() || [];
            const backendUsersWithScores = backendUsers.filter(u => u.score > 0);
            
            // 3. 불일치 분석
            const syncIssues = [];
            for (const localUser of localUsersWithScores) {
                const backendUser = backendUsers.find(bu => bu.email === localUser.email);
                if (!backendUser) {
                    syncIssues.push({
                        type: 'missing_in_backend',
                        user: localUser.full_name,
                        email: localUser.email,
                        localScore: localUser.score
                    });
                } else if (backendUser.score !== localUser.score) {
                    syncIssues.push({
                        type: 'score_mismatch',
                        user: localUser.full_name,
                        email: localUser.email,
                        localScore: localUser.score,
                        backendScore: backendUser.score
                    });
                }
            }
            
            const status = {
                localUsersTotal: localUsers.length,
                localUsersWithScores: localUsersWithScores.length,
                backendUsersTotal: backendUsers.length,
                backendUsersWithScores: backendUsersWithScores.length,
                syncIssues: syncIssues.length,
                issues: syncIssues,
                isSynced: syncIssues.length === 0
            };
            
            console.log('📊 [SyncCheck] 동기화 상태:', status);
            return status;
            
        } catch (error) {
            console.error('💥 [SyncCheck] 상태 확인 오류:', error);
            return {
                error: error.message,
                isSynced: false
            };
        }
    }
};

// 🔄 Keep-Alive 시스템 (Render.com 슬립 방지)
export const KeepAliveManager = {
    intervalId: null,
    isRunning: false,
    wakeUpAttempts: 0,
    maxWakeUpAttempts: 3,
    
    // Keep-alive 시스템 시작 (10분 간격)
    start() {
        if (this.isRunning) {
            console.log('[KeepAlive] 이미 실행 중입니다.');
            return;
        }
        
        console.log('🚀 [KeepAlive] 서버 슬립 방지 시스템 시작 (10분 간격)');
        
        // 즉시 한 번 실행
        this.pingServer();
        
        // 10분(600초)마다 ping
        this.intervalId = setInterval(() => {
            this.pingServer();
        }, 10 * 60 * 1000); // 10분
        
        this.isRunning = true;
    },
    
    // Keep-alive 시스템 중지
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('⏹️ [KeepAlive] 시스템 중지');
        }
    },
    
    // 서버 핑 (슬립 방지)
    async pingServer() {
        try {
            console.log('📡 [KeepAlive] 서버 핑 전송...');
            const startTime = Date.now();
            
            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                // 타임아웃 설정 (60초)
                signal: AbortSignal.timeout(60000)
            });
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            if (response.ok) {
                console.log(`✅ [KeepAlive] 서버 응답 성공 (${responseTime}ms)`);
                this.wakeUpAttempts = 0; // 성공 시 재시도 카운터 리셋
                return true;
            } else {
                console.log(`⚠️ [KeepAlive] 서버 응답 오류: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ [KeepAlive] 서버 핑 실패:`, error.message);
            return false;
        }
    },
    
    // 서버 강제 깨우기 (슬립 상태에서 복구)
    async wakeUpServer() {
        console.log('🏃‍♂️ [KeepAlive] 서버 강제 깨우기 시도...');
        this.wakeUpAttempts++;
        
        try {
            // 첫 번째 요청: 서버를 깨우기 위한 요청 (타임아웃 60초)
            console.log('📡 [WakeUp] 1차 깨우기 요청 (60초 대기)...');
            const wakeUpResponse = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(60000)
            });
            
            if (wakeUpResponse.ok) {
                console.log('✅ [WakeUp] 서버 깨우기 성공!');
                this.wakeUpAttempts = 0;
                return true;
            }
            
            // 실패 시 재시도
            if (this.wakeUpAttempts < this.maxWakeUpAttempts) {
                console.log(`🔄 [WakeUp] ${this.wakeUpAttempts}/${this.maxWakeUpAttempts} 재시도...`);
                await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기
                return await this.wakeUpServer();
            } else {
                console.log('❌ [WakeUp] 최대 재시도 횟수 초과');
                this.wakeUpAttempts = 0;
                return false;
            }
            
        } catch (error) {
            console.log(`💥 [WakeUp] 서버 깨우기 오류:`, error.message);
            
            if (this.wakeUpAttempts < this.maxWakeUpAttempts) {
                console.log(`🔄 [WakeUp] ${this.wakeUpAttempts}/${this.maxWakeUpAttempts} 재시도...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                return await this.wakeUpServer();
            } else {
                console.log('❌ [WakeUp] 최대 재시도 횟수 초과');
                this.wakeUpAttempts = 0;
                return false;
            }
        }
    },
    
    // 스마트 API 요청 (슬립 감지 및 자동 복구)
    async smartApiRequest(endpoint, options = {}) {
        console.log(`🧠 [SmartAPI] ${endpoint} 요청 시작...`);
        
        try {
            // 첫 번째 시도
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
                signal: AbortSignal.timeout(10000) // 10초 타임아웃
            });
            
            if (response.ok) {
                console.log(`✅ [SmartAPI] ${endpoint} 성공`);
                return await response.json();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.log(`⚠️ [SmartAPI] ${endpoint} 1차 실패:`, error.message);
            
            // 타임아웃이나 연결 오류 시 서버 슬립으로 판단
            if (error.name === 'TimeoutError' || error.message.includes('fetch')) {
                console.log('😴 [SmartAPI] 서버 슬립 감지 - 깨우기 시도');
                
                const wakeUpSuccess = await this.wakeUpServer();
                if (wakeUpSuccess) {
                    // 서버가 깨어났으면 다시 요청
                    try {
                        console.log(`🔄 [SmartAPI] ${endpoint} 재시도...`);
                        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
                            headers: { 'Content-Type': 'application/json' },
                            ...options,
                            signal: AbortSignal.timeout(10000)
                        });
                        
                        if (retryResponse.ok) {
                            console.log(`✅ [SmartAPI] ${endpoint} 재시도 성공`);
                            return await retryResponse.json();
                        } else {
                            throw new Error(`HTTP ${retryResponse.status}`);
                        }
                    } catch (retryError) {
                        console.log(`❌ [SmartAPI] ${endpoint} 재시도 실패:`, retryError.message);
                        return null;
                    }
                } else {
                    console.log(`❌ [SmartAPI] 서버 깨우기 실패 - ${endpoint} 포기`);
                    return null;
                }
            } else {
                console.log(`❌ [SmartAPI] ${endpoint} 일반 오류:`, error.message);
                return null;
            }
        }
    }
};

// 🚀 자동 초기화 함수
export const initializeKeepAlive = () => {
    // 프로덕션 환경에서만 keep-alive 시작
    if (API_BASE_URL.includes('onrender.com')) {
        console.log('🌐 [Init] 프로덕션 환경 감지 - Keep-Alive 시스템 시작');
        KeepAliveManager.start();
    } else {
        console.log('💻 [Init] 로컬 환경 감지 - Keep-Alive 건너뛰기');
    }
};

// 기본 export
export default {
    ServerAPI,
    HybridDataManager,
    ServerConnectionMonitor,
    BulkScoreSync,
    SyncStatusMonitor,
    KeepAliveManager,
    initializeKeepAlive
};
