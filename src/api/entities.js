// Enhanced entities for betting with improved user data management
const storage = { 
    bets: [], 
    rounds: [], 
    predictions: [], 
    users: [] 
}; 

const generateId = () => Date.now() + '_' + Math.random().toString(36).substr(2); 

// LocalStorage keys for persistence
const STORAGE_KEYS = {
    CURRENT_USER: 'catena_current_user',
    USER_DATA: 'catena_user_data',
    GAME_DATA: 'catena_game_data'
};

// Utility functions for localStorage management
const StorageManager = {
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Storage save error:', error);
            return false;
        }
    },
    
    load: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage load error:', error);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    }
};

export class Bet { 
    constructor(data = {}) { 
        this.id = data.id || generateId(); 
        this.user_id = data.user_id || data.userId; 
        this.round_id = data.round_id || data.roundId;  
        this.prediction_type = data.prediction_type || data.predictionType; 
        this.bet_amount = data.bet_amount || data.betAmount || data.amount || 0; 
        this.potential_win = data.potential_win || data.potentialWin || 0; 
        this.is_correct = data.is_correct || false;
        this.payout = data.payout || 0;
        this.created_at = data.created_at || new Date().toISOString();
        Object.assign(this, data);  
    } 
    
    static create(data) { 
        const bet = new Bet(data); 
        storage.bets.push(bet); 
        console.log('[Bet Created]', { 
            id: bet.id, 
            type: bet.prediction_type, 
            amount: bet.bet_amount,
            user_id: bet.user_id 
        }); 
        
        // Save to localStorage for persistence
        StorageManager.save('catena_bets', storage.bets);
        return bet;  
    } 
    
    static findById(id) { 
        return storage.bets.find(b => b.id === id); 
    } 
    
    static filter(query = {}) { 
        if (Object.keys(query).length === 0) return storage.bets;
        
        return storage.bets.filter(bet => {
            return Object.keys(query).every(key => bet[key] === query[key]);
        });
    } 
    
    static async update(id, data) { 
        const bet = Bet.findById(id); 
        if (bet) {
            Object.assign(bet, data);
            StorageManager.save('catena_bets', storage.bets);
            console.log('[Bet Updated]', { id, updates: data });
        }
        return bet; 
    } 
} 

export class GameRound { 
    constructor(data = {}) { 
        this.id = data.id || generateId(); 
        this.start_time = data.start_time || new Date().toISOString();
        this.end_time = data.end_time;
        this.start_price = data.start_price || 0;
        this.end_price = data.end_price || 0;
        this.is_active = data.is_active || false;
        this.created_at = data.created_at || new Date().toISOString();
        Object.assign(this, data); 
    } 
    
    static create(data) { 
        const round = new GameRound(data); 
        storage.rounds.push(round); 
        console.log('[Round Created]', { 
            id: round.id, 
            start_price: round.start_price,
            is_active: round.is_active 
        });
        
        StorageManager.save('catena_rounds', storage.rounds);
        return round; 
    } 
    
    static findById(id) { 
        return storage.rounds.find(r => r.id === id); 
    } 
    
    static filter(query = {}) { 
        if (Object.keys(query).length === 0) return storage.rounds;
        
        return storage.rounds.filter(round => {
            return Object.keys(query).every(key => round[key] === query[key]);
        });
    } 
    
    static async update(id, data) { 
        const round = GameRound.findById(id); 
        if (round) {
            Object.assign(round, data);
            StorageManager.save('catena_rounds', storage.rounds);
            console.log('[Round Updated]', { id, updates: data });
        }
        return round; 
    } 
} 

export class Prediction { 
    constructor(data = {}) { 
        this.id = data.id || generateId(); 
        this.user_id = data.user_id;
        this.round_id = data.round_id;
        this.prediction_type = data.prediction_type;
        this.is_correct = data.is_correct || false;
        this.points_earned = data.points_earned || 0;
        this.created_date = data.created_date || new Date().toISOString();
        Object.assign(this, data); 
    } 
    
