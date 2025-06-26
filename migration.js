// 📦 사용자 데이터 마이그레이션 도구
// localStorage → 백엔드 데이터베이스 마이그레이션

class UserDataMigrationTool {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3001/api';
        this.migrationResults = {
            total: 0,
            success: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };
    }

    // 🔍 localStorage에서 모든 사용자 데이터 읽기
    getLocalStorageUsers() {
        try {
            const rawData = localStorage.getItem('catena_users');
            if (!rawData) {
                console.log('📭 localStorage에 catena_users 데이터가 없습니다.');
                return [];
            }

            const users = JSON.parse(rawData);
            console.log(`📋 localStorage에서 ${users.length}명의 사용자 발견:`, 
                users.map(u => ({ name: u.full_name, email: u.email, score: u.score }))
            );
            
            return users;
        } catch (error) {
            console.error('❌ localStorage 데이터 읽기 실패:', error);
            return [];
        }
    }

    // 🚀 백엔드 API 호출 (에러 처리 포함)
    async apiRequest(endpoint, options = {}) {
        const url = `${this.API_BASE_URL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            return { success: true, data };
        } catch (error) {
            console.error(`❌ API 요청 실패 [${endpoint}]:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // 📤 단일 사용자 백엔드로 마이그레이션
    async migrateUser(user) {
        console.log(`📤 마이그레이션 중: ${user.full_name} (${user.email})`);

        // 사용자 데이터 정리 및 검증
        const cleanUserData = {
            id: user.id,
            full_name: user.full_name || 'Unknown User',
            email: user.email || '',
            walletAddress: user.walletAddress || '',
            score: Number(user.score) || 0,
            ctt_points: Number(user.ctt_points) || 0,
            is_admin: Boolean(user.is_admin) || false,
            created_at: user.created_at || new Date().toISOString()
        };

        // 데이터 검증
        if (!cleanUserData.email) {
            console.log(`⚠️ 이메일 없는 사용자 건너뛰기: ${cleanUserData.full_name}`);
            this.migrationResults.skipped++;
            return { success: false, reason: 'no_email' };
        }

        // 백엔드에 사용자 등록
        const result = await this.apiRequest('/register', {
            method: 'POST',
            body: JSON.stringify(cleanUserData)
        });

        if (result.success) {
            console.log(`✅ 마이그레이션 성공: ${cleanUserData.full_name} -> 백엔드`);
            this.migrationResults.success++;
            return { success: true, user: result.data.user };
        } else {
            console.log(`❌ 마이그레이션 실패: ${cleanUserData.full_name} - ${result.error}`);
            this.migrationResults.failed++;
            this.migrationResults.errors.push({
                user: cleanUserData.full_name,
                email: cleanUserData.email,
                error: result.error
            });
            return { success: false, error: result.error };
        }
    }

    // 🔄 전체 마이그레이션 실행
    async migrateAllUsers() {
        console.log('🚀 사용자 데이터 마이그레이션 시작...');
        
        // 1. localStorage 데이터 읽기
        const localUsers = this.getLocalStorageUsers();
        this.migrationResults.total = localUsers.length;

        if (localUsers.length === 0) {
            console.log('📭 마이그레이션할 사용자가 없습니다.');
            return this.migrationResults;
        }

        // 2. 중복 제거 (이메일 기준)
        const uniqueUsers = [];
        const seenEmails = new Set();
        
        localUsers.forEach(user => {
            if (user.email && !seenEmails.has(user.email)) {
                seenEmails.add(user.email);
                uniqueUsers.push(user);
            }
        });

        console.log(`🔧 중복 제거 완료: ${localUsers.length}명 → ${uniqueUsers.length}명`);

        // 3. 각 사용자 마이그레이션 실행
        for (const user of uniqueUsers) {
            await this.migrateUser(user);
            
            // API 부하 방지를 위한 딜레이
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 4. 결과 출력
        this.printMigrationResults();
        return this.migrationResults;
    }

    // 📊 마이그레이션 결과 출력
    printMigrationResults() {
        console.log('\n📊 마이그레이션 결과:');
        console.log(`총 사용자: ${this.migrationResults.total}명`);
        console.log(`✅ 성공: ${this.migrationResults.success}명`);
        console.log(`❌ 실패: ${this.migrationResults.failed}명`);
        console.log(`⚠️ 건너뜀: ${this.migrationResults.skipped}명`);

        if (this.migrationResults.errors.length > 0) {
            console.log('\n❌ 실패한 사용자들:');
            this.migrationResults.errors.forEach(err => {
                console.log(`  - ${err.user} (${err.email}): ${err.error}`);
            });
        }

        // 성공률 계산
        const successRate = this.migrationResults.total > 0 
            ? (this.migrationResults.success / this.migrationResults.total * 100).toFixed(1)
            : 0;
        
        console.log(`\n🎯 성공률: ${successRate}%`);
    }

    // 🔍 백엔드 사용자 목록 조회 (검증용)
    async getBackendUsers() {
        console.log('🔍 백엔드 사용자 목록 조회...');
        
        const result = await this.apiRequest('/admin/users');
        
        if (result.success) {
            console.log(`📋 백엔드에 ${result.data.count}명의 사용자 존재:`);
            result.data.users.forEach(user => {
                console.log(`  - ${user.full_name} (${user.email}) - 점수: ${user.score}`);
            });
            return result.data.users;
        } else {
            console.log('❌ 백엔드 사용자 조회 실패:', result.error);
            return [];
        }
    }

    // 🧹 테스트 사용자 정리 (선택적)
    async cleanupTestUsers() {
        console.log('🧹 테스트 사용자 정리 중...');
        
        // 이 기능은 백엔드에 삭제 API가 있을 때 구현
        console.log('⚠️ 테스트 사용자 삭제 기능은 수동으로 처리해야 합니다.');
        console.log('💡 백엔드 database.json에서 test@example.com 사용자를 직접 삭제하세요.');
    }

    // 🎯 전체 마이그레이션 프로세스 실행
    async runFullMigration() {
        console.log('🎯 전체 마이그레이션 프로세스 시작');
        console.log('=' .repeat(50));

        try {
            // 1. 마이그레이션 전 상태 확인
            console.log('\n1️⃣ 마이그레이션 전 상태 확인');
            await this.getBackendUsers();

            // 2. 사용자 데이터 마이그레이션 실행
            console.log('\n2️⃣ 사용자 데이터 마이그레이션 실행');
            const results = await this.migrateAllUsers();

            // 3. 마이그레이션 후 상태 확인
            console.log('\n3️⃣ 마이그레이션 후 상태 확인');
            await this.getBackendUsers();

            // 4. 완료 메시지
            console.log('\n🎉 마이그레이션 프로세스 완료!');
            
            if (results.success > 0) {
                console.log('✅ 이제 실제 사용자들이 백엔드 데이터베이스에 저장되었습니다.');
                console.log('🏆 랭킹 시스템이 정상적으로 동작할 것입니다.');
            }

            return results;

        } catch (error) {
            console.error('❌ 마이그레이션 프로세스 중 오류 발생:', error);
            return null;
        }
    }
}

// 🚀 마이그레이션 도구 실행 함수
async function runUserDataMigration() {
    const migrationTool = new UserDataMigrationTool();
    return await migrationTool.runFullMigration();
}

// 전역에서 사용 가능하도록 설정
if (typeof window !== 'undefined') {
    window.UserDataMigrationTool = UserDataMigrationTool;
    window.runUserDataMigration = runUserDataMigration;
}

console.log('🛠️ 사용자 데이터 마이그레이션 도구 로드됨');
console.log('📝 사용법: runUserDataMigration() 함수를 호출하세요');

// Node.js 환경에서도 사용 가능하도록 설정
if (typeof module !== 'undefined') {
    module.exports = { UserDataMigrationTool, runUserDataMigration };
}

// 🚀 자동 마이그레이션 실행 (2초 후)
setTimeout(() => {
    if (typeof runUserDataMigration === 'function') {
        console.log('🚀 자동 마이그레이션 시작...');
        runUserDataMigration();
    }
}, 2000);