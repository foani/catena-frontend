import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { useTranslation } from './i18n';

export default function RoundResultDisplay({ result, onNextRound }) {
    const { t } = useTranslation();

    if (!result) return null;

    const { correct, payout, actual, startPrice, finalPrice, betAmount, hasBet } = result;
    
    const formatPrice = (price) => {
        if (typeof price !== 'number' || !price) return '$--';
        return price >= 1000 ? `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : `$${price.toFixed(4)}`;
    };

    const isWin = correct === true;
    const isLoss = correct === false;

    let title, message, cardClass, Icon;

    if (!hasBet || betAmount === 0) {
        title = t('round_ended');
        message = t('no_bet_placed');
        cardClass = "bg-gray-800 border-gray-600 shadow-2xl shadow-gray-500/20";
        Icon = <Clock className="w-16 h-16 text-cyan-400 mx-auto mb-4" />;
    } else if (isWin) {
        title = t('you_won');
        message = `+${Math.round(payout)} CTT`;
        cardClass = "bg-gray-800 border-green-500 shadow-2xl shadow-green-500/20";
        Icon = <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />;
    } else {
        title = t('you_lost');
        message = `-${Math.round(betAmount)} CTT`;
        cardClass = "bg-gray-800 border-red-500 shadow-2xl shadow-red-500/20";
        Icon = <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}>
                <Card className={cardClass}>
                    <CardContent className="p-8 text-center flex flex-col items-center">
                        {Icon}
                        <h2 className="text-4xl font-bold text-white mb-2">{title}</h2>
                        <p className={`text-2xl font-semibold mb-6 ${isWin ? 'text-green-300' : isLoss ? 'text-red-300' : 'text-gray-300'}`}>
                            {message}
                        </p>

                        <div className="text-gray-300 mb-6 bg-gray-900/50 p-3 rounded-lg">
                            <p className="text-sm">{t('actual_result')}: <span className={`font-bold ${actual === 'UP' ? 'text-green-400' : 'text-red-400'}`}>{actual}</span></p>
                            <div className="flex items-center justify-center gap-2 font-mono">
                                 <span>{formatPrice(startPrice)}</span>
                                 <TrendingUp className="w-4 h-4 text-gray-400" />
                                 <span>{formatPrice(finalPrice)}</span>
                            </div>
                        </div>

                        <Button onClick={onNextRound} size="lg" className="bg-cyan-600 hover:bg-cyan-700 w-full">
                            {t('next_round')}
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}