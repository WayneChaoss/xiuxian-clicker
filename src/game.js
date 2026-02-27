/**
 * xiuxian-clicker - Game Logic (Phase 3)
 * 纯功能版本，无动画效果
 */

// ========== 游戏配置 ==========
const CONFIG = {
    // 战斗系统
    combat: {
        baseDamage: 10,
        critChance: 0.1,    // 10%暴击率
        critMultiplier: 2   // 暴击2倍伤害
    },
    
    // 怪物系统
    monster: {
        baseHP: 100,
        growth: 1.15,       // 血量成长
        goldBase: 10,
        goldGrowth: 1.12,   // 金币成长
        bossHPMultiplier: 10,
        bossGoldMultiplier: 5,
        bossTimeLimit: 30   // BOSS限时30秒
    },
    
    // 灵兽系统
    spirit: {
        baseCost: 500,
        costGrowth: 1.2,
        baseDPS: 5,
        dpsGrowth: 1.1
    },
    
    // 境界划分
    realms: [
        { name: '练气期', unlockLevel: 1, bossEvery: 10 },
        { name: '筑基期', unlockLevel: 11, bossEvery: 10 },
        { name: '金丹期', unlockLevel: 31, bossEvery: 10 },
        { name: '元婴期', unlockLevel: 61, bossEvery: 10 },
        { name: '化神期', unlockLevel: 91, bossEvery: 10 },
        { name: '渡劫期', unlockLevel: 121, bossEvery: 10 }
    ],
    
    // 转生系统
    rebirth: {
        unlockLevel: 100,
        multiplier: 2
    },
    
    // 神器列表
    artifacts: [
        { id: 'sword', name: '青锋剑', baseCost: 10, effect: 'clickDamage', value: 2 },
        { id: 'ring', name: '乾坤戒', baseCost: 25, effect: 'goldGain', value: 1.5 },
        { id: 'mirror', name: '照妖镜', baseCost: 50, effect: 'critChance', value: 0.05 },
        { id: 'gourd', name: '紫金葫', baseCost: 100, effect: 'spiritDPS', value: 2 },
        { id: 'banner', name: '招魂幡', baseCost: 200, effect: 'allDamage', value: 1.5 }
    ],
    
    // 技能列表
    skills: [
        { id: 'kuangbao', name: '狂暴', cooldown: 60, duration: 10, effect: 'damageBoost', value: 3 },
        { id: 'jinhua', name: '进化', cooldown: 300, duration: 0, effect: 'instantKill', value: 0 },
        { id: 'juling', name: '聚灵', cooldown: 180, duration: 0, effect: 'goldRain', value: 60 }
    ],
    
    // 灵兽列表
    spirits: [
        { id: 'qinglong', name: '青龙', icon: '🐉', baseCost: 500 },
        { id: 'baihu', name: '白虎', icon: '🐅', baseCost: 2500 },
        { id: 'zhuque', name: '朱雀', icon: '🦅', baseCost: 12500 },
        { id: 'xuanwu', name: '玄武', icon: '🐢', baseCost: 62500 },
        { id: 'qilin', name: '麒麟', icon: '🦌', baseCost: 312500 }
    ],
    
    // 怪物列表（按境界）
    monsters: [
        { name: '野狼妖', icon: '🐺', realm: 0 },
        { name: '山魈', icon: '🦧', realm: 0 },
        { name: '铁甲犀', icon: '🦏', realm: 1 },
        { name: '火羽鹰', icon: '🦅', realm: 1 },
        { name: '玄冰蟒', icon: '🐍', realm: 2 },
        { name: '雷豹', icon: '🐆', realm: 2 },
        { name: '血魔', icon: '👹', realm: 3 },
        { name: '九尾狐', icon: '🦊', realm: 3 }
    ]
};

// ========== 游戏主类 ==========
class XiuxianGame {
    constructor() {
        this.state = this.initState();
        this.lastTick = Date.now();
        this.bossTimer = null;
        this.skillCooldowns = {};
        this.activeSkills = {};
        
        this.init();
    }
    
