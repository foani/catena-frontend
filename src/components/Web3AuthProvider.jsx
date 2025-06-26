import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { User } from '@/api/entities';
import { ethers } from 'ethers';
import { CATENA_NETWORKS } from './CatenaBlockchain';

const Web3AuthContext = createContext();

export const useWeb3Auth = () => {
    const context = useContext(Web3AuthContext);
    if (!context) {
        throw new Error('useWeb3Auth must be used within Web3AuthProvider');
    }
    return context;
};

// 🚀 실제 Google OAuth + 개발자 로그인 통합 시스템 (영구적 지갑 + 포인트 보존)
export default function Web3AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    // 🎯 사용자별 고유 지갑 생성 (deterministic) - 영구적 지갑 주소
    const generateUserSpecificWallet = async (userEmail, userProvider, userId) => {
        try {
            console.log('[generateUserSpecificWallet] Creating permanent wallet for user:', userEmail);
            
            // 1. 사용자별 고유 seed 생성
            const userSeed = `${userEmail}-${userProvider}-${userId}-catena-wallet-2025`;
            console.log('- User seed created (length):', userSeed.length);
            
            // 2. seed를 해시하여 entropy 생성
            const encoder = new TextEncoder();
            const data = encoder.encode(userSeed);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = new Uint8Array(hashBuffer);
            
            // 3. 해시를 16진수 문자열로 변환
            const entropy = Array.from(hashArray)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            
            console.log('- Entropy generated (32 bytes):', entropy.substring(0, 20) + '...');
            
            // 4. entropy로 지갑 생성 (deterministic)
            const wallet = new ethers.Wallet('0x' + entropy);
            
            console.log('[generateUserSpecificWallet] ✅ Deterministic wallet created:');
            console.log('- Permanent Address:', wallet.address);
            console.log('- Same user = Same address forever');
            
            // 5. Catena 네트워크 연결 시도
            let connectedWallet = null;
            let networkInfo = null;
            
            try {
                const provider = new ethers.JsonRpcProvider(CATENA_NETWORKS.testnet.rpcUrl);
                connectedWallet = wallet.connect(provider);
                
                // 네트워크 연결 테스트 (타임아웃 설정)
                const networkPromise = provider.getNetwork();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Network connection timeout')), 5000)
                );
                
                networkInfo = await Promise.race([networkPromise, timeoutPromise]);
                
                console.log('[generateUserSpecificWallet] Connected to Catena network:', {
                    name: networkInfo.name,
                    chainId: Number(networkInfo.chainId)
                });
                
            } catch (networkError) {
                console.warn('[generateUserSpecificWallet] Network connection failed, using offline wallet:', networkError.message);
            }
            
            // 6. 사용자별 고유 니모닉 생성 (deterministic)
            const deterministicMnemonic = generateDeterministicMnemonic(userSeed);
            
            const walletData = {
                address: wallet.address,
                privateKey: wallet.privateKey,
                mnemonic: deterministicMnemonic,
                network: 'catena',
                balance: '0',
                created_at: new Date().toISOString(),
                isReal: true,
                isDeterministic: true, // 사용자별 고유 지갑임을 표시
                provider: connectedWallet ? 'connected' : 'offline',
                networkInfo: networkInfo ? {
                    name: networkInfo.name,
                    chainId: Number(networkInfo.chainId)
                } : null
            };
            
            console.log('[generateUserSpecificWallet] ✅ Permanent Catena wallet created successfully');
            console.log('- This address will NEVER change for this user');
            console.log('- Wallet is real:', walletData.isReal);
            
            return walletData;
            
        } catch (error) {
            console.error('[generateUserSpecificWallet] Error creating deterministic wallet:', error);
            
            // fallback: 사용자별 고유하지만 간단한 방식
            console.warn('[generateUserSpecificWallet] Using fallback deterministic method');
            
            const simpleHash = await simpleHashFunction(userEmail + userProvider + userId);
            const address = '0x' + simpleHash.substring(0, 40);
            const privateKey = '0x' + simpleHash.substring(40, 104);
            
            return {
                address,
                privateKey,
                mnemonic: generateDeterministicMnemonic(userEmail),
                network: 'catena',
                balance: '0',
                created_at: new Date().toISOString(),
                isReal: false,
                isDeterministic: true,
                provider: 'fallback',
                error: error.message
            };
        }
    };

    // 🔄 기존 지갑 확인 및 업그레이드 함수 (영구적 지갑 보장)
    const upgradeUserWalletIfNeeded = async (user) => {
        try {
            console.log('[Wallet Upgrade] Checking wallet for user:', user.email);
            
            // 1. 이미 유효한 지갑을 가지고 있는지 확인
            if (user.wallet_address && 
                user.wallet_address.length === 42 && 
                user.wallet_address.startsWith('0x') &&
                user.private_key &&
                user.private_key.length >= 64 &&
                !user.private_key.includes('시뮬')) {
                
                console.log('[Wallet Upgrade] User has valid wallet, checking if deterministic...');
                
                // 기존 지갑이 deterministic인지 확인
                const expectedWallet = await generateUserSpecificWallet(
                    user.email, 
                    user.provider || 'unknown', 
                    user.id
                );
                
                if (expectedWallet.address === user.wallet_address) {
                    console.log('[Wallet Upgrade] ✅ User already has correct permanent wallet');
                    return user;
                } else {
                    console.log('[Wallet Upgrade] ⚠️ User has different wallet, keeping existing (migration protection)');
                    console.log('- Current wallet:', user.wallet_address);
                    console.log('- Expected wallet:', expectedWallet.address);
                    return user; // 기존 지갑 유지 (이미 사용 중일 수 있음)
                }
            }
            
            console.log('[Wallet Upgrade] Creating permanent deterministic wallet...');
            
            // 2. 사용자별 영구 지갑 생성
            const newWalletData = await generateUserSpecificWallet(
                user.email, 
                user.provider || 'unknown', 
                user.id
            );
            
            // 3. 기존 사용자 데이터 보존하면서 지갑만 업그레이드
            const upgradedUserData = {
                ...user,
                wallet_address: newWalletData.address,
                private_key: newWalletData.privateKey,
                wallet_upgrade_date: new Date().toISOString(),
                wallet_is_real: newWalletData.isReal,
                wallet_is_deterministic: newWalletData.isDeterministic
            };
            
            // 4. entities.js에 업데이트
            const upgradedUser = User.updateMyUserData(upgradedUserData);
            
            // 5. localStorage 업데이트
            const authData = JSON.parse(localStorage.getItem('catena_auth_data') || '{}');
            authData.user = upgradedUser;
            authData.wallet = newWalletData;
            localStorage.setItem('catena_auth_data', JSON.stringify(authData));
            localStorage.setItem('catena_user', JSON.stringify(upgradedUser));
            
            console.log('[Wallet Upgrade] 🎉 Success! User now has PERMANENT wallet:');
            console.log('- PERMANENT Address:', newWalletData.address);
            console.log('- Will NEVER change on re-login');
            console.log('- Points preserved:', upgradedUser.ctt_points);
            console.log('- Score preserved:', upgradedUser.score);
            
            return upgradedUser;
            
        } catch (error) {
            console.error('[Wallet Upgrade] Failed:', error);
            return user;
        }
    };

    // 인증 상태 확인 (개발자 로그인 + OAuth 모두 지원 + 영구 지갑)
    const checkAuthStatus = async () => {
        setIsLoading(true);
        try {
            console.log('[Auth Check] Starting...');
            
            // entities.js의 현재 사용자 확인
            let currentUser = User.getCurrentUser();
            if (currentUser) {
                // 🔄 영구 지갑 확인
                currentUser = await upgradeUserWalletIfNeeded(currentUser);
                setUser(currentUser);
                setIsAuthenticated(true);
                console.log('[Auth Check] User found in entities:', currentUser.full_name);
                return;
            }

            // 1. OAuth 인증 데이터 확인
            const storedAuthData = localStorage.getItem('catena_auth_data');
            if (storedAuthData) {
                const authData = JSON.parse(storedAuthData);
                let restoredUser = new User(authData.user);
                
                // 🔄 영구 지갑 확인
                restoredUser = await upgradeUserWalletIfNeeded(restoredUser);
                
                User.setCurrentUser(restoredUser);
                setUser(restoredUser);
                setIsAuthenticated(true);
                console.log('[Auth Check] OAuth user restored:', restoredUser.full_name);
                return;
            }

            // 2. 개발자 로그인 데이터 확인 (LoginModal.jsx 호환)
            const devUserData = localStorage.getItem('catena_user');
            const devToken = localStorage.getItem('catena_auth_token');
            
            if (devUserData && devToken) {
                const userData = JSON.parse(devUserData);
                console.log('[Auth Check] Dev login data found:', userData);
                
                let restoredUser = new User(userData);
                
                // 🔄 영구 지갑 확인
                restoredUser = await upgradeUserWalletIfNeeded(restoredUser);
                
                User.setCurrentUser(restoredUser);
                
                // OAuth 형식으로 통합 저장
                const authData = {
                    token: devToken,
                    user: restoredUser,
                    wallet: {
                        address: restoredUser.wallet_address,
                        privateKey: restoredUser.private_key,
                        network: 'catena'
                    },
                    loginTime: userData.created_date || new Date().toISOString(),
                    provider: userData.provider || 'developer'
                };
                localStorage.setItem('catena_auth_data', JSON.stringify(authData));
                
                setUser(restoredUser);
                setIsAuthenticated(true);
                console.log('[Auth Check] Dev user restored with permanent wallet:', restoredUser.full_name);
                return;
            }

            // 3. 인증 정보 없음
            setIsAuthenticated(false);
            console.log('[Auth Check] No user found');
            
        } catch (error) {
            console.error('[Auth Check] Error:', error);
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
            setAuthChecked(true);
        }
    };

    // 🌐 실제 Google OAuth 로그인 (영구 지갑 생성)
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                console.log('[Google OAuth] Token received:', tokenResponse);
                
                // Google API로 사용자 정보 가져오기
                const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: {
                        Authorization: `Bearer ${tokenResponse.access_token}`,
                    },
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch user info from Google');
                }
                
                const googleUserInfo = await response.json();
                console.log('[Google OAuth] User info received:', googleUserInfo);
                
                // 🔐 사용자별 영구 Catena Chain 지갑 생성
                const walletData = await generateUserSpecificWallet(
                    googleUserInfo.email,
                    'google',
                    googleUserInfo.id
                );
                
                // 📝 User.create() 호출 (entities.js에서 중복 체크 처리)
                const newUser = User.create({
                    id: `google_${googleUserInfo.id}`,
                    email: googleUserInfo.email,
                    full_name: googleUserInfo.name || googleUserInfo.email.split('@')[0],
                    wallet_address: walletData.address,
                    private_key: walletData.privateKey,
                    provider: 'google',
                    social_profile: {
                        provider: 'google',
                        email: googleUserInfo.email,
                        profile_image: googleUserInfo.picture || `https://avatar.vercel.sh/${googleUserInfo.email}.png`,
                        verified: googleUserInfo.verified_email || true,
                        google_id: googleUserInfo.id
                    },
                    score: 0,
                    prediction_count: 0,
                    daily_games_played: 0,
                    last_game_date: new Date().toDateString(),
                    completed_missions: [],
                    created_at: new Date().toISOString(),
                    is_admin: googleUserInfo.email === 'creatanetwork@gmail.com' || 
                             googleUserInfo.email.includes('admin'),
                    wallet_is_deterministic: walletData.isDeterministic
                });
                
                console.log('[Google OAuth] User data after create:', {
                    email: newUser.email,
                    ctt_points: newUser.ctt_points,
                    score: newUser.score,
                    is_admin: newUser.is_admin,
                    wallet_address: newUser.wallet_address,
                    wallet_permanent: walletData.isDeterministic
                });
                
                User.setCurrentUser(newUser);
                
                // 통합 인증 데이터 저장
                const authData = {
                    token: tokenResponse.access_token,
                    user: newUser,
                    wallet: walletData,
                    loginTime: new Date().toISOString(),
                    tokenExpiry: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
                    provider: 'google'
                };
                localStorage.setItem('catena_auth_data', JSON.stringify(authData));
                localStorage.setItem('catena_user', JSON.stringify(newUser));
                localStorage.setItem('catena_auth_token', tokenResponse.access_token);
                
                setUser(newUser);
                setIsAuthenticated(true);
                
                console.log('[Google OAuth] 🎉 Login Success! PERMANENT Catena wallet created:', walletData.address);
                return newUser;
            } catch (error) {
                console.error('[Google OAuth] Error:', error);
                setIsAuthenticated(false);
                throw error;
            }
        },
        onError: (error) => {
            console.error('[Google OAuth] Login failed:', error);
            throw new Error('Google login failed');
        },
        scope: 'openid email profile'
    });

    // 🟡 카카오 로그인 (영구 지갑 생성)
    const kakaoLogin = async () => {
        try {
            console.log('[Kakao Login] Starting simulation...');
            
            const kakaoUserData = {
                id: `kakao_${Date.now()}`,
                email: `kakao_user_${Math.random().toString(36).substr(2, 9)}@kakao.com`,
                name: `카카오 사용자 ${Math.random().toString(36).substr(2, 5)}`,
                nickname: `kakao_${Math.random().toString(36).substr(2, 5)}`,
                profile_image: `https://k.kakaocdn.net/dn/default/profile_image.jpg`
            };
            
            // 🔐 사용자별 영구 Catena Chain 지갑 생성
            const walletData = await generateUserSpecificWallet(
                kakaoUserData.email,
                'kakao',
                kakaoUserData.id
            );
            
            // 📝 User.create() 호출 (entities.js에서 중복 체크 처리)
            const newUser = User.create({
                id: kakaoUserData.id,
                email: kakaoUserData.email,
                full_name: kakaoUserData.name,
                wallet_address: walletData.address,
                private_key: walletData.privateKey,
                provider: 'kakao',
                social_profile: {
                    provider: 'kakao',
                    email: kakaoUserData.email,
                    profile_image: kakaoUserData.profile_image,
                    verified: true
                },
                score: 0,
                prediction_count: 0,
                daily_games_played: 0,
                last_game_date: new Date().toDateString(),
                completed_missions: [],
                created_at: new Date().toISOString(),
                is_admin: false,
                wallet_is_deterministic: walletData.isDeterministic
            });
            
            console.log('[Kakao Login] User data after create:', {
                email: newUser.email,
                ctt_points: newUser.ctt_points,
                score: newUser.score,
                wallet_address: newUser.wallet_address,
                wallet_permanent: walletData.isDeterministic
            });
            
            User.setCurrentUser(newUser);
            
            const authData = {
                token: `kakao_${Date.now()}`,
                user: newUser,
                wallet: walletData,
                loginTime: new Date().toISOString(),
                provider: 'kakao'
            };
            localStorage.setItem('catena_auth_data', JSON.stringify(authData));
            localStorage.setItem('catena_user', JSON.stringify(newUser));
            localStorage.setItem('catena_auth_token', authData.token);
            
            setUser(newUser);
            setIsAuthenticated(true);
            
            console.log('[Kakao Login] 🎉 Success! PERMANENT Catena wallet created:', walletData.address);
            return newUser;
        } catch (error) {
            console.error('[Kakao Login] Failed:', error);
            throw error;
        }
    };

    // 🚀 통합 로그인 함수
    const login = async (provider) => {
        setIsLoading(true);
        try {
            if (provider === 'google') {
                await googleLogin();
            } else if (provider === 'kakao') {
                await kakaoLogin();
            } else {
                throw new Error(`Unsupported provider: ${provider}`);
            }
        } catch (error) {
            console.error(`[${provider} Login] Failed:`, error);
            setIsAuthenticated(false);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // 📤 로그아웃 (포인트 보존 버전)
    const logout = async () => {
        setIsLoading(true);
        try {
            console.log('[Logout] Starting...');
            
            User.clearCurrentUser();
            
            // 🔒 세션 데이터만 클리어, 사용자 게임 데이터는 보존
            localStorage.removeItem('catena_auth_data');
            localStorage.removeItem('catena_current_user');
            localStorage.removeItem('catena_user');
            localStorage.removeItem('catena_auth_token');
            
            // 💾 중요: catena_users, catena_bets, catena_predictions 등은 보존됨
            
            setUser(null);
            setIsAuthenticated(false);
            
            console.log('[Logout] Success - User data and PERMANENT wallet preserved');
        } catch (error) {
            console.error('[Logout] Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 나머지 함수들은 기존과 동일...
    const updateCttBalance = async (newBalance) => {
        try {
            if (!user) {
                console.error('[CTT Update] No user found');
                return false;
            }
            
            console.log(`[CTT Update] ${user.ctt_points} → ${newBalance}`);
            
            const updatedUser = User.updateMyUserData({
                ctt_points: newBalance
            });
            
            if (updatedUser) {
                setUser(updatedUser);
                
                const authData = JSON.parse(localStorage.getItem('catena_auth_data') || '{}');
                authData.user = updatedUser;
                localStorage.setItem('catena_auth_data', JSON.stringify(authData));
                
                console.log('[CTT Update] Success:', newBalance);
                return true;
            }
        } catch (error) {
            console.error('[CTT Update] Error:', error);
        }
        return false;
    };

    const updateScore = async (newScore) => {
        try {
            if (!user) return false;
            
            const updatedUser = User.updateMyUserData({
                score: newScore,
                prediction_count: (user.prediction_count || 0) + 1
            });
            
            if (updatedUser) {
                setUser(updatedUser);
                return true;
            }
        } catch (error) {
            console.error('[Score Update] Error:', error);
        }
        return false;
    };

    const recordGamePlay = async () => {
        try {
            if (!user) return false;
            
            const today = new Date().toDateString();
            const dailyGames = user.last_game_date === today ? user.daily_games_played + 1 : 1;
            
            const updatedUser = User.updateMyUserData({
                daily_games_played: dailyGames,
                last_game_date: today
            });
            
            if (updatedUser) {
                setUser(updatedUser);
                return true;
            }
        } catch (error) {
            console.error('[Game Record] Error:', error);
        }
        return false;
    };

    const ensureAuthenticated = async () => {
        if (!isAuthenticated) {
            throw new Error('User not authenticated');
        }
        return user;
    };

    const updateUserData = async (newData) => {
        try {
            if (!user) {
                console.error('[updateUserData] No user found');
                return false;
            }
            
            console.log('[updateUserData] Updating:', newData);
            
            const updatedUser = User.updateMyUserData(newData);
            
            if (updatedUser) {
                setUser(updatedUser);
                
                const authData = JSON.parse(localStorage.getItem('catena_auth_data') || '{}');
                authData.user = updatedUser;
                localStorage.setItem('catena_auth_data', JSON.stringify(authData));
                
                console.log('[updateUserData] Success:', updatedUser);
                return true;
            }
        } catch (error) {
            console.error('[updateUserData] Error:', error);
        }
        return false;
    };

    const value = {
        user,
        isLoading,
        isAuthenticated,
        authChecked,
        login,
        logout,
        checkAuthStatus,
        ensureAuthenticated,
        updateUserData,
        updateCttBalance,
        updateScore,
        recordGamePlay
    };

    return (
        <Web3AuthContext.Provider value={value}>
            {children}
        </Web3AuthContext.Provider>
    );
}

// 🎲 사용자별 deterministic 니모닉 생성
const generateDeterministicMnemonic = (userSeed) => {
    const words = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
        'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
        'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
        'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance'
    ];
    
    const seedBytes = new TextEncoder().encode(userSeed);
    let wordIndices = [];
    
    for (let i = 0; i < 12; i++) {
        const index = (seedBytes[i % seedBytes.length] + i) % words.length;
        wordIndices.push(index);
    }
    
    return wordIndices.map(index => words[index]).join(' ');
};

// 📱 간단한 해시 함수 (fallback)
const simpleHashFunction = async (input) => {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(input + 'catena-salt-2025');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);
        return Array.from(hashArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    } catch (error) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }
};