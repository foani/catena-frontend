import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Gamepad2, Trophy, BarChart2, Gift, User, Target, LogOut, Users, Settings } from 'lucide-react';
import { useWeb3Auth } from '@/components/Web3AuthProvider';
import Web3AuthProvider from '@/components/Web3AuthProvider';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n';

function LayoutContent({ children }) {
    const location = useLocation();
    const { user, logout, isLoading } = useWeb3Auth();
    const { t } = useTranslation();

    // 관리자 권한 확인
    const isAdmin = user?.is_admin || user?.email === 'creatanetwork@gmail.com' || user?.full_name?.toLowerCase().includes('admin');

    // 기본 네비게이션 메뉴
    const baseNavItems = [
        { name: t('mission'), path: createPageUrl('Mission'), icon: Target },
        { name: t('game'), path: createPageUrl('Game'), icon: Gamepad2 },
        { name: t('multiplayer'), path: createPageUrl('Multiplayer'), icon: Users },
        { name: t('ranking'), path: createPageUrl('Ranking'), icon: Trophy },
        { name: t('airdrop'), path: createPageUrl('Airdrop'), icon: Gift },
        { name: t('profile'), path: createPageUrl('Profile'), icon: User },
    ];

    // 관리자 메뉴 추가 (조건부)
    const navItems = isAdmin ? [
        ...baseNavItems,
        { name: t('admin'), path: createPageUrl('Admin'), icon: Settings, adminOnly: true }
    ] : baseNavItems;

    const handleLogout = async () => {
        if (confirm(t('logout_confirm'))) {
            await logout();
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <header className="fixed top-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md border-b border-gray-700 z-50">
                <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                    <Link to={createPageUrl('Mission')} className="flex items-center gap-3">
                        <img 
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/48fa4bf4b_logo1.png" 
                            alt="CREATA Logo" 
                            className="w-8 h-8"
                        />
                        <h1 className="text-xl font-bold tracking-wider">
                            <span className="text-cyan-400">CREATA</span> MISSION
                        </h1>
                    </Link>
                    
                    <nav className="hidden md:flex items-center gap-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    location.pathname === item.path
                                        ? 'bg-cyan-500/20 text-cyan-300'
                                        : item.adminOnly 
                                        ? 'text-purple-400 hover:bg-purple-800 hover:text-white'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                    
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                           <p className="text-sm font-semibold">
                               {user?.full_name || t('user_default')}
                               {isAdmin && <span className="ml-2 text-xs bg-purple-600 px-2 py-1 rounded">{t('admin_badge')}</span>}
                           </p>
                           <p className="text-xs text-cyan-400">{t('score_label')} {user?.score || 0}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                             {user?.social_profile?.profile_image ? (
                                <img src={user.social_profile.profile_image} alt="profile" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span className="font-bold text-white">{(user?.full_name || 'U')[0]}</span>
                            )}
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-400"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="pt-16 pb-20 md:pb-0">
                {children}
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md md:hidden border-t border-gray-700">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => (
                        <Link key={item.name} to={item.path} className={`flex flex-col items-center gap-1 transition-colors ${
                             location.pathname === item.path ? 'text-cyan-400' : 
                             item.adminOnly ? 'text-purple-400 hover:text-purple-300' :
                             'text-gray-500 hover:text-cyan-400'
                        }`}>
                            <item.icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{item.name}</span>
                        </Link>
                    ))}
                </div>
            </footer>
        </div>
    );
}

export default function Layout({ children }) {
    return (
        <Web3AuthProvider>
            <AuthGuard>
                <LayoutContent>{children}</LayoutContent>
            </AuthGuard>
        </Web3AuthProvider>
    );
}