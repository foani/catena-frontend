import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ExternalLink, Copy, RefreshCw, CheckCircle, Info, AlertCircle, Loader2 } from 'lucide-react';
import { CATENA_NETWORKS, getCTABalance, addCatenaToWallet } from './CatenaBlockchain';
import { useTranslation } from './i18n';

export default function CatenaWallet({ user, onBalanceUpdate }) {
    const [balance, setBalance] = useState(0);
    const [connectedAddress, setConnectedAddress] = useState(null);
    const [network, setNetwork] = useState('testnet');
    const [isLoading, setIsLoading] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const { t } = useTranslation();

    const refreshBalance = useCallback(async (address) => {
        if (!address) {
            setBalance(0);
            if (onBalanceUpdate) onBalanceUpdate(0);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const currentNetworkId = await window.ethereum.request({ method: 'eth_chainId' });
            const currentNetworkKey = Object.keys(CATENA_NETWORKS).find(key => `0x${CATENA_NETWORKS[key].chainId.toString(16)}` === currentNetworkId) || 'testnet';
            setNetwork(currentNetworkKey);
            
            console.log(`🔍 Fetching CTA balance for ${address} on ${currentNetworkKey}`);
            const newBalance = await getCTABalance(address, currentNetworkKey);
            
            setBalance(newBalance);
            if (onBalanceUpdate) {
                onBalanceUpdate(newBalance);
            }
            
            console.log(`✅ Balance updated: ${newBalance} CTA for ${address}`);
        } catch (err) {
            console.error("❌ Failed to refresh balance:", err);
            setError(err.message || "Failed to get balance.");
            setBalance(0);
        } finally {
            setIsLoading(false);
        }
    }, [onBalanceUpdate]);

    // 이벤트 리스너 등록 (한 번만 등록되도록 빈 배열 의존성)
    useEffect(() => {
        if (typeof window.ethereum === 'undefined') {
            setError('MetaMask is not installed.');
            return;
        }

        // 1. 초기 계정 확인
        const initializeWallet = async () => {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                const initialAddress = accounts[0] || null;
                if (initialAddress) {
                    console.log(`🎯 Initial wallet address: ${initialAddress}`);
                    setConnectedAddress(initialAddress);
                    await refreshBalance(initialAddress);
                }
            } catch (err) {
                console.error("❌ Failed to get initial accounts", err);
            }
        };

        initializeWallet();

        // 2. 계정 변경 이벤트 핸들러 - 디버깅 로그 추가
        const handleAccountsChanged = async (accounts) => {
            console.log('🔥 accountsChanged event fired:', accounts);  // 핵심 디버깅 로그
            const newAddress = accounts[0] || null;
            console.log(`📍 Account changed to: ${newAddress}`);
            
            if (newAddress) {
                console.log(`🔄 Updating connected address from UI`);
                setConnectedAddress(newAddress);
                await refreshBalance(newAddress);
            } else {
                console.log(`🚫 No account connected`);
                setConnectedAddress(null);
                setBalance(0);
                if (onBalanceUpdate) onBalanceUpdate(0);
            }
        };

        // 3. 네트워크 변경 이벤트 핸들러
        const handleChainChanged = () => {
            console.log('🌐 Network changed, reloading page.');
            window.location.reload();
        };

        // 4. 이벤트 리스너 등록
        console.log('📡 Registering MetaMask event listeners');
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        // 5. 클린업
        return () => {
            console.log('🧹 Cleaning up MetaMask event listeners');
            if (window.ethereum.removeListener) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
    }, []); // 빈 배열로 고정하여 한 번만 등록

    // 주기적 동기화 (이벤트 누락에 대한 안전장치)
    useEffect(() => {
        if (typeof window.ethereum === 'undefined') return;

        const interval = setInterval(async () => {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                const currentAddress = accounts[0] || null;
                
                if (currentAddress !== connectedAddress) {
                    console.log('🌀 Address mismatch detected via polling. Syncing...');
                    console.log(`   App address: ${connectedAddress}`);
                    console.log(`   MetaMask address: ${currentAddress}`);
                    
                    setConnectedAddress(currentAddress);
                    if (currentAddress) {
                        await refreshBalance(currentAddress);
                    } else {
                        setBalance(0);
                        if (onBalanceUpdate) onBalanceUpdate(0);
                    }
                }
            } catch (error) {
                console.error('❌ Polling sync failed:', error);
            }
        }, 3000); // 3초마다 체크

        return () => clearInterval(interval);
    }, [connectedAddress, refreshBalance, onBalanceUpdate]);

    const connectMetaMask = async () => {
        if (isConnecting) return;
        setIsConnecting(true);
        setError(null);
        
        try {
            console.log('🔗 Requesting MetaMask connection...');
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0] || null;
            if (address) {
                console.log(`✅ Connected to wallet: ${address}`);
                setConnectedAddress(address);
                await refreshBalance(address);
            }
        } catch (err) {
            console.error("❌ Failed to connect MetaMask", err);
            if (err.code === 4001) {
                setError('Connection refused by user.');
            } else {
                setError('Failed to connect MetaMask.');
            }
        } finally {
            setIsConnecting(false);
        }
    };
    
    const handleManualRefresh = useCallback(async () => {
        console.log('🔄 Manual refresh triggered');
        if (connectedAddress) {
            await refreshBalance(connectedAddress);
        } else {
            // 수동 새로고침 시 MetaMask에서 현재 주소를 다시 가져와서 동기화
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                const currentAddress = accounts[0] || null;
                if (currentAddress) {
                    console.log(`🎯 Manual refresh found address: ${currentAddress}`);
                    setConnectedAddress(currentAddress);
                    await refreshBalance(currentAddress);
                }
            } catch (error) {
                console.error('❌ Manual refresh failed:', error);
                setError('Manual refresh failed: ' + error.message);
            }
        }
    }, [connectedAddress, refreshBalance]);

    const addCatenaNetwork = async (networkName = 'testnet') => {
        try {
            await addCatenaToWallet(networkName);
            alert(`${CATENA_NETWORKS[networkName].name} 네트워크가 성공적으로 추가되었습니다!`);
        } catch (error) {
            console.error('네트워크 추가 실패:', error);
            alert(`네트워크 추가 실패: ${error.message}`);
        }
    };
    
    const copyAddress = () => {
        if (connectedAddress) {
            navigator.clipboard.writeText(connectedAddress);
            alert('지갑 주소가 복사되었습니다!');
        }
    };

    const openInExplorer = () => {
        if (connectedAddress) {
            const explorerUrl = CATENA_NETWORKS[network]?.explorerUrl ? `${CATENA_NETWORKS[network].explorerUrl}/address/${connectedAddress}` : `https://etherscan.io/address/${connectedAddress}`;
            window.open(explorerUrl, '_blank');
        }
    };

    return (
        <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-cyan-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-6 h-6" /> 
                        MetaMask Wallet ({CATENA_NETWORKS[network]?.name || 'Unknown Network'})
                    </div>
                    <Button 
                        onClick={handleManualRefresh}
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-white" 
                        disabled={isLoading}
                        title="지갑 정보 새로고침"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}
                
                {!connectedAddress ? (
                    <div className="text-center p-6 space-y-4 bg-gray-900/50 rounded-lg">
                         <Wallet className="w-12 h-12 text-cyan-400 mx-auto" />
                         <h3 className="text-lg font-bold text-white">{t('connect_wallet_please')}</h3>
                         <p className="text-sm text-gray-300">{t('connect_wallet_to_check_balance')}</p>
                         <Button 
                             onClick={connectMetaMask} 
                             disabled={isConnecting} 
                             className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                         >
                             {isConnecting ? t('connecting_wallet') : t('connect_metamask')}
                         </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-700/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-gray-400">Connected Wallet Address</p>
                                <div className="flex items-center gap-1 text-green-400 text-xs">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Connected</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="font-mono text-sm text-white break-all">{connectedAddress}</p>
                                <div className="flex gap-2">
                                    <Button onClick={copyAddress} variant="outline" size="icon" className="h-8 w-8"><Copy className="w-4 h-4" /></Button>
                                    <Button onClick={openInExplorer} variant="outline" size="icon" className="h-8 w-8"><ExternalLink className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-green-500/10 rounded-lg text-center border border-green-500/20">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <Loader2 className="w-8 h-8 animate-spin text-yellow-400 mb-2" />
                                        <p className="text-sm text-gray-400">조회 중...</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-3xl font-bold text-green-400">{balance.toLocaleString()}</p>
                                        <p className="text-sm text-gray-400">CTA Balance</p>
                                    </>
                                )}
                            </div>
                            <div className="p-4 bg-cyan-500/10 rounded-lg text-center border border-cyan-500/20">
                                <p className="text-3xl font-bold text-cyan-400">{user?.score || 0}</p>
                                <p className="text-sm text-gray-400">Game Score</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Button 
                                    onClick={() => addCatenaNetwork('testnet')}
                                    variant="outline" 
                                    className="flex-1"
                                >
                                    Add Testnet
                                </Button>
                                <Button 
                                    onClick={() => addCatenaNetwork('mainnet')}
                                    variant="outline" 
                                    className="flex-1"
                                >
                                    Add Mainnet
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}