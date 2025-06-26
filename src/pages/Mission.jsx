import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, ExternalLink, Download, Clock, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useTranslation } from '@/components/i18n';

const MISSIONS = [
    {
        id: 'wallet_install',
        title: 'Creata Wallet 설치', // This title is now primarily for identification in the MISSIONS array, actual display will use i18n
        description: 'Google Play Store에서 Creata Wallet을 다운로드하세요', // Same for description
        url: 'https://play.google.com/store/apps/details?id=com.creatawallet',
        icon: Download,
        points: 500,
        ctt_points: 500, // 추가: CTT 포인트 적립
        required: true
    },
    {
        id: 'website_visit',
        title: '홈페이지 방문',
        description: 'Creata Chain 홈페이지를 10초간 방문하세요',
        url: 'https://creatachain.com/ourstory',
        icon: ExternalLink,
        points: 300,
        ctt_points: 300, // 추가: CTT 포인트 적립
        required: true,
        timer: 10
    }
];

export default function MissionPage() {
    const [user, setUser] = useState(null);
    const [completedMissions, setCompletedMissions] = useState([]);
    const [visitTimer, setVisitTimer] = useState(null);
    const [isVisiting, setIsVisiting] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await User.me();
                setUser(userData);
                setCompletedMissions(userData.completed_missions || []);
            } catch (error) {
                console.log('User not authenticated');
            }
        };
        fetchUser();
    }, []);

    const handleMissionComplete = async (missionId) => {
        const mission = MISSIONS.find(m => m.id === missionId);
        
        if (missionId === 'wallet_install') {
            // Creata Wallet 설치 링크 열기
            window.open(mission.url, '_blank');
            // 설치 후 완료 처리 (실제로는 설치 확인 로직 필요)
            setTimeout(() => {
                completeMission(missionId);
            }, 3000);
        } else if (missionId === 'website_visit') {
            setIsVisiting(true);
            window.open(mission.url, '_blank');
            
            let countdown = 10;
            setVisitTimer(countdown);
            
            const timer = setInterval(() => {
                countdown--;
                setVisitTimer(countdown);
                
                if (countdown === 0) {
                    clearInterval(timer);
                    completeMission(missionId);
                    setIsVisiting(false);
                    setVisitTimer(null);
                }
            }, 1000);
        }
    };

    const completeMission = async (missionId) => {
        if (!completedMissions.includes(missionId)) {
            const newCompleted = [...completedMissions, missionId];
            setCompletedMissions(newCompleted);
            
            const mission = MISSIONS.find(m => m.id === missionId);
            
            // 추가: CTT 포인트도 함께 업데이트
            const updatedUserData = {
                completed_missions: newCompleted,
                score: (user?.score || 0) + mission.points,
                ctt_points: (user?.ctt_points || 200) + mission.ctt_points // CTT 포인트 업데이트
            };
            
            await User.updateMyUserData(updatedUserData);
            
            setUser(prev => ({
                ...prev,
                completed_missions: newCompleted,
                score: (prev?.score || 0) + mission.points,
                ctt_points: (prev?.ctt_points || 200) + mission.ctt_points // CTT 포인트 업데이트
            }));
            
            console.log(`🎉 [미션 완료] ${missionId}: +${mission.points} score, +${mission.ctt_points} CTT`);
        }
    };

    const allMissionsCompleted = MISSIONS.every(mission => 
        completedMissions.includes(mission.id)
    );

    return (
        <div className="container mx-auto p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-cyan-400 mb-2">{t('mission_title')}</h1>
                    <p className="text-gray-400">{t('mission_description')}</p>
                </div>

                <Card className="bg-gradient-to-r from-cyan-600 to-blue-700 border-0 text-white">
                    <CardContent className="p-6 text-center">
                        <h2 className="text-2xl font-bold mb-2">
                            {completedMissions.length} / {MISSIONS.length} {t('mission_progress')}
                        </h2>
                        <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                            <div 
                                className="bg-white h-3 rounded-full transition-all duration-500"
                                style={{ width: `${(completedMissions.length / MISSIONS.length) * 100}%` }}
                            />
                        </div>
                        {allMissionsCompleted ? (
                            <Link to={createPageUrl('Game')}>
                                <Button className="bg-green-500 hover:bg-green-600 text-white">
                                    <Trophy className="w-5 h-5 mr-2" />
                                    {t('mission_game_start')}
                                </Button>
                            </Link>
                        ) : (
                            <p className="text-white/80">{t('mission_complete_all')}</p>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    {MISSIONS.map((mission, index) => {
                        const isCompleted = completedMissions.includes(mission.id);
                        const IconComponent = mission.icon;
                        
                        return (
                            <motion.div
                                key={mission.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className={`${isCompleted ? 'bg-green-900/20 border-green-500' : 'bg-gray-800/50 border-gray-700'}`}>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-cyan-500/20 rounded-lg">
                                                    <IconComponent className="w-6 h-6 text-cyan-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white">
                                                        {t(mission.id === 'wallet_install' ? 'mission_wallet_install' : 'mission_website_visit')}
                                                    </h3>
                                                    <p className="text-gray-400 text-sm">
                                                        {t(mission.id === 'wallet_install' ? 'mission_wallet_description' : 'mission_website_description')}
                                                    </p>
                                                    <p className="text-cyan-400 text-sm font-medium">+{mission.ctt_points} CTT</p>
                                                    {mission.id === 'wallet_install' && (
                                                        <p className="text-yellow-400 text-xs mt-1">
                                                            {t('mission_auto_complete_note')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {mission.id === 'website_visit' && isVisiting && visitTimer && (
                                                    <div className="flex items-center gap-2 text-yellow-400">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{visitTimer}{t('seconds_text')}</span>
                                                    </div>
                                                )}
                                                
                                                {isCompleted ? (
                                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                                ) : (
                                                    <Button 
                                                        onClick={() => handleMissionComplete(mission.id)}
                                                        disabled={isVisiting}
                                                        className="bg-cyan-600 hover:bg-cyan-700"
                                                    >
                                                        {t(mission.id === 'wallet_install' ? 'mission_install' : 'mission_visit')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}