    static create(data) { 
        const prediction = new Prediction(data); 
        storage.predictions.push(prediction); 
        console.log('[Prediction Created]', { 
            id: prediction.id, 
            type: prediction.prediction_type,
            is_correct: prediction.is_correct,
            points: prediction.points_earned 
        });
        
        StorageManager.save('catena_predictions', storage.predictions);
        return prediction; 
    } 
    
    static filter(query = {}) { 
        if (Object.keys(query).length === 0) return storage.predictions;
        
        return storage.predictions.filter(prediction => {
            return Object.keys(query).every(key => {
                if (key === 'created_date' && query[key]) {
                    // Date filtering logic
                    return new Date(prediction.created_date).toDateString() === new Date(query[key]).toDateString();
                }
                return prediction[key] === query[key];
            });
        });
    } 
    
    static async update(id, data) { 
        const prediction = storage.predictions.find(p => p.id === id);
        if (prediction) {
            Object.assign(prediction, data);
            StorageManager.save('catena_predictions', storage.predictions);
        }
        return prediction; 
    } 
} 

export class User { 
    constructor(data = {}) { 
        this.id = data.id || generateId(); 
        this.full_name = data.full_name || data.name || 'User';
        this.email = data.email || '';
        this.walletAddress = data.walletAddress || '';
        this.score = data.score || 0;
        
        // ✅ 포인트는 명시적으로 지정된 경우에만 설정, 기본값 200 CTT
        this.ctt_points = data.ctt_points !== undefined ? data.ctt_points : 200;
        
        this.prediction_count = data.prediction_count || 0;
        this.daily_games_played = data.daily_games_played || 0;
        this.last_game_date = data.last_game_date || '';
        this.social_profile = data.social_profile || {};
        this.created_at = data.created_at || new Date().toISOString();
        this.is_admin = data.is_admin || false;
        Object.assign(this, data); 
    } 
    
    static create(data) { 
        // 🔍 이메일 기반 기존 사용자 확인 (가장 중요한 수정!)
        if (data.email) {
            const existingUser = storage.users.find(u => u.email === data.email);
            if (existingUser) {
                console.log('🔄 [User.create] Found existing user, preserving data:', {
                    email: existingUser.email,
                    existingPoints: existingUser.ctt_points,
                    existingScore: existingUser.score
                });
                
                // 기존 사용자 데이터에 새 정보 병합 (포인트 보존)
                const updatedUser = {
                    ...existingUser,
                    ...data,
                    // 🔑 중요: 기존 게임 데이터는 보존
                    ctt_points: existingUser.ctt_points,
                    score: existingUser.score,
                    prediction_count: existingUser.prediction_count,
                    daily_games_played: existingUser.daily_games_played,
                    last_game_date: existingUser.last_game_date,
                    completed_missions: existingUser.completed_missions || [],
                    // 관리자 권한도 보존
                    is_admin: existingUser.is_admin || data.is_admin || false,
                    // 업데이트 시간만 갱신
                    updated_at: new Date().toISOString()
                };
                
                // storage에서 기존 사용자 업데이트
                const userIndex = storage.users.findIndex(u => u.email === data.email);
                if (userIndex !== -1) {
                    storage.users[userIndex] = updatedUser;
                }
                
                // localStorage 저장
                StorageManager.save('catena_users', storage.users);
                
                console.log('✅ [User.create] Existing user updated, points preserved:', {
                    email: updatedUser.email,
                    ctt_points: updatedUser.ctt_points,
                    score: updatedUser.score,
                    is_admin: updatedUser.is_admin
                });
                
                return updatedUser;
            }
        }
        
        // 🆕 새 사용자 생성 (기존 로직)
        console.log('🆕 [User.create] Creating new user:', data.email);
        const user = new User(data); 
        storage.users.push(user); 
        console.log('[User Created]', { 
            id: user.id, 
            name: user.full_name,
            points: user.ctt_points,
            email: user.email
        }); 
        
        // Save to localStorage for persistence
        StorageManager.save('catena_users', storage.users);
        return user;  
    } 
    
    static findByWallet(walletAddress) { 
        return storage.users.find(u => u.walletAddress === walletAddress); 
    } 
    
    static findByEmail(email) {
        return storage.users.find(u => u.email === email);
    }
    
    static findById(id) {
        return storage.users.find(u => u.id === id);
    }
    
    static filter(query = {}) { 
        if (Object.keys(query).length === 0) return storage.users;
        
        return storage.users.filter(user => {
            return Object.keys(query).every(key => user[key] === query[key]);
        });
    }
    
    static async list(sortField = '', limit = 100) {
        let users = [...storage.users];
        
        // 🔧 중복 사용자 제거 (이메일 기준)
        const uniqueUsers = [];
        const seenEmails = new Set();
        
        users.forEach(user => {
            if (!seenEmails.has(user.email) && user.email) {
                seenEmails.add(user.email);
                uniqueUsers.push(user);
            } else if (!user.email) {
                // 이메일이 없는 경우 ID 기준으로 중복 체크
                const existingUser = uniqueUsers.find(u => u.id === user.id);
                if (!existingUser) {
                    uniqueUsers.push(user);
                }
            }
        });
        
        // 점수가 0보다 큰 사용자만 필터링
        const validUsers = uniqueUsers.filter(u => u.score && u.score > 0);
        
        // Sort users if sortField is provided
        if (sortField) {
            const field = sortField.startsWith('-') ? sortField.substring(1) : sortField;
            const isDescending = sortField.startsWith('-');
            
            validUsers.sort((a, b) => {
                const aVal = Number(a[field]) || 0;  // 🔧 수정: Number로 변환
                const bVal = Number(b[field]) || 0;  // 🔧 수정: Number로 변환
                
                if (isDescending) {
                    return bVal - aVal;  // 내림차순 (높은 점수 -> 낮은 점수)
                } else {
                    return aVal - bVal;  // 오름차순
                }
            });
        }
        
        console.log('[User.list] Filtered users:', {
            total: users.length,
            unique: uniqueUsers.length,
            valid: validUsers.length,
            returning: Math.min(validUsers.length, limit),
            sortField: sortField,
            topUsers: validUsers.slice(0, 5).map(u => ({ 
                name: u.full_name, 
                score: u.score, 
                email: u.email 
            }))
        });
        
        // Apply limit
        return validUsers.slice(0, limit);
    } 
    
    static async update(id, data) {
        const user = User.findById(id);
        if (user) {
            Object.assign(user, data);
            StorageManager.save('catena_users', storage.users);
            console.log('[User Updated]', { id, updates: data });
        }
        return user;
    }
} 

// Enhanced User extensions with improved persistence
User.currentUser = null; 

// 🚀 향상된 User.updateMyUserData 함수 (localStorage + 백엔드 API 동시 저장)
User.updateMyUserData = async function(data) {
    console.log('[User.updateMyUserData] Called with:', data);
    
    // Try to get current user from multiple sources
    let currentUser = User.currentUser;
    
    if (!currentUser) {
        // Try to load from localStorage
        const savedUser = StorageManager.load(STORAGE_KEYS.CURRENT_USER);
        if (savedUser) {
            currentUser = new User(savedUser);
            User.currentUser = currentUser;
        }
    }
    
    if (!currentUser) {
        console.error('[User.updateMyUserData] No current user found');
        return null;
    }
    
    // Update the user data (LOCAL)
    Object.assign(currentUser, data);
    
    // 1️⃣ LOCAL: Save to localStorage for persistence (기존 방식 유지)
    StorageManager.save(STORAGE_KEYS.CURRENT_USER, currentUser);
    
    // Update in storage array if exists
    const userInStorage = storage.users.find(u => u.id === currentUser.id);
    if (userInStorage) {
        Object.assign(userInStorage, data);
        StorageManager.save('catena_users', storage.users);
    } else {
        // Add to storage if not exists
        storage.users.push(currentUser);
        StorageManager.save('catena_users', storage.users);
    }
    
    console.log('[User.updateMyUserData] ✅ Local update completed:', {
        id: currentUser.id,
        score: currentUser.score,
        ctt_points: currentUser.ctt_points,
        updates: data
    });
    
    // 2️⃣ BACKEND: 백엔드 API 호출 (새로 추가)
    try {
        // 먼저 사용자를 백엔드에 등록 (없으면 생성, 있으면 패스)
        const registerResult = await fetch('http://localhost:3001/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentUser.id,
                full_name: currentUser.full_name,
                email: currentUser.email,
                walletAddress: currentUser.walletAddress,
                score: currentUser.score || 0,
                ctt_points: currentUser.ctt_points || 0,
                is_admin: currentUser.is_admin || false
            })
        });
        
        if (registerResult.ok) {
            console.log('[User.updateMyUserData] ✅ User registered/updated in backend');
        }
        
        // 점수 업데이트가 포함된 경우 백엔드 점수 업데이트 API 호출
        if (data.score !== undefined || data.ctt_points !== undefined) {
            const updateResult = await fetch('http://localhost:3001/api/update-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: currentUser.email,
                    score: currentUser.score || 0,
                    ctt_points: currentUser.ctt_points || 0,
                    full_name: currentUser.full_name
                })
            });
            
            if (updateResult.ok) {
                const result = await updateResult.json();
                console.log('[User.updateMyUserData] ✅ Backend score update success:', {
                    email: currentUser.email,
                    score: currentUser.score,
                    rank: result.newRank
                });
            } else {
                console.warn('[User.updateMyUserData] ⚠️ Backend score update failed, but local save completed');
            }
        }
        
    } catch (error) {
        console.warn('[User.updateMyUserData] ⚠️ Backend API call failed:', error.message);
        console.log('[User.updateMyUserData] 💾 Local data saved successfully, backend sync will retry later');
        // 백엔드 실패해도 로컬 저장은 성공했으므로 계속 진행
    }
    
    console.log('[User.updateMyUserData] ✅ Update process completed:', {
        id: currentUser.id,
        name: currentUser.full_name,
        score: currentUser.score,
        ctt_points: currentUser.ctt_points,
        localSaved: true,
        backendSynced: 'attempted'
    });
    
    return currentUser;  
}; 

User.setCurrentUser = function(user) { 
    if (!user) {
        console.error('[User.setCurrentUser] Invalid user provided');
        return null;
    }
    
    // 🔑 자동 관리자 설정 조건들
    const adminConditions = [
        user.email === 'creatanetwork@gmail.com',
        user.email === 'admin@catena.com',
        user.email === 'admin@creata.com', 
        user.full_name?.toLowerCase().includes('admin'),
        user.full_name?.toLowerCase().includes('manager'),
        user.email?.toLowerCase().includes('admin'),
        // 첫 번째 사용자를 자동으로 관리자로 설정
        User.filter().length === 0
    ];
    
    // 조건 중 하나라도 만족하면 관리자로 설정
    if (adminConditions.some(condition => condition)) {
        user.is_admin = true;
        console.log('🔑 [Auto Admin] User automatically set as admin:', user.full_name);
        console.log('📋 [Auto Admin] Conditions met:', {
            isFirstUser: User.filter().length === 0,
            hasAdminEmail: user.email?.toLowerCase().includes('admin'),
            hasAdminName: user.full_name?.toLowerCase().includes('admin') || user.full_name?.toLowerCase().includes('manager'),
            isSpecialEmail: ['admin@catena.com', 'admin@creata.com'].includes(user.email)
        });
    }
    
    User.currentUser = user; 
    StorageManager.save(STORAGE_KEYS.CURRENT_USER, user);
    
    console.log('[User.setCurrentUser] Current user set:', {
        id: user.id,
        name: user.full_name,
        email: user.email,
        points: user.ctt_points,
        is_admin: user.is_admin
    });
    
    return user; 
};  

User.getCurrentUser = function() { 
    if (!User.currentUser) {
        // Try to load from localStorage
        const savedUser = StorageManager.load(STORAGE_KEYS.CURRENT_USER);
        if (savedUser) {
            User.currentUser = new User(savedUser);
        }
    }
    return User.currentUser; 
};  

User.me = async function() { 
    return User.getCurrentUser(); 
}; 

User.clearCurrentUser = function() {
    console.log('[User.clearCurrentUser] Clearing session only, preserving user data');
    
    // 🔒 현재 세션만 클리어, 사용자 데이터는 catena_users에 보존됨
    User.currentUser = null;
    StorageManager.remove(STORAGE_KEYS.CURRENT_USER);
    
    // 주의: catena_users는 삭제하지 않음 (포인트 보존을 위해)
    console.log('[User.clearCurrentUser] Session cleared, user data preserved');
};

// Initialize storage from localStorage on module load
const initializeStorage = () => {
    const savedBets = StorageManager.load('catena_bets', []);
    const savedRounds = StorageManager.load('catena_rounds', []);
    const savedPredictions = StorageManager.load('catena_predictions', []);
    const savedUsers = StorageManager.load('catena_users', []);
    
    storage.bets = savedBets.map(data => new Bet(data));
    storage.rounds = savedRounds.map(data => new GameRound(data));
    storage.predictions = savedPredictions.map(data => new Prediction(data));
    storage.users = savedUsers.map(data => new User(data));
    
    console.log('[Storage Initialized]', {
        bets: storage.bets.length,
        rounds: storage.rounds.length,
        predictions: storage.predictions.length,
        users: storage.users.length
    });
};

// 🛠️ 개발자용 데이터 초기화 기능
User.clearAllData = function() {
    console.log('[User.clearAllData] Clearing all user data...');
    
    // 저장소 데이터 초기화
    storage.users = [];
    storage.bets = [];
    storage.rounds = [];
    storage.predictions = [];
    
    // localStorage 초기화
    StorageManager.remove('catena_users');
    StorageManager.remove('catena_bets');
    StorageManager.remove('catena_rounds');
    StorageManager.remove('catena_predictions');
    StorageManager.remove(STORAGE_KEYS.CURRENT_USER);
    StorageManager.remove(STORAGE_KEYS.USER_DATA);
    StorageManager.remove(STORAGE_KEYS.GAME_DATA);
    
    // 현재 사용자 초기화
    User.currentUser = null;
    
    console.log('[User.clearAllData] All data cleared successfully');
    return true;
};

// 테스트 데이터 중복 제거
User.removeDuplicates = function() {
    console.log('[User.removeDuplicates] Removing duplicate users...');
    
    const uniqueUsers = [];
    const seenEmails = new Set();
    
    storage.users.forEach(user => {
        if (!seenEmails.has(user.email) && user.email) {
            seenEmails.add(user.email);
            uniqueUsers.push(user);
        } else if (!user.email) {
            const existingUser = uniqueUsers.find(u => u.id === user.id);
            if (!existingUser) {
                uniqueUsers.push(user);
            }
        }
    });
    
    const originalCount = storage.users.length;
    storage.users = uniqueUsers;
    StorageManager.save('catena_users', storage.users);
    
    console.log('[User.removeDuplicates] Duplicates removed:', {
        before: originalCount,
        after: storage.users.length,
        removed: originalCount - storage.users.length
    });
    
    return storage.users.length;
};

// Auto-initialize
initializeStorage();

// 초기 로드 시 중복 제거
User.removeDuplicates();

// 🔄 localStorage 실시간 동기화 시스템 추가
const StorageSyncManager = {
    isInitialized: false,
    
    // 다른 탭에서 localStorage 변경 시 자동 동기화
    init() {
        if (this.isInitialized) return;
        
        console.log('🔄 [StorageSync] 실시간 동기화 시스템 초기화');
        
        // storage 이벤트 리스너 (다른 탭에서 localStorage 변경 시 발생)
        window.addEventListener('storage', (e) => {
            if (e.key === 'catena_users') {
                console.log('🔄 [StorageSync] 다른 탭에서 사용자 데이터 변경 감지');
                this.forceReloadUsers();
            }
        });
        
        // 페이지 포커스 시 자동 동기화
        window.addEventListener('focus', () => {
            console.log('🔄 [StorageSync] 페이지 포커스 - 자동 동기화');
            this.forceReloadUsers();
        });
        
        // visibility 변경 시 동기화
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔄 [StorageSync] 페이지 활성화 - 자동 동기화');
                this.forceReloadUsers();
            }
        });
        
        this.isInitialized = true;
        console.log('✅ [StorageSync] 실시간 동기화 시스템 활성화');
    },
    
    // 강제로 localStorage에서 모든 사용자 데이터 재로드
    forceReloadUsers() {
        const savedUsers = StorageManager.load('catena_users', []);
        storage.users = savedUsers.map(data => new User(data));
        
        console.log('🔄 [StorageSync] 사용자 데이터 강제 리로드:', {
            totalUsers: storage.users.length,
            users: storage.users.map(u => ({ name: u.full_name, score: u.score }))
        });
        
        // 커스텀 이벤트 발생으로 UI 업데이트 알림
        window.dispatchEvent(new CustomEvent('storageDataUpdated', {
            detail: { type: 'users', count: storage.users.length }
        }));
    },
    
    // 통합 데이터 조회 (모든 탭에서 동일한 데이터 보장)
    getAllUsers() {
        // 먼저 localStorage에서 최신 데이터 로드
        this.forceReloadUsers();
        
        // 중복 제거 및 정렬
        const uniqueUsers = [];
        const seenEmails = new Set();
        
        storage.users.forEach(user => {
            if (!seenEmails.has(user.email) && user.email) {
                seenEmails.add(user.email);
                uniqueUsers.push(user);
            } else if (!user.email) {
                const existingUser = uniqueUsers.find(u => u.id === user.id);
                if (!existingUser) {
                    uniqueUsers.push(user);
                }
            }
        });
        
        // 점수 기준 정렬
        const validUsers = uniqueUsers.filter(u => u.score && u.score > 0);
        validUsers.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        console.log('🏆 [StorageSync] 통합 랭킹 데이터:', {
            totalUsers: storage.users.length,
            uniqueUsers: uniqueUsers.length,
            validUsers: validUsers.length,
            topUsers: validUsers.slice(0, 5).map(u => ({ 
                name: u.full_name, 
                score: u.score, 
                email: u.email 
            }))
        });
        
        return validUsers;
    },
    
    // 수동 새로고침 (디버깅용)
    manualRefresh() {
        console.log('🔄 [StorageSync] 수동 새로고침 실행');
        this.forceReloadUsers();
        return storage.users.length;
    }
};

// User.list 함수 개선 (동기화 시스템 사용)
User.listWithSync = async function(sortField = '', limit = 100) {
    console.log('🔄 [User.listWithSync] 동기화된 사용자 목록 조회');
    
    // 동기화 시스템을 통해 최신 데이터 가져오기
    const users = StorageSyncManager.getAllUsers();
    
    // Apply limit
    const result = users.slice(0, limit);
    
    console.log('✅ [User.listWithSync] 완료:', {
        returning: result.length,
        sortField: sortField,
        topUsers: result.slice(0, 3).map(u => ({ 
            name: u.full_name, 
            score: u.score, 
            email: u.email 
        }))
    });
    
    return result;
};

// 시스템 초기화
StorageSyncManager.init();

// 전역으로 접근 가능하도록 설정
window.StorageSyncManager = StorageSyncManager;