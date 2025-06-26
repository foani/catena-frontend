import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Shield, Zap, Code } from 'lucide-react';
import { useWeb3Auth } from './Web3AuthProvider';
import { motion } from 'framer-motion';
import { useTranslation } from './i18n';

export default function LoginModal({ isOpen, onClose }) {
    const { login, isLoading } = useWeb3Auth();
    const [providerLoading, setProviderLoading] = useState(null);
    const [showDevLogin, setShowDevLogin] = useState(false);
    const [devEmail, setDevEmail] = useState('');
    const [devName, setDevName] = useState('');
    const [devPassword, setDevPassword] = useState('');
    const [clickCount, setClickCount] = useState(0);
    const { t } = useTranslation();

    const handleLogin = async (provider) => {
        setProviderLoading(provider);
        try {
            await login(provider);
            onClose();
        } catch (error) {
            console.error(`${provider} login failed:`, error);
            alert(t('login_failed'));
        } finally {
            setProviderLoading(null);
        }
    };

    const handleDevLogin = async () => {
        if (!devEmail) {
            alert(t('enter_email'));
            return;
        }

        if (!devPassword) {
            alert(t('enter_password'));
            return;
        }

        // 패스워드 검증
        const validPasswords = {
            'creatanetwork@gmail.com': 'admin123',
            'admin@catena.com': 'catena123',
            'admin@creata.com': 'creata123',
            'test@admin.com': 'test123'
        };

        const generalPassword = 'dev123'; // 일반 개발자 패스워드

        const isValidPassword = 
            validPasswords[devEmail] === devPassword || 
            devPassword === generalPassword ||
            (devEmail.includes('admin') && devPassword === 'admin123');

        if (!isValidPassword) {
            alert(t('invalid_password'));
            return;
        }

        setProviderLoading('dev');
        try {
            console.log('[Dev Login] Starting for:', devEmail);
            
            // 🔍 기존 사용자 데이터 확인 (이메일 기준)
            const existingAuthData = localStorage.getItem('catena_auth_data');
            const existingUserData = localStorage.getItem('catena_user');
            
            let existingUser = null;
            
            // 1. OAuth 방식 데이터 확인
            if (existingAuthData) {
                try {
                    const authData = JSON.parse(existingAuthData);
                    if (authData.user && authData.user.email === devEmail) {
                        existingUser = authData.user;
                        console.log('[Dev Login] Found existing OAuth user:', existingUser.email);
                    }
                } catch (e) {
                    console.warn('[Dev Login] Failed to parse auth data:', e);
                }
            }
            
            // 2. 개발자 로그인 방식 데이터 확인
            if (!existingUser && existingUserData) {
                try {
                    const userData = JSON.parse(existingUserData);
                    if (userData.email === devEmail) {
                        existingUser = userData;
                        console.log('[Dev Login] Found existing dev user:', existingUser.email);
                    }
                } catch (e) {
                    console.warn('[Dev Login] Failed to parse user data:', e);
                }
            }

            // 지갑 주소 생성 (기존 또는 신규)
            const walletAddress = existingUser?.wallet_address || 
                `0x${Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
            
            const privateKey = existingUser?.private_key ||
                `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
            
            // 🎯 사용자 데이터 생성 (기존 데이터 유지)
            const userData = {
                id: existingUser?.id || `dev_${Date.now()}`,
                email: devEmail,
                full_name: devName || devEmail.split('@')[0],
                wallet_address: walletAddress,
                private_key: privateKey,
                provider: 'developer',
                social_profile: {
                    provider: 'developer',
                    email: devEmail,
                    profile_image: existingUser?.social_profile?.profile_image || 
                        `https://avatar.vercel.sh/${devEmail}.png`
                },
                language: existingUser?.language || 'en',
                
                // ✅ 중요: 기존 게임 데이터 유지
                ctt_points: existingUser?.ctt_points || 100,
                score: existingUser?.score || 0,
                prediction_count: existingUser?.prediction_count || 0,
                completed_missions: existingUser?.completed_missions || [],
                daily_games_played: existingUser?.daily_games_played || 0,
                last_game_date: existingUser?.last_game_date || new Date().toDateString(),
                
                // 생성/수정 시간
                created_date: existingUser?.created_date || new Date().toISOString(),
                updated_date: new Date().toISOString(),
                
                // 관리자 자동 설정 체크
                is_admin: devEmail === 'creatanetwork@gmail.com' || 
                         devEmail.includes('admin') || 
                         validPasswords[devEmail]
            };
            
            console.log('[Dev Login] User data prepared:');
            console.log(`- Email: ${userData.email}`);
            console.log(`- CTT Points: ${userData.ctt_points} (preserved: ${!!existingUser})`);
            console.log(`- Score: ${userData.score} (preserved: ${!!existingUser})`);
            console.log(`- Admin: ${userData.is_admin}`);
            
            // 로컬 스토리지에 저장 (양쪽 형식 모두)
            localStorage.setItem('catena_user', JSON.stringify(userData));
            localStorage.setItem('catena_auth_token', `dev_${Date.now()}`);
            
            // OAuth 호환 형식으로도 저장
            const authData = {
                token: `dev_${Date.now()}`,
                user: userData,
                wallet: {
                    address: walletAddress,
                    privateKey: privateKey,
                    network: 'catena'
                },
                loginTime: new Date().toISOString(),
                provider: 'developer'
            };
            localStorage.setItem('catena_auth_data', JSON.stringify(authData));
            
            // Web3AuthProvider 상태 업데이트를 위해 페이지 새로고침
            window.location.reload();
            
            console.log('[Dev Login] Success! Points preserved:', userData.ctt_points);
            onClose();
        } catch (error) {
            console.error('[Dev Login] Failed:', error);
            alert(t('dev_login_failed'));
        } finally {
            setProviderLoading(null);
        }
    };

    // 로고를 5번 클릭하면 개발자 모드 활성화
    const handleLogoClick = () => {
        const newCount = clickCount + 1;
        setClickCount(newCount);
        
        if (newCount >= 5) {
            setShowDevLogin(true);
            setClickCount(0);
        }
        
        // 10초 후 카운트 리셋
        setTimeout(() => {
            if (clickCount === newCount) {
                setClickCount(0);
            }
        }, 10000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-gray-900 border-gray-700">
                <DialogHeader>
                    <div className="flex flex-col items-center mb-4">
                        <div 
                            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 p-2 cursor-pointer"
                            onClick={handleLogoClick}
                            title={clickCount > 0 ? `${5 - clickCount} more clicks for dev mode` : ''}
                        >
                            <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/48fa4bf4b_logo1.png" 
                                alt="CREATA Logo" 
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <DialogTitle className="text-center text-2xl font-bold text-cyan-400">
                            {t('login_title')}
                        </DialogTitle>
                        {clickCount > 0 && clickCount < 5 && (
                            <p className="text-xs text-gray-500 mt-1">
                                {5 - clickCount} more clicks for developer mode...
                            </p>
                        )}
                    </div>
                </DialogHeader>
                
                <div className="space-y-4 p-2">
                    <p className="text-center text-gray-300">
                        {t('login_description')}<br/>
                        <span className="text-cyan-400 font-semibold">{t('login_wallet_auto')}</span>!
                    </p>

                    {/* 개발자 로그인 모드 */}
                    {showDevLogin && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-3 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg"
                        >
                            <div className="flex items-center gap-2 text-purple-400">
                                <Code className="w-4 h-4" />
                                <span className="text-sm font-semibold">{t('dev_login')}</span>
                            </div>
                            <Input
                                type="email"
                                placeholder={t('enter_email')}
                                value={devEmail}
                                onChange={(e) => setDevEmail(e.target.value)}
                                className="bg-gray-800 border-gray-600 text-white"
                            />
                            <Input
                                type="password"
                                placeholder={t('enter_password')}
                                value={devPassword}
                                onChange={(e) => setDevPassword(e.target.value)}
                                className="bg-gray-800 border-gray-600 text-white"
                            />
                            <Input
                                type="text"
                                placeholder={t('enter_name_optional')}
                                value={devName}
                                onChange={(e) => setDevName(e.target.value)}
                                className="bg-gray-800 border-gray-600 text-white"
                            />
                            <Button
                                onClick={handleDevLogin}
                                disabled={!devEmail || !devPassword || providerLoading === 'dev'}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                {providerLoading === 'dev' ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <>
                                        <Code className="w-4 h-4 mr-2" />
                                        {t('dev_login')}
                                    </>
                                )}
                            </Button>
                            <div className="text-xs text-gray-400 space-y-1">
                                <p><strong>{t('admin_passwords')}:</strong></p>
                                <p>• creatanetwork@gmail.com → admin123</p>
                                <p>• {t('general_dev_password')} → dev123</p>
                                <p>• {t('other_admin_emails')} → admin123</p>
                                <p className="text-green-400 mt-2">
                                    ✅ <strong>{t('points_preserved')}</strong> on re-login!
                                </p>
                            </div>
                        </motion.div>
                    )}

                    <Button
                        onClick={() => handleLogin('google')}
                        disabled={!!providerLoading}
                        className="w-full h-12 bg-white text-gray-700 font-semibold flex items-center justify-center gap-3 hover:bg-gray-200"
                    >
                        {providerLoading === 'google' ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800"></div>
                        ) : (
                            <>
                                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    G
                                </div>
                                {t('login_google')}
                            </>
                        )}
                    </Button>
                    
                    <Button
                        onClick={() => handleLogin('kakao')}
                        disabled={!!providerLoading}
                        className="w-full h-12 bg-[#FEE500] text-[#191919] font-semibold flex items-center justify-center gap-3 hover:bg-[#FEE500]/90"
                    >
                        {providerLoading === 'kakao' ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800"></div>
                        ) : (
                            <>
                                <div className="w-5 h-5 bg-[#191919] rounded-full flex items-center justify-center text-[#FEE500] text-xs font-bold">
                                    K
                                </div>
                                {t('login_kakao')}
                            </>
                        )}
                    </Button>

                    <div className="grid grid-cols-3 gap-4 pt-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Wallet className="w-6 h-6 text-green-400" />
                            </div>
                            <p className="text-xs text-gray-400">{t('login_wallet_gen')}</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Shield className="w-6 h-6 text-blue-400" />
                            </div>
                            <p className="text-xs text-gray-400">{t('login_secure')}</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Zap className="w-6 h-6 text-purple-400" />
                            </div>
                            <p className="text-xs text-gray-400">{t('login_instant')}</p>
                        </motion.div>
                    </div>

                    <div className="text-center text-xs text-gray-500 pt-2">
                        {t('login_terms')}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}