    initState() {
        return {
            // 基础资源
            lingShi: 0,           // 灵石（金币）
            daoXin: 0,            // 道心（转生货币）
            
            // 进度
            level: 1,             // 当前层数
            currentMonsterHP: 0,
            maxMonsterHP: 0,
            
            // 玩家属性
            clickDamage: CONFIG.combat.baseDamage,
            critChance: CONFIG.combat.critChance,
            
            // 统计
            totalClicks: 0,
            totalKills: 0,
            totalGoldEarned: 0,
            rebirthCount: 0,
            
            // 灵兽数据（id -> {level, dps}）
            spirits: {},
            
            // 神器数据（id -> level）
            artifacts: {},
            
            // 转生加成
            rebirthMultiplier: 1
        };
    }
    
    init() {
        this.loadGame();
        this.spawnMonster();
        this.startGameLoop();
        this.setupEventListeners();
        this.updateUI();
    }
    
    // ========== 核心计算 ==========
    
    // 获取当前境界
    getCurrentRealm() {
        for (let i = CONFIG.realms.length - 1; i >= 0; i--) {
            if (this.state.level >= CONFIG.realms[i].unlockLevel) {
                return CONFIG.realms[i];
            }
        }
        return CONFIG.realms[0];
    }
    
    // 计算怪物血量
    calculateMonsterHP(level) {
        const baseHP = CONFIG.monster.baseHP * Math.pow(CONFIG.monster.growth, level - 1);
        return Math.floor(baseHP);
    }
    
    // 计算金币奖励
    calculateGoldReward(level) {
        const baseGold = CONFIG.monster.goldBase * Math.pow(CONFIG.monster.goldGrowth, level - 1);
        let gold = Math.floor(baseGold * (0.9 + Math.random() * 0.2));
        
        // 神器加成
        const ringLevel = this.state.artifacts['ring'] || 0;
        if (ringLevel > 0) {
            const artifact = CONFIG.artifacts.find(a => a.id === 'ring');
            gold = Math.floor(gold * Math.pow(artifact.value, ringLevel));
        }
        
        return gold;
    }
    
    // 计算点击伤害
    calculateClickDamage() {
        let damage = this.state.clickDamage * this.state.rebirthMultiplier;
        
        // 技能加成
        if (this.activeSkills['kuangbao']) {
            const skill = CONFIG.skills.find(s => s.id === 'kuangbao');
            damage *= skill.value;
        }
        
        // 神器加成
        const swordLevel = this.state.artifacts['sword'] || 0;
        if (swordLevel > 0) {
            const artifact = CONFIG.artifacts.find(a => a.id === 'sword');
            damage *= Math.pow(artifact.value, swordLevel);
        }
        
        return Math.floor(damage);
    }
    
    // 计算总DPS
    calculateTotalDPS() {
        let totalDPS = 0;
        
        for (const [spiritId, spiritData] of Object.entries(this.state.spirits)) {
            const spiritConfig = CONFIG.spirits.find(s => s.id === spiritId);
            const baseDPS = CONFIG.spirit.baseDPS * Math.pow(CONFIG.spirit.dpsGrowth, spiritData.level - 1);
            totalDPS += baseDPS;
        }
        
        // 神器加成
        const gourdLevel = this.state.artifacts['gourd'] || 0;
        if (gourdLevel > 0) {
            const artifact = CONFIG.artifacts.find(a => a.id === 'gourd');
            totalDPS *= Math.pow(artifact.value, gourdLevel);
        }
        
        return Math.floor(totalDPS * this.state.rebirthMultiplier);
    }
    
    // 计算灵兽价格
    calculateSpiritCost(spiritId) {
        const spiritConfig = CONFIG.spirits.find(s => s.id === spiritId);
        const ownedLevel = this.state.spirits[spiritId]?.level || 0;
        return Math.floor(spiritConfig.baseCost * Math.pow(CONFIG.spirit.costGrowth, ownedLevel));
    }
    
