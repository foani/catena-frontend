import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { getCurrentLanguage, setLanguage } from '@/components/i18n';

const LANGUAGES = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' }
];

export default function LanguageSelector({ onLanguageChange }) {
    const currentLanguage = getCurrentLanguage();

    const handleLanguageChange = (newLanguage) => {
        setLanguage(newLanguage);
        if (onLanguageChange) {
            onLanguageChange(newLanguage);
        }
        // Reload page to apply new language
        window.location.reload();
    };

    const currentLang = LANGUAGES.find(lang => lang.code === currentLanguage);

    return (
        <Select value={currentLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-white">
                <div className="flex items-center gap-2 text-white">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span className="text-white">{currentLang?.flag} {currentLang?.name}</span>
                </div>
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
                {LANGUAGES.map((language) => (
                    <SelectItem key={language.code} value={language.code} className="text-white hover:bg-gray-700 focus:bg-gray-700">
                        <div className="flex items-center gap-2">
                            <span>{language.flag}</span>
                            <span className="text-white">{language.name}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}