
import React from 'react';
import { useWeb3Auth } from './Web3AuthProvider';
import LoginModal from './LoginModal';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthGuard({ children }) {
    const { isAuthenticated, isLoading, authChecked } = useWeb3Auth();

    if (isLoading || !authChecked) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="space-y-4 w-full max-w-md p-8">
                    <div className="text-center text-cyan-400 mb-4">
                         <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 p-2">
                            <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/48fa4bf4b_logo1.png" 
                                alt="CREATA Logo" 
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h1 className="text-2xl font-bold">CREATA MISSION</h1>
                        <p className="text-gray-400">Authenticating...</p>
                    </div>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginModal isOpen={true} onClose={() => {}} />;
    }

    return children;
}