    // 计算神器价格
    calculateArtifactCost(artifactId) {
        const artifactConfig = CONFIG.artifacts.find(a => a.id === artifactId);
        const ownedLevel = this.state.artifacts[artifactId] || 0;
        return Math.floor(artifactConfig.baseCost * Math.pow(2, ownedLevel));
    }
    
    // ========== 游戏循环 ==========
    
    startGameLoop() {
        setInterval(() => this.gameTick(), 100); // 100ms tick
    }
    
    gameTick() {
        const now = Date.now();
        const delta = (now - this.lastTick) / 1000; // 秒
        this.lastTick = now;
        
        // DPS伤害
        const dps = this.calculateTotalDPS();
        if (dps > 0 && this.state.currentMonsterHP > 0) {
            const damage = dps * delta;
            this.dealDamage(damage, false);
        }
        
        // BOSS倒计时
        if (this.isBossLevel() && this.bossTimer !== null) {
            this.bossTimer -= delta;
            if (this.bossTimer <= 0) {
                this.onBossTimeout();
            }
        }
        
        // 技能CD更新
        this.updateSkillCooldowns(delta);
        
        this.updateUI();
    }
    
    // ========== 战斗系统 ==========
    
    spawnMonster() {
        const isBoss = this.isBossLevel();
        let hp = this.calculateMonsterHP(this.state.level);
        
        if (isBoss) {
            hp *= CONFIG.monster.bossHPMultiplier;
            this.bossTimer = CONFIG.monster.bossTimeLimit;
        } else {
            this.bossTimer = null;
        }
        
        this.state.currentMonsterHP = hp;
        this.state.maxMonsterHP = hp;
        
        this.updateUI();
    }
    
    isBossLevel() {
        const realm = this.getCurrentRealm();
        const levelInRealm = this.state.level - realm.unlockLevel + 1;
        return levelInRealm % realm.bossEvery === 0;
    }
    
    dealDamage(damage, isClick = false) {
        // 暴击判定
        let isCrit = false;
        if (isClick && Math.random() < this.state.critChance) {
            damage *= CONFIG.combat.critMultiplier;
            isCrit = true;
        }
        
        damage = Math.floor(damage);
        this.state.currentMonsterHP = Math.max(0, this.state.currentMonsterHP - damage);
        
        // 动画占位（Phase 4实现）
        // showDamageNumber(damage, isCrit);
        
        if (this.state.currentMonsterHP <= 0) {
            this.onMonsterKill();
        }
        
        this.updateUI();
    }
    
    onMonsterKill() {
        // 金币奖励
        let gold = this.calculateGoldReward(this.state.level);
        if (this.isBossLevel()) {
            gold *= CONFIG.monster.bossGoldMultiplier;
        }
        
        this.state.lingShi += gold;
        this.state.totalGoldEarned += gold;
        this.state.totalKills++;
        
        // 动画占位（Phase 4实现）
        // showGoldFly(gold);
        
        // 下一层
        this.state.level++;
        this.spawnMonster();
        this.saveGame();
    }
    
    onBossTimeout() {
        // BOSS超时，回退到本层开始
        this.bossTimer = CONFIG.monster.bossTimeLimit;
        this.state.currentMonsterHP = this.state.maxMonsterHP;
        this.updateUI();
    }
    
    // ========== 点击攻击 ==========
    
    onClick() {
        this.state.totalClicks++;
        const damage = this.calculateClickDamage();
        this.dealDamage(damage, true);
    }
    
    // ========== 灵兽系统 ==========
    
    buySpirit(spiritId) {
        const cost = this.calculateSpiritCost(spiritId);
        
        if (this.state.lingShi < cost) {
            return false;
        }
        
        this.state.lingShi -= cost;
        
        if (!this.state.spirits[spiritId]) {
            this.state.spirits[spiritId] = { level: 0 };
        }
        this.state.spirits[spiritId].level++;
        
        this.saveGame();
        this.updateUI();
        return true;
    }
    
    // ========== 神器系统 ==========
    
    buyArtifact(artifactId) {
        const cost = this.calculateArtifactCost(artifactId);
        
        if (this.state.daoXin < cost) {
            return false;
        }
        
        this.state.daoXin -= cost;
        this.state.artifacts[artifactId] = (this.state.artifacts[artifactId] || 0) + 1;
        
        this.saveGame();
        this.updateUI();
        return true;
    }
    
    // ========== 技能系统 ==========
    
    useSkill(skillId) {
        // 检查CD
        if (this.skillCooldowns[skillId] > 0) {
            return false;
        }
        
        const skill = CONFIG.skills.find(s => s.id === skillId);
        
        // 启动技能效果
        this.activateSkill(skill);
        
        // 设置CD
        this.skillCooldowns[skillId] = skill.cooldown;
        
        this.updateUI();
        return true;
    }
    
    activateSkill(skill) {
        switch (skill.effect) {
            case 'damageBoost':
                this.activeSkills[skill.id] = true;
                setTimeout(() => {
                    delete this.activeSkills[skill.id];
                    this.updateUI();
                }, skill.duration * 1000);
                break;
                
            case 'instantKill':
                // 进化：直接秒杀当前怪物
                this.state.currentMonsterHP = 0;
                this.onMonsterKill();
                break;
                
            case 'goldRain':
                // 聚灵：获得60秒DPS等价的金币
                const dps = this.calculateTotalDPS();
                const gold = dps * skill.value;
                this.state.lingShi += gold;
                this.state.totalGoldEarned += gold;
                break;
        }
    }
    
    updateSkillCooldowns(delta) {
        for (const skillId in this.skillCooldowns) {
            this.skillCooldowns[skillId] = Math.max(0, this.skillCooldowns[skillId] - delta);
        }
    }
    
    // ========== 转生系统 ==========
    
    canRebirth() {
        return this.state.level >= CONFIG.rebirth.unlockLevel;
    }
    
    calculateRebirthReward() {
        // 道心 = log10(总金币) * 系数
        return Math.floor(Math.log10(Math.max(10, this.state.totalGoldEarned)) * CONFIG.rebirth.multiplier);
    }
    
    doRebirth() {
        if (!this.canRebirth()) {
            return false;
        }
        
        const reward = this.calculateRebirthReward();
        
        // 保存跨转世数据
        const savedArtifacts = { ...this.state.artifacts };
        const savedSpirits = {}; // 只保留解锁状态
        for (const id in this.state.spirits) {
            savedSpirits[id] = { level: 0 }; // 等级重置，保留解锁
        }
        
        // 重置游戏
        this.state = this.initState();
        this.state.rebirthCount++;
        this.state.rebirthMultiplier = Math.pow(CONFIG.rebirth.multiplier, this.state.rebirthCount);
        this.state.artifacts = savedArtifacts;
        this.state.spirits = savedSpirits;
        this.state.daoXin = reward;
        
        this.state.totalGoldEarned = 0; // 重置累计金币
        
        this.spawnMonster();
        this.saveGame();
        this.updateUI();
        
        return true;
    }
    
    // ========== 存档系统 ==========
    
    saveGame() {
        localStorage.setItem('xiuxianClicker', JSON.stringify(this.state));
    }
    
    loadGame() {
        const saved = localStorage.getItem('xiuxianClicker');
        if (saved) {
            try {
                const loaded = JSON.parse(saved);
                this.state = { ...this.state, ...loaded };
            } catch (e) {
                console.error('存档加载失败', e);
            }
        }
    }
    
    // ========== UI更新（Phase 4中会完全重构） ==========
    
    updateUI() {
        // 资源显示
        document.getElementById('lingShi').textContent = this.formatNumber(this.state.lingShi);
        document.getElementById('daoXin').textContent = this.formatNumber(this.state.daoXin);
        document.getElementById('dpsDisplay').textContent = `DPS: ${this.formatNumber(this.calculateTotalDPS())}`;
        document.getElementById('spsDisplay').textContent = `SPS: ${this.formatNumber(this.calculateTotalDPS() * 60)}`;
        
        // 境界和层数
        const realm = this.getCurrentRealm();
        document.getElementById('realmName').textContent = realm.name;
        document.getElementById('currentLevel').textContent = `第 ${this.state.level} 层`;
        
        // 进度条
        const levelInRealm = this.state.level - realm.unlockLevel + 1;
        const progress = levelInRealm % realm.bossEvery;
        const progressPercent = (progress / realm.bossEvery) * 100;
        document.getElementById('levelProgressFill').style.width = `${progressPercent}%`;
        document.getElementById('levelProgressText').textContent = `${progress} / ${realm.bossEvery}`;
        
        // 怪物
        const monsterIndex = (this.state.level - 1) % CONFIG.monsters.length;
        const monster = CONFIG.monsters[monsterIndex];
        document.getElementById('monsterName').textContent = monster.name;
        document.querySelector('.placeholder-monster').textContent = monster.icon;
        
        // 血条
        const hpPercent = (this.state.currentMonsterHP / this.state.maxMonsterHP) * 100;
        document.getElementById('monsterHpFill').style.width = `${hpPercent}%`;
        document.getElementById('monsterHpText').textContent = 
            `${this.formatNumber(this.state.currentMonsterHP)} / ${this.formatNumber(this.state.maxMonsterHP)}`;
        
        // BOSS倒计时
        const bossTimerEl = document.getElementById('bossTimer');
        if (this.isBossLevel() && this.bossTimer !== null) {
            bossTimerEl.style.display = 'block';
            document.getElementById('bossTimeLeft').textContent = Math.ceil(this.bossTimer);
            const timerPercent = (this.bossTimer / CONFIG.monster.bossTimeLimit) * 100;
            document.getElementById('bossTimerFill').style.width = `${timerPercent}%`;
        } else {
            bossTimerEl.style.display = 'none';
        }
        
        // 灵兽列表
        this.updateSpiritList();
        
        // 技能CD
        this.updateSkillUI();
        
        // 神器点数
        document.getElementById('artifactPoints').textContent = this.formatNumber(this.state.daoXin);
        
        // 转生奖励
        document.getElementById('rebirthReward').textContent = this.formatNumber(this.calculateRebirthReward());
        
        // 统计数据
        document.getElementById('statClicks').textContent = this.formatNumber(this.state.totalClicks);
        document.getElementById('statKills').textContent = this.formatNumber(this.state.totalKills);
        document.getElementById('statTotalGold').textContent = this.formatNumber(this.state.totalGoldEarned);
        document.getElementById('statRebirths').textContent = this.state.rebirthCount;
    }
    
    updateSpiritList() {
        const listEl = document.getElementById('spiritList');
        listEl.innerHTML = '';
        
        CONFIG.spirits.forEach(spirit => {
            const owned = this.state.spirits[spirit.id];
            const level = owned ? owned.level : 0;
            const cost = this.calculateSpiritCost(spirit.id);
            const dps = level > 0 ? Math.floor(CONFIG.spirit.baseDPS * Math.pow(CONFIG.spirit.dpsGrowth, level - 1)) : 0;
            
            const item = document.createElement('div');
            item.className = 'spirit-item';
            item.innerHTML = `
                <div class="spirit-avatar">${spirit.icon}</div>
                <div class="spirit-info">
                    <div class="spirit-name">${spirit.name}</div>
                    <div class="spirit-level">等级 ${level}</div>
                    ${level > 0 ? `<div class="spirit-dps">DPS: ${this.formatNumber(dps)}</div>` : ''}
                </div>
                <button class="spirit-upgrade-btn" data-spirit="${spirit.id}" ${this.state.lingShi < cost ? 'disabled' : ''}>
                    <div class="upgrade-cost">${this.formatNumber(cost)} 💎</div>
                    <div class="upgrade-label">${level > 0 ? '升级' : '召唤'}</div>
                </button>
            `;
            listEl.appendChild(item);
        });
        
        // 绑定事件
        listEl.querySelectorAll('.spirit-upgrade-btn').forEach(btn => {
            btn.onclick = () => this.buySpirit(btn.dataset.spirit);
        });
    }
    
    updateSkillUI() {
        CONFIG.skills.forEach((skill, index) => {
            const cd = this.skillCooldowns[skill.id] || 0;
            const cdText = document.getElementById(`cdText${index + 1}`);
            const cdProgress = document.getElementById(`cdProgress${index + 1}`);
            
            if (cd > 0) {
                cdText.textContent = Math.ceil(cd);
                const percent = (cd / skill.cooldown) * 100;
                const circumference = 2 * Math.PI * 28;
                cdProgress.style.strokeDasharray = circumference;
                cdProgress.style.strokeDashoffset = circumference * (percent / 100);
            } else {
                cdText.textContent = '';
                cdProgress.style.strokeDashoffset = 0;
            }
        });
    }
    
    // ========== 事件绑定 ==========
    
    setupEventListeners() {
        // 点击攻击
        document.getElementById('clickArea').onclick = () => this.onClick();
        
        // 技能按钮
        CONFIG.skills.forEach((skill, index) => {
            document.getElementById(`skillSlot${index + 1}`).onclick = () => this.useSkill(skill.id);
        });
        
        // 菜单按钮
        document.getElementById('menuBtn').onclick = () => this.showModal('menuModal');
        document.getElementById('closeMenu').onclick = () => this.hideModal('menuModal');
        
        // 神器
        document.getElementById('artifactMenuBtn').onclick = () => {
            this.updateArtifactList();
            this.showModal('artifactModal');
        };
        document.getElementById('closeArtifact').onclick = () => this.hideModal('artifactModal');
        
        // 转生
        document.getElementById('rebirthMenuBtn').onclick = () => {
            document.getElementById('confirmRebirth').disabled = !this.canRebirth();
            this.showModal('rebirthModal');
        };
        document.getElementById('closeRebirth')?.onclick = () => this.hideModal('rebirthModal');
        document.getElementById('cancelRebirth').onclick = () => this.hideModal('rebirthModal');
        document.getElementById('confirmRebirth').onclick = () => {
            if (this.doRebirth()) {
                this.hideModal('rebirthModal');
            }
        };
        
        // 数据
        document.getElementById('statsMenuBtn').onclick = () => this.showModal('statsModal');
        document.getElementById('closeStats').onclick = () => this.hideModal('statsModal');
        
        // 灵兽面板折叠
        document.querySelector('.panel-header').onclick = () => {
            const list = document.getElementById('spiritList');
            const btn = document.getElementById('toggleSpirit');
            list.classList.toggle('collapsed');
            btn.classList.toggle('collapsed');
        };
    }
    
    updateArtifactList() {
        const listEl = document.getElementById('artifactList');
        listEl.innerHTML = '';
        
        CONFIG.artifacts.forEach(artifact => {
            const level = this.state.artifacts[artifact.id] || 0;
            const cost = this.calculateArtifactCost(artifact.id);
            
            const item = document.createElement('div');
            item.className = 'artifact-item';
            item.innerHTML = `
                <div class="artifact-info">
                    <div class="artifact-name">${artifact.name} ${level > 0 ? `(Lv.${level})` : ''}</div>
                    <div class="artifact-desc">${this.getArtifactDesc(artifact)}</div>
                </div>
                <button class="artifact-btn" data-artifact="${artifact.id}" ${this.state.daoXin < cost ? 'disabled' : ''}>
                    ${this.formatNumber(cost)} ⚡
                </button>
            `;
            listEl.appendChild(item);
        });
        
        listEl.querySelectorAll('.artifact-btn').forEach(btn => {
            btn.onclick = () => this.buyArtifact(btn.dataset.artifact);
        });
    }
    
    getArtifactDesc(artifact) {
        const descs = {
            'sword': '点击伤害翻倍',
            'ring': '金币收益+50%',
            'mirror': '暴击率+5%',
            'gourd': '灵兽DPS翻倍',
            'banner': '全部伤害+50%'
        };
        return descs[artifact.id] || '';
    }
    
    showModal(id) {
        document.getElementById(id).classList.add('show');
    }
    
    hideModal(id) {
        document.getElementById(id).classList.remove('show');
    }
    
    // ========== 工具方法 ==========
    
    formatNumber(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return Math.floor(num).toString();
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    window.game = new XiuxianGame();
});
