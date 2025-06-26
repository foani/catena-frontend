// Catena 블록체인 네트워크 정보 및 토큰 전송 유틸리티

// Catena 네트워크 설정
export const CATENA_NETWORKS = {
    mainnet: {
        name: 'Catena (CIP-20) Chain Mainnet',
        rpcUrl: 'https://cvm.node.creatachain.com',
        chainId: 1000, // 0x3E8
        symbol: 'CTA',
        explorerUrl: 'https://catena.explorer.creatachain.com'
    },
    testnet: {
        name: 'Catena (CIP-20) Chain Testnet',
        rpcUrl: 'https://consensus.testnet.cvm.creatachain.com',
        chainId: 9000, // 0x2328
        symbol: 'CTA',
        explorerUrl: 'https://testnet.cvm.creatachain.com'
    }
};

// CTA 토큰 컨트랙트 주소 - 실제 CatenaChain 네이티브 토큰
// CTA는 네이티브 토큰이므로 특별한 컨트랙트 주소 없이 네이티브 잔액을 조회해야 함
export const CTA_TOKEN_CONTRACTS = {
    mainnet: 'NATIVE', // 네이티브 토큰임을 표시
    testnet: 'NATIVE'  // 네이티브 토큰임을 표시
};

// ERC-20 토큰 ABI (최소한)
export const ERC20_ABI = [
    {
        "constant": false,
        "inputs": [
            { "name": "_to", "type": "address" },
            { "name": "_value", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "name": "", "type": "bool" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    }
];

/**
 * Catena 네트워크에서 CTA 토큰을 전송하는 함수
 * 실제 환경에서는 ethers.js를 사용하지만, 여기서는 시뮬레이션
 */
export const sendCTAToken = async (toAddress, amount, senderPrivateKey, network = 'testnet') => {
    console.log(`[Catena ${network}] CTA 토큰 전송 시작...`);
    console.log(`- 받는 주소: ${toAddress}`);
    console.log(`- 전송량: ${amount} CTA`);
    console.log(`- 네트워크: ${CATENA_NETWORKS[network].name}`);
    
    // 입력 검증
    if (!toAddress || !amount || !senderPrivateKey) {
        throw new Error('필수 매개변수가 누락되었습니다.');
    }
    
    if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
        throw new Error('유효하지 않은 지갑 주소입니다.');
    }
    
    if (amount <= 0) {
        throw new Error('전송량은 0보다 커야 합니다.');
    }

    // 시뮬레이션: 실제 블록체인 트랜잭션 처리 시간
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 성공 확률 90% (실제 네트워크 오류 시뮬레이션)
    if (Math.random() < 0.1) {
        throw new Error('네트워크 오류: 트랜잭션이 실패했습니다. 가스비가 부족하거나 네트워크가 혼잡할 수 있습니다.');
    }
    
    // 시뮬레이션된 트랜잭션 해시 생성
    const mockTxHash = `0x${Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;
    
    const result = {
        hash: mockTxHash,
        blockNumber: Math.floor(Math.random() * 1000000) + 5000000,
        gasUsed: Math.floor(Math.random() * 50000) + 21000,
        network: network,
        explorerUrl: `${CATENA_NETWORKS[network].explorerUrl}/tx/${mockTxHash}`
    };
    
    console.log(`[Catena ${network}] 트랜잭션 성공!`, result);
    return result;
};

/**
 * CTA 토큰 잔액 조회 - 네이티브 토큰 잔액 조회 (eth_getBalance 사용)
 */
export const getCTABalance = async (address, network = 'testnet') => {
    console.log(`[getCTABalance] Checking native CTA balance for ${address} on ${network}`);
    
    if (!address || !address.startsWith('0x') || address.length !== 42) {
        console.error('Invalid wallet address:', address);
        throw new Error('유효하지 않은 지갑 주소입니다.');
    }
    
    if (typeof window.ethereum === 'undefined') {
        console.warn('MetaMask is not installed.');
        throw new Error('MetaMask가 설치되지 않았습니다.');
    }

    try {
        // 현재 연결된 네트워크 확인
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        const expectedChainId = `0x${CATENA_NETWORKS[network].chainId.toString(16)}`;
        
        if (currentChainId !== expectedChainId) {
            console.warn(`Network mismatch. Current: ${currentChainId}, Expected: ${expectedChainId}`);
            // 네트워크 자동 전환 시도
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: expectedChainId }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    // 네트워크가 추가되지 않은 경우 추가 시도
                    await addCatenaToWallet(network);
                } else {
                    throw new Error(`네트워크를 ${CATENA_NETWORKS[network].name}로 변경해주세요.`);
                }
            }
        }

        console.log(`[getCTABalance] Calling eth_getBalance for ${address}`);

        // eth_getBalance를 사용하여 네이티브 토큰 잔액 조회
        const balanceHex = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest'],
        });

        console.log(`[getCTABalance] Raw balance response: ${balanceHex}`);

        if (balanceHex === '0x' || balanceHex === '0x0') {
            console.log(`[getCTABalance] No balance found, returning 0`);
            return 0;
        }

        // 16진수 결과를 숫자로 변환
        const balanceInWei = BigInt(balanceHex);
        
        // 18자리 소수점 적용하여 실제 토큰 양으로 변환
        const balance = Number(balanceInWei) / (10 ** 18);
        const roundedBalance = parseFloat(balance.toFixed(4));
        
        console.log(`[getCTABalance] Final CTA balance: ${roundedBalance} CTA`);
        return roundedBalance;

    } catch (error) {
        console.error('Failed to get native CTA balance:', error);
        
        // 에러 타입에 따른 구체적인 메시지
        if (error.code === -32602) {
            throw new Error('잘못된 요청 매개변수입니다.');
        } else if (error.code === -32603) {
            throw new Error('RPC 서버 내부 오류입니다.');
        } else if (error.message && error.message.includes('network')) {
            throw new Error('네트워크 연결 문제가 있습니다.');
        } else {
            throw new Error(error.message || '잔액 조회 중 오류가 발생했습니다.');
        }
    }
};

/**
 * 지갑에 Catena 네트워크 추가 요청 (안전한 버전)
 */
export const addCatenaToWallet = async (network = 'testnet') => {
    try {
        // 브라우저 환경 체크
        if (typeof window === 'undefined') {
            throw new Error('브라우저 환경이 아닙니다.');
        }

        // 메타마스크 설치 여부 체크
        if (!window.ethereum) {
            // 메타마스크가 없는 경우 설치 안내
            const installUrl = 'https://metamask.io/download/';
            if (confirm('메타마스크가 설치되지 않았습니다. 설치 페이지로 이동하시겠습니까?')) {
                window.open(installUrl, '_blank');
            }
            throw new Error('메타마스크를 먼저 설치해주세요.');
        }

        const networkConfig = CATENA_NETWORKS[network];
        
        if (!networkConfig) {
            throw new Error(`지원하지 않는 네트워크입니다: ${network}`);
        }
        
        // 네트워크 추가 요청
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: `0x${networkConfig.chainId.toString(16)}`,
                chainName: networkConfig.name,
                nativeCurrency: {
                    name: 'CTA',
                    symbol: 'CTA',
                    decimals: 18
                },
                rpcUrls: [networkConfig.rpcUrl],
                blockExplorerUrls: [networkConfig.explorerUrl]
            }]
        });
        
        console.log(`${networkConfig.name} 네트워크가 지갑에 추가되었습니다.`);
        return true;

    } catch (error) {
        console.error('네트워크 추가 실패:', error);
        
        // 사용자 친화적인 에러 메시지
        if (error.code === 4001) {
            throw new Error('사용자가 네트워크 추가를 거부했습니다.');
        } else if (error.code === -32002) {
            throw new Error('메타마스크에서 이미 요청을 처리 중입니다. 메타마스크를 확인해주세요.');
        } else if (error.message && error.message.includes('User rejected')) {
            throw new Error('사용자가 네트워크 추가를 취소했습니다.');
        } else {
            throw new Error(error.message || '네트워크 추가 중 알 수 없는 오류가 발생했습니다.');
        }
    }
};

/**
 * 네트워크 정보를 클립보드에 복사하는 함수
 */
export const copyNetworkInfo = (network = 'testnet') => {
    const networkConfig = CATENA_NETWORKS[network];
    const networkInfo = `
Network Name: ${networkConfig.name}
RPC URL: ${networkConfig.rpcUrl}
Chain ID: ${networkConfig.chainId} (0x${networkConfig.chainId.toString(16)})
Currency Symbol: ${networkConfig.symbol}
Block Explorer URL: ${networkConfig.explorerUrl}
    `.trim();
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(networkInfo).then(() => {
            console.log('네트워크 정보가 클립보드에 복사되었습니다.');
            return true;
        }).catch(err => {
            console.error('클립보드 복사 실패:', err);
            return false;
        });
    } else {
        // 클립보드 API를 사용할 수 없는 경우 텍스트 선택으로 대체
        const textArea = document.createElement('textarea');
        textArea.value = networkInfo;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            console.log('네트워크 정보가 클립보드에 복사되었습니다 (fallback).');
            return true;
        } catch (err) {
            console.error('클립보드 복사 실패 (fallback):', err);
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
};