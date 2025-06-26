import { User } from '@/api/entities';

const USERS_KEY = 'catena_mock_users';
const AIRDROPS_KEY = 'catena_mock_airdrops';

const initializeData = () => {
    if (!localStorage.getItem(USERS_KEY)) {
        // 목업 유저 데이터를 최소화하고 점수를 낮게 설정
        const mockUsers = [
            { id: 'demo_user1', full_name: 'Demo Player 1', email: 'demo1@example.com', score: 150, wallet_address: '0x' + 'a'.repeat(40), role: 'user' },
            { id: 'demo_user2', full_name: 'Demo Player 2', email: 'demo2@example.com', score: 120, wallet_address: '0x' + 'b'.repeat(40), role: 'user' },
            { id: 'demo_user3', full_name: 'Demo Player 3', email: 'demo3@example.com', score: 100, wallet_address: '0x' + 'c'.repeat(40), role: 'user' },
        ];
        localStorage.setItem(USERS_KEY, JSON.stringify(mockUsers));
    }
    if (!localStorage.getItem(AIRDROPS_KEY)) {
        localStorage.setItem(AIRDROPS_KEY, JSON.stringify([]));
    }
};

initializeData();

export const CatenaUsers = {
    list: async (sortKey = '-score', limit = 20) => {
        // 실제 로그인한 사용자 포함하여 랭킹 조회
        const mockUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const currentUser = localStorage.getItem('catena_user');
        
        let allUsers = [...mockUsers];
        
        // 현재 로그인한 사용자 추가 (중복 제거)
        if (currentUser) {
            const userData = JSON.parse(currentUser);
            const existingIndex = allUsers.findIndex(u => u.id === userData.id);
            if (existingIndex >= 0) {
                allUsers[existingIndex] = userData; // 업데이트
            } else {
                allUsers.push(userData); // 새로 추가
            }
        }
        
        if (sortKey && sortKey.startsWith('-')) {
            const key = sortKey.substring(1);
            allUsers.sort((a, b) => (b[key] || 0) - (a[key] || 0));
        }
        return allUsers.slice(0, limit);
    },
};

export const CatenaAirdrops = {
    filter: async (filters, sortKey = '-created_date') => {
        let airdrops = JSON.parse(localStorage.getItem(AIRDROPS_KEY) || '[]');
        if (filters && filters.user_id) {
            airdrops = airdrops.filter(a => a.user_id === filters.user_id);
        }
        if (sortKey && sortKey.startsWith('-')) {
             airdrops.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
        return airdrops;
    },
    create: async (airdropData) => {
        const airdrops = JSON.parse(localStorage.getItem(AIRDROPS_KEY) || '[]');
        const newAirdrop = {
            ...airdropData,
            id: `airdrop_${Date.now()}`,
            created_date: new Date().toISOString()
        };
        airdrops.push(newAirdrop);
        localStorage.setItem(AIRDROPS_KEY, JSON.stringify(airdrops));
        return newAirdrop;
    },
};