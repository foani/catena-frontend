import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from '@/api/entities';
import { useWeb3Auth } from '@/components/Web3AuthProvider';
import { Crown, Key, Users } from 'lucide-react';

export default function AdminSetup() {
    const { user } = useWeb3Auth();
    const [secretCode, setSecretCode] = useState('');
    const [allUsers, setAllUsers] = useState(User.filter());

    // 시크릿 코드로 관리자 되기
    const handleSecretCode = () => {
        const validCodes = ['admin123', 'catena-admin', 'creata-admin', 'master'];
        
        if (validCodes.includes(secretCode.toLowerCase())) {
            if (user) {
                User.updateMyUserData({ is_admin: true });
                alert('🎉 You are now an admin! Please refresh the page.');
                setSecretCode('');
            }
        } else {
            alert('❌ Invalid secret code');
            setSecretCode('');
        }
    };

    // 현재 사용자를 관리자로 설정
    const makeMeAdmin = () => {
        if (user) {
            User.updateMyUserData({ is_admin: true });
            alert('🎉 You are now an admin! Please refresh the page.');
        }
    };

    // 다른 사용자를 관리자로 설정
    const makeUserAdmin = (userId) => {
        const targetUser = User.findById(userId);
        if (targetUser) {
            User.update(userId, { is_admin: true });
            alert(`🎉 ${targetUser.full_name} is now an admin!`);
            setAllUsers(User.filter()); // 목록 새로고침
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <Card className="bg-gray-800/50 border-gray-700 mb-6">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Crown className="w-6 h-6 text-yellow-500" />
                        Admin Setup Panel
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 방법 1: 시크릿 코드 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            Secret Code
                        </h3>
                        <div className="flex gap-2">
                            <Input
                                type="password"
                                placeholder="Enter secret code..."
                                value={secretCode}
                                onChange={(e) => setSecretCode(e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white"
                                onKeyPress={(e) => e.key === 'Enter' && handleSecretCode()}
                            />
                            <Button 
                                onClick={handleSecretCode}
                                className="bg-yellow-600 hover:bg-yellow-700"
                                disabled={!secretCode}
                            >
                                Unlock
                            </Button>
                        </div>
                        <p className="text-xs text-gray-400">
                            Hint: admin123, catena-admin, creata-admin, master
                        </p>
                    </div>

                    {/* 방법 2: 원클릭 관리자 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-cyan-400">Quick Admin</h3>
                        <Button 
                            onClick={makeMeAdmin}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                            <Crown className="w-4 h-4 mr-2" />
                            Make Me Admin
                        </Button>
                    </div>

                    {/* 방법 3: 사용자 목록에서 선택 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Grant Admin to User
                        </h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {allUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center">
                                            <span className="font-bold text-white text-sm">{u.full_name[0]}</span>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{u.full_name}</p>
                                            <p className="text-xs text-gray-400">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {u.is_admin && (
                                            <Badge className="bg-purple-600">Admin</Badge>
                                        )}
                                        <Button
                                            size="sm"
                                            onClick={() => makeUserAdmin(u.id)}
                                            disabled={u.is_admin}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            {u.is_admin ? '✓' : 'Make Admin'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}