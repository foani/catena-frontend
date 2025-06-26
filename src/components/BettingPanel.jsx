
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from './i18n';

export default function BettingPanel({ cttPoints, mode, onPlaceBet, disabled, prediction }) {
    const { t } = useTranslation();
    const [betAmount, setBetAmount] = useState(mode?.minBet || 10);

    useEffect(() => {
        // 모드가 변경되면 베팅 금액을 최소값으로 리셋
        setBetAmount(mode?.minBet || 10);
    }, [mode]);

    const handleBetChange = (value) => {
        setBetAmount(value[0]);
    };

    const maxBet = Math.min(mode?.maxBet || 100, Math.round(cttPoints || 100));
    const potentialWin = Math.round(betAmount * (mode?.multiplier || 2));

    return (
        <div className="flex flex-col gap-4 p-4 bg-gray-800/50 border-gray-700 rounded-lg">
            <div className="text-center">
                <p className="text-gray-400 text-sm">{t('bet_amount')}</p>
                <p className="text-2xl font-bold text-white">{betAmount} <span className="text-sm text-cyan-400">CTT</span></p>
            </div>
            
            <Slider
                value={[betAmount]}
                onValueChange={handleBetChange}
                min={mode?.minBet || 10}
                max={maxBet}
                step={10}
                disabled={disabled}
                className="my-2"
            />
            
            <div className="flex justify-between text-xs text-gray-400 -mt-2">
                <span>{t('min_bet_label')}: {mode?.minBet || 10}</span>
                <span>{t('max_bet_label')}: {maxBet}</span>
            </div>
            
            <div className="text-center p-2 bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-400">{t('potential_winnings')}</p>
                <p className="text-lg font-bold text-green-400">{potentialWin} CTT</p>
            </div>
            
            <div className="w-full grid grid-cols-2 gap-3">
                <Button 
                    className={`h-16 text-lg font-bold transition-all duration-300 transform hover:scale-105 ${prediction === 'UP' ? 'bg-green-500 ring-2 ring-white' : 'bg-green-500/80 hover:bg-green-500'}`} 
                    onClick={() => onPlaceBet('UP', betAmount)} 
                    disabled={disabled || cttPoints < betAmount}
                >
                    <ArrowUp className="w-6 h-6 mr-2" /> {t('game_predict_up')}
                </Button>
                <Button 
                    className={`h-16 text-lg font-bold transition-all duration-300 transform hover:scale-105 ${prediction === 'DOWN' ? 'bg-red-500 ring-2 ring-white' : 'bg-red-500/80 hover:bg-red-500'}`} 
                    onClick={() => onPlaceBet('DOWN', betAmount)} 
                    disabled={disabled || cttPoints < betAmount}
                >
                    <ArrowDown className="w-6 h-6 mr-2" /> {t('game_predict_down')}
                </Button>
            </div>
            {cttPoints < betAmount && !disabled && (
                <p className="text-center text-xs text-red-400">{t('insufficient_balance')}</p>
            )}
        </div>
    );
}
