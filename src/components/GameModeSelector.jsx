import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Zap, Target, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from './i18n';

const GAME_MODES = [
    {
        id: 'quick',
        nameKey: 'quick_game',
        duration: 15,
        icon: Zap,
        multiplier: 1.8,
        minBet: 1,
        maxBet: 50,
        color: 'from-green-500 to-emerald-600'
    },
    {
        id: 'standard', 
        nameKey: 'standard_game',
        duration: 30,
        icon: Target,
        multiplier: 2.0,
        minBet: 1,
        maxBet: 100,
        color: 'from-blue-500 to-cyan-600'
    },
    {
        id: 'extended',
        nameKey: 'extended_game',
        duration: 60,
        icon: Clock,
        multiplier: 2.2,
        minBet: 5,
        maxBet: 200,
        color: 'from-purple-500 to-indigo-600'
    },
    {
        id: 'pro',
        nameKey: 'pro_mode',
        duration: 180,
        icon: TrendingUp,
        multiplier: 2.5,
        minBet: 10,
        maxBet: 500,
        color: 'from-orange-500 to-red-600'
    },
    {
        id: 'expert',
        nameKey: 'expert_mode',
        duration: 300,
        icon: Users,
        multiplier: 3.0,
        minBet: 20,
        maxBet: 1000,
        color: 'from-pink-500 to-rose-600'
    }
];

export default function GameModeSelector({ selectedMode, onModeSelect }) {
    const { t } = useTranslation();
    
    const handleModeClick = (mode) => {
        console.log('Mode clicked:', mode); // 디버그용
        if (onModeSelect) {
            onModeSelect(mode);
        }
    };
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {GAME_MODES.map((mode, index) => {
                const IconComponent = mode.icon;
                const isSelected = selectedMode?.id === mode.id;
                
                return (
                    <motion.div
                        key={mode.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Card 
                            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                                isSelected 
                                    ? 'ring-2 ring-cyan-400 bg-cyan-500/20' 
                                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                            } border-gray-700`}
                            onClick={() => handleModeClick(mode)}
                        >
                            <CardContent className="p-2 text-center">
                                <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${mode.color} flex items-center justify-center mx-auto mb-1.5`}>
                                    <IconComponent className="w-3.5 h-3.5 text-white" />
                                </div>
                                <h3 className="font-bold text-white text-xs mb-1">{t(mode.nameKey)}</h3>
                                <div className="text-[10px] leading-tight space-y-0.5">
                                    <p className="text-cyan-400">⏱️ {mode.duration}s</p>
                                    <p className="text-green-400">💰 {mode.multiplier}x</p>
                                    <p className="text-yellow-400">🎯 {mode.minBet}-{mode.maxBet} CTT</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}