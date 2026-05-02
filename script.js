let lastCalledTime;
let fps;
const fpsDisplay = document.getElementById('fpsCounter');

function updateFPS() {
    if (!lastCalledTime) {
        lastCalledTime = performance.now();
        fps = 0;
        return;
    }

    // Cálculo matemático de los FPS
    let delta = (performance.now() - lastCalledTime) / 1000;
    lastCalledTime = performance.now();
    fps = Math.round(1 / delta);

    // Cambio de colores según el rendimiento
    if (fps >= 50) {
        fpsDisplay.style.color = "#00ff00"; // Verde (Fluido)
    } else if (fps >= 30) {
        fpsDisplay.style.color = "#ffff00"; // Amarillo (Lag medio)
    } else {
        fpsDisplay.style.color = "#ff0000"; // Rojo (Mucho lag)
    }

    fpsDisplay.innerText = `FPS: ${fps}`;
}
// --- CORE GAME SETUP ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// --- DOM ELEMENTS ---
const mainMenu = document.getElementById('main-menu');
const difficultyMenu = document.getElementById('difficulty-menu');
const gameOverScreen = document.getElementById('game-over-screen');
const adminMenu = document.getElementById('admin-menu');
const pauseMenu = document.getElementById('pause-menu');
const levelUpMenu = document.getElementById('levelup-menu');
const characterSelectMenu = document.getElementById('character-select-menu');
const shopMenu = document.getElementById('shop-menu');
const inventoryMenu = document.getElementById('inventory-menu');    
const rouletteMenu = document.getElementById('roulette-menu');
const talentTreeMenu = document.getElementById('talent-tree-menu');
const settingsMenu = document.getElementById('settings-menu');
const achievementsMenu = document.getElementById('achievements-menu');
const healthBarFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const xpBarFill = document.getElementById('xp-bar-fill');
const xpText = document.getElementById('xp-text');
const bombsDisplay = document.getElementById('bombs-display');
const crossAttacksDisplay = document.getElementById('cross-attacks-display');
const chestsDisplay = document.getElementById('chests-display');
const legendaryChestsDisplay = document.getElementById('legendary-chests-display');
const buffIndicator = document.getElementById('buff-indicator');
const buffName = document.getElementById('buff-name');
const buffTime = document.getElementById('buff-time');
const waveDisplay = document.getElementById('wave-display');
const waveIndicator = document.getElementById('wave-indicator');
const enemiesLeftDisplay = document.getElementById('enemies-left');
const enemiesToSpawnDisplay = document.getElementById('enemies-to-spawn');
const rebirthButton = document.getElementById('rebirth-button');
const rebirthCostDisplay = document.getElementById('rebirth-cost');
const bossHealthContainer = document.getElementById('boss-health-container');
const bossHealthFill = document.getElementById('boss-health-fill');
const bossName = document.getElementById('boss-name');
const coinsDisplay = document.getElementById('coins-display');
const timeValue = document.getElementById('time-value');
const rebirthLevelDisplay = document.getElementById('rebirth-level-display');
const gamepadIndicator = document.getElementById('gamepad-indicator');

// --- ASSET MANAGER ---
const images = {};
let assetsLoaded = 0;
let totalAssets = 0;

function loadAsset(name, src) {
    totalAssets++;
    const img = new Image();
    img.src = src;
    img.onload = () => {
        images[name] = img;
        assetsLoaded++;
        console.log(`Asset cargado: ${name}. Progreso: ${assetsLoaded}/${totalAssets}`);
        if (assetsLoaded === totalAssets) {
            console.log("Todos los assets cargados.");
        }
    };
    img.onerror = () => {
        console.error(`Error al cargar la imagen: ${src}`);
        assetsLoaded++; // Marcar como "cargado" para no bloquear
        if (assetsLoaded === totalAssets) {
            console.log("Carga de assets finalizada (con errores).");
        }
    };
}

function preloadAssets() {
    // Imagen del Arch Caster Boss (ya la tienes)
    loadAsset('archCasterBossSprite', 'jefe_final.png');

    // Imagen del Proyectil del Jefe (ya la tienes)
    loadAsset('bossProjectileSprite', 'bola_de_fuego.png');

    // --- NUEVA LÍNEA: Imagen del Juggernaut Boss ---
    loadAsset('juggernautBossSprite', 'rey_juggernaut.png');
    // ---------------------------------------------------

    // Para usar tu propia imagen (ej. 'rey_juggernaut.png'):
    // 1. Borra la línea de 'data:image...' de arriba.
    // 2. Descomenta la línea de abajo y pon el nombre de tu archivo:
    // loadAsset('juggernautBossSprite', 'rey_juggernaut.png');
}


// --- GAME STATE & CONFIGURATION ---
const game = {
    running: false, paused: true, levelUpPending: false, chestRoulettePending: false,
    pendingLevelUps: 0, time: 0, xp: 0, level: 1, xpToNextLevel: 10, coins: 0, player: null,
    enemies: [], projectiles: [], explosions: [], gems: [], mines: [], holyWaters: [], chests: [], effects: [], minions: [],
    xpCoinMultiplier: 1, buffTimer: 0, screenShake: 0, inputHandledThisFrame: false,
    currentWave: 0, enemiesToSpawnInCurrentWave: 0, enemiesLeftInCurrentWave: 0, waveActive: false,
    difficulty: 'normal', spawnTimer: 0, keys: {},
    map: { obstacles: [] },
    stats: { kills: 0, bossesKilled: 0 },
    gamepad: {
        lastButtonStates: [],
        menuSelectionIndex: 0,
    }
};

const settings = {
    showEnemyHealthBars: true,
    showDamageNumbers: true,
    enableScreenShake: true,
    menuColor: '#00ffff',
};

const persistentData = {
    rebirthLevel: 0,
    talentPoints: 0,
    talents: {},
    settings: {
        showEnemyHealthBars: true,
        showDamageNumbers: true,
        enableScreenShake: true,
        menuColor: '#00ffff',
    },
    achievements: {},
    unlockedCharacters: {
        STANDARD: true,
        SNIPER: true,
        TANK: true,
        MAGE: true,
        BARBARIAN: true,
        CLERIC: true
    }
};

// --- GESTOR DE SONIDO (Web Audio API) ---
const soundManager = {
    context: null, isInitialized: false,
    init: function() {
        if (this.isInitialized || (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined')) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
            this.isInitialized = true;
        } catch (e) {
            console.error("Web Audio API no es compatible con este navegador.");
        }
    },
    createSynth: function({ type = 'sine', startFreq = 440, endFreq = startFreq, decay = 0.1, vol = 0.2 }) {
        if (!this.isInitialized) return;
        const context = this.context;
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(startFreq, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), context.currentTime + decay * 0.8);
        gainNode.gain.setValueAtTime(vol, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + decay);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + decay);
    },
    playSequence: function(notes) {
        if (!this.isInitialized) return;
        const context = this.context;
        notes.forEach(note => {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(note.freq, context.currentTime + note.delay);
            gainNode.gain.setValueAtTime(note.vol || 0.2, context.currentTime + note.delay);
            gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + note.delay + 0.1);
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.start(context.currentTime + note.delay);
            oscillator.stop(context.currentTime + note.delay + 0.15);
        });
    },
    playSound: function(name) {
        if (!this.isInitialized) return;
        switch(name) {
            case 'shoot': this.createSynth({ type: 'triangle', startFreq: 880, endFreq: 500, decay: 0.1, vol: 0.05 }); break;
            case 'hit': this.createSynth({ type: 'square', startFreq: 220, endFreq: 220, decay: 0.05, vol: 0.1 }); break;
            case 'enemyDie': this.createSynth({ type: 'sawtooth', startFreq: 150, endFreq: 1, decay: 0.2, vol: 0.1 }); break;
            case 'playerHurt': this.createSynth({ type: 'sawtooth', startFreq: 200, endFreq: 100, decay: 0.3, vol: 0.2 }); break;
            case 'pickupChest': this.playSequence([{ freq: 600, delay: 0 }, { freq: 900, delay: 0.1 }]); break;
            case 'levelUp': this.playSequence([{ freq: 523, delay: 0 }, { freq: 659, delay: 0.1 }, { freq: 783, delay: 0.2 }]); break;
            case 'evolution': this.playSequence([{ freq: 523, delay: 0 }, { freq: 659, delay: 0.15 }, { freq: 783, delay: 0.3 }, { freq: 1046, delay: 0.45 }]); break;
            case 'hook': this.createSynth({ type: 'sawtooth', startFreq: 50, endFreq: 200, decay: 0.2, vol: 0.3 }); break;
        }
    }
};

const difficultySettings = {
    easy: { enemyHealth: 0.75, enemySpeed: 0.8, playerHealth: 1.5, enemyDamage: 1, playerSpeed: 1 },
    normal: { enemyHealth: 1, enemySpeed: 1, playerHealth: 1, enemyDamage: 1, playerSpeed: 1 },
    hard: { enemyHealth: 1.5, enemySpeed: 1.2, playerHealth: 1, enemyDamage: 1.25, playerSpeed: 0.9 },
    inferno: { enemyHealth: 2.5, enemySpeed: 1.5, playerHealth: 0.75, enemyDamage: 2, playerSpeed: 0.8 }
};

const waves = [
    // Oleadas 1-9 (Introducción)
    { spawnCount: 20, enemyTypes: [{ type: 'normal', weight: 1 }], spawnRate: 55, title: "Los Novatos Rápidos" },
    { spawnCount: 30, enemyTypes: [{ type: 'normal', weight: 0.6 },{ type: 'rotator', weight: 0.4 }], spawnRate: 45, title: "Giro Inesperado" },
    { spawnCount: 35, enemyTypes: [{ type: 'normal', weight: 0.5 },{ type: 'caster', weight: 0.5 }], spawnRate: 40, title: "Magia Inminente" },
    { spawnCount: 20, enemyTypes: [{ type: 'elite', weight: 0.7 }, { type: 'broodmother', weight: 0.3 }], spawnRate: 70, title: "Amenaza Creciente" },
    { spawnCount: 40, enemyTypes: [{ type: 'caster', weight: 0.4 },{ type: 'rotator', weight: 0.3 }, { type: 'spectre', weight: 0.3 }], spawnRate: 35, title: "Caos Espectral" },
    { spawnCount: 30, enemyTypes: [{ type: 'elite', weight: 0.6 },{ type: 'juggernaut', weight: 0.2 }, { type: 'bomber', weight: 0.2 }], spawnRate: 60, title: "Llegan los Pesados" },
    { spawnCount: 50, enemyTypes: [{ type: 'normal', weight: 0.4 },{ type: 'sniper', weight: 0.2 },{ type: 'juggernaut', weight: 0.1 },{ type: 'caster', weight: 0.2 }, { type: 'ice_tank', weight: 0.1 }], spawnRate: 30, title: "Congelación y Fuego" },
    { spawnCount: 35, enemyTypes: [{ type: 'elite', weight: 0.4 },{ type: 'juggernaut', weight: 0.2 },{ type: 'rotator', weight: 0.1 }, { type: 'broodmother', weight: 0.2 }, { type: 'spectre', weight: 0.1 }], spawnRate: 50, title: "Enjambre Imparable" },
    { spawnCount: 70, enemyTypes: [{ type: 'normal', weight: 0.2 },{ type: 'sniper', weight: 0.2 },{ type: 'juggernaut', weight: 0.2 },{ type: 'caster', weight: 0.2 }, { type: 'bomber', weight: 0.2 }], spawnRate: 25, title: "La Gran Embestida" },
    // Oleada 10: JEFE 1
    { spawnCount: 1, enemyTypes: [{ type: 'broodmother_boss', weight: 1 }], spawnRate: 1, title: "La Reina de la Prole" },
    // Oleadas 11-14 (Intermedias)
    { spawnCount: 80, enemyTypes: [{ type: 'elite', weight: 0.3 },{ type: 'juggernaut', weight: 0.3 }, { type: 'broodmother', weight: 0.2 }, { type: 'ice_tank', weight: 0.2 }], spawnRate: 40, title: "La Calma Antes..." },
    { spawnCount: 90, enemyTypes: [{ type: 'sniper', weight: 0.3 },{ type: 'spectre', weight: 0.3 }, { type: 'caster', weight: 0.4 }], spawnRate: 20, title: "...de la Tempestad" },
    { spawnCount: 100, enemyTypes: [{ type: 'elite', weight: 0.25 },{ type: 'juggernaut', weight: 0.25 }, { type: 'bomber', weight: 0.25 }, { type: 'ice_tank', weight: 0.25 }], spawnRate: 30, title: "Muro de Acero" },
    { spawnCount: 120, enemyTypes: [{ type: 'normal', weight: 0.1 }, { type: 'rotator', weight: 0.2}, { type: 'caster', weight: 0.2}, { type: 'sniper', weight: 0.2}, { type: 'spectre', weight: 0.3}], spawnRate: 15, title: "Caos Absoluto"},
    // Oleada 15: JEFE 2
    { spawnCount: 1, enemyTypes: [{ type: 'juggernaut_boss', weight: 1 }], spawnRate: 1, title: "El Rey Juggernaut" },
    // Oleadas 16-19 (Intermedias Avanzadas)
    { spawnCount: 130, enemyTypes: [{ type: 'elite', weight: 0.3 },{ type: 'juggernaut', weight: 0.3 }, { type: 'broodmother', weight: 0.2 }, { type: 'ice_tank', weight: 0.2 }], spawnRate: 25, title: "Legión Implacable" },
    { spawnCount: 140, enemyTypes: [{ type: 'sniper', weight: 0.3 },{ type: 'spectre', weight: 0.3 }, { type: 'caster', weight: 0.4 }], spawnRate: 18, title: "Lluvia de Proyectiles" },
    { spawnCount: 150, enemyTypes: [{ type: 'elite', weight: 0.25 },{ type: 'juggernaut', weight: 0.25 }, { type: 'bomber', weight: 0.25 }, { type: 'ice_tank', weight: 0.25 }], spawnRate: 20, title: "Asedio Total" },
    { spawnCount: 200, enemyTypes: [{ type: 'normal', weight: 0.1 }, { type: 'rotator', weight: 0.2}, { type: 'caster', weight: 0.2}, { type: 'sniper', weight: 0.2}, { type: 'spectre', weight: 0.3}], spawnRate: 10, title: "Apocalipsis"},
    // Oleada 20: JEFE 3
    { spawnCount: 1, enemyTypes: [{ type: 'arch_caster_boss', weight: 1 }], spawnRate: 1, title: "El Gran Hechicero" }
];

const allEnemyTypesForEndless = [
    { type: 'normal', weight: 0.25 }, { type: 'elite', weight: 0.1 },
    { type: 'sniper', weight: 0.1 }, { type: 'rotator', weight: 0.1 },
    { type: 'caster', weight: 0.1 }, { type: 'juggernaut', weight: 0.05 },
    { type: 'broodmother', weight: 0.05 }, { type: 'spectre', weight: 0.1 },
    { type: 'bomber', weight: 0.05 }, { type: 'ice_tank', weight: 0.1 }
];

function applyRateMultiplier(player, multiplier) { player.weaponRate = Math.max(5, player.weaponRate / multiplier); }

const shopItems = {
    BOMB: { name: "Mina Estática (⬛ o E)", description: "Coloca una mina que explota en un gran radio.", cost: 10, buy: (p) => { p.bombs++; updateHUD(); }},
    RATE_BOOST: { name: "Cartucho Mejorado🔫", description: "Aumenta la cadencia de fuego un x1.25.", cost: 500, buy: (p) => { applyRateMultiplier(p, 1.25); }},
    XP_COIN_POTION: { name: "Poción de Prosperidad💰", description: "Multiplica x2 las monedas y XP por 120 seg.", cost: 75, buy: (p) => { game.xpCoinMultiplier = 2; game.buffTimer = 120 * 60; }},
    CROSS_ATTACK: { name: "Carga de Disparo Cruzado (🔺 o E)", description: "Añade una carga para un ataque en cruz (Daño 50).", cost: 50, buy: (p) => { p.crossAttacksAvailable = (p.crossAttacksAvailable || 0) + 1; updateHUD(); }},
    FOUR_SEASONS: { name: "Ciclo Eterno", description: "4 orbes giran a tu alrededor.", cost: 1000, buy: (p) => { p.hasFourSeasons = true; }},
    RESURRECTION: { name: "Resurrección🧟", description: "Si mueres, revives con el 50% de la vida. (Un solo uso)", cost: 100, buy: (p) => { p.hasResurrection = true; }},
};

const characters = {
    STANDARD: { name: "El Equilibrado", description: "Estadísticas equilibradas para empezar.", stats: { speed: 3, maxHealth: 10, health: 10, weaponDamage: 1, weaponRate: 60, color: 'cyan', projectileSpeed: 5, projectileRange: Infinity }},
    SNIPER: { name: "El Rápido", description: "Se mueve y ataca rápido, pero es más frágil.", stats: { speed: 4, maxHealth: 8, health: 8, weaponDamage: 0.5, weaponRate: 30, color: 'yellow', projectileSpeed: 7, projectileRange: Infinity }},
    TANK: { name: "El Tanque", description: "Lento pero muy resistente. Regenera vida pasivamente.", stats: { speed: 2.5, maxHealth: 15, health: 15, weaponDamage: 0.8, weaponRate: 70, color: 'lime', healthRegen: 0.1, projectileSpeed: 4, projectileRange: Infinity }},
    MAGE: { name: "El Mago", description: "Débil en combate directo, pero sus habilidades pasivas son devastadoras.", stats: { speed: 3, maxHealth: 7, health: 7, weaponDamage: 0.7, weaponRate: 60, color: 'violet', passiveBonus: 1.25, projectileSpeed: 5, projectileRange: Infinity }},
    BARBARIAN: { name: "El Bárbaro", description: "Un guerrero feroz que empieza lanzando hachas.", stats: { speed: 3.2, maxHealth: 12, health: 12, weaponDamage: 1.2, weaponRate: 65, color: '#E9967A', startsWith: 'HACHA' }},
    CLERIC: { name: "El Clérigo", description: "Un protector que consagra el suelo que pisa.", stats: { speed: 2.8, maxHealth: 10, health: 10, weaponDamage: 0.9, weaponRate: 60, color: '#DAA520', startsWith: 'AGUA_BENDITA' }},
    SUMMONER: { name: "El Invocador", description: "No ataca. Invoca esbirros que luchan por él.", locked: true, unlockCondition: "Derrota a los 3 Jefes.", stats: {
        speed: 3, maxHealth: 9, health: 9, weaponDamage: 0, weaponRate: 9999, color: '#7f8c8d',
        isSummoner: true,
        summonRate: 40,      // <-- MUY RÁPIDO
        maxMinions: 10,      // <-- LÍMITE ALTO
        minionDamage: 3,     // <-- DAÑO ALTO
        minionHealth: 10     // <-- VIDA ALTA
    }},
    ADMIN: { name: "El Administrador 🛠️", description: "Máximas estadísticas.", stats: { speed: 8, maxHealth: 9999, health: 9999, weaponDamage: 50, weaponRate: 5, color: 'red', projectileSpeed: 10, projectileRange: Infinity }},
};

const upgrades = {
    MANDATO: { id: 'MANDATO', name: "Mandato (+ Daño)", description: "Aumenta el daño de tus ataques en 1.", apply: (p) => { p.weaponDamage += 1; } },
    CELERIDAD: { id: 'CELERIDAD', name: "Celeridad (+ Velocidad)", description: "Aumenta tu velocidad de movimiento en 0.5.", apply: (p) => { p.speed += 0.5; p.originalSpeed = (p.originalSpeed || p.speed) + 0.5; p.celeridadLevel = (p.celeridadLevel || 0) + 1; } },
    VIGOR: { id: 'VIGOR', name: "Vigor (+ Max HP)", description: "Aumenta tu salud máxima en 3 y te cura.", apply: (p) => { p.maxHealth += 3; p.health = p.maxHealth; p.vigorLevel = (p.vigorLevel || 0) + 1; } },
    CADENCIA: { id: 'CADENCIA', name: "Cadencia (+ Tasa Fuego)", description: "Tus ataques son un 10% más rápidos.", apply: (p) => { applyRateMultiplier(p, 1.10); p.cadenceLevel = (p.cadenceLevel || 0) + 1; } },
    IMAN: { id: 'IMAN', name: "Imán (+ Radio XP)", description: "Aumenta el radio de atracción de XP en 30.", apply: (p) => { p.magnetBonus = (p.magnetBonus || 0) + 30; p.imanLevel = (p.imanLevel || 0) + 1; } },
    BALAS_PERFORANTES: { id: 'BALAS_PERFORANTES', name: "Balas Perforantes", maxLevel: 5, levels: [{description: "Tus proyectiles atraviesan a un enemigo adicional."}, {description: "Tus proyectiles atraviesan a 2 enemigos."}, {description: "Tus proyectiles atraviesan a 3 enemigos."}, {description: "Tus proyectiles atraviesan a 4 enemigos."}, {description: "Tus proyectiles atraviesan a 5 enemigos."}], getCurrentLevel: (p) => p.pierce || 0, canApply: (p) => (p.pierce || 0) < 5, apply: (p) => { p.pierce = (p.pierce || 0) + 1; } },
    RAYO_EN_CADENA: { id: 'RAYO_EN_CADENA', name: "Rayo en Cadena", evolution: {requires: 'BALAS_PERFORANTES', to: 'TORMENTA_FILAMENTOS'}, maxLevel: 1, description: "Al impactar, un rayo salta a 2 enemigos cercanos.", getCurrentLevel: (p) => p.chainLightning || 0, canApply: (p) => (p.chainLightning || 0) < 1, apply: (p) => { p.chainLightning = (p.chainLightning || 0) + 1; } },
    HACHA: { id: 'HACHA', name: "Hacha", evolution: {requires: 'CELERIDAD', to: 'ESPIRAL_DE_CUCHILLAS'}, levels: [
        { description: "Lanza un hacha giratoria que regresa.", apply: (p) => { p.axeLevel = 1; p.axeCount = 1; p.axeDamage = 5; p.axeRate = 120;} },
        { description: "Lanza 2 hachas.", apply: (p) => { p.axeCount = 2; p.axeLevel = 2;} },
        { description: "Aumenta el daño del hacha.", apply: (p) => { p.axeDamage = 10; p.axeLevel = 3;} },
        { description: "Lanza las hachas más a menudo.", apply: (p) => { p.axeRate = 90; p.axeLevel = 4;} },
        { description: "Lanza 3 hachas.", apply: (p) => { p.axeCount = 3; p.axeLevel = 5;} }
    ], getCurrentLevel: (p) => p.axeLevel || 0, canApply: (p) => (p.axeLevel || 0) < 5, apply: (p) => { const level = upgrades.HACHA.getCurrentLevel(p); if (upgrades.HACHA.canApply(p)) { upgrades.HACHA.levels[level].apply(p); }}},
    AJO: { id: 'AJO', name: "Ajo (Aura)", evolution: {requires: 'VIGOR', to: 'ALMA_DE_AJO'}, levels: [{ description: "Crea un aura que daña a enemigos cercanos.", apply: (p) => { p.auraLevel = 1; p.auraDamage = 0.5; p.auraRadius = 50;} },{ description: "Aumenta el daño del aura.", apply: (p) => { p.auraDamage = 1; p.auraLevel = 2;} },{ description: "Aumenta el radio del aura.", apply: (p) => { p.auraRadius = 70; p.auraLevel = 3;} }], getCurrentLevel: (p) => p.auraLevel || 0, canApply: (p) => (p.auraLevel || 0) < 3, apply: (p) => { const level = upgrades.AJO.getCurrentLevel(p); if (upgrades.AJO.canApply(p)) { upgrades.AJO.levels[level].apply(p); }}},
    LIBRO_REAL: { id: 'LIBRO_REAL', name: "Libro Real (Orbes)", evolution: {requires: 'CADENCIA', to: 'CIRCULO_PERPETUO'}, levels: [{ description: "Dos orbes te protegen y dañan enemigos.", apply: (p) => { p.bibleLevel = 1; p.bibleOrbsCount = 2; p.bibleDamage = 2;} },{ description: "Añade un tercer orbe.", apply: (p) => { p.bibleOrbsCount = 3; p.bibleLevel = 2;} },{ description: "Los orbes giran más rápido y dañan más.", apply: (p) => { p.bibleSpeed = 0.08; p.bibleDamage = 4; p.bibleLevel = 3;} }], getCurrentLevel: (p) => p.bibleLevel || 0, canApply: (p) => (p.bibleLevel || 0) < 3, apply: (p) => { const level = upgrades.LIBRO_REAL.getCurrentLevel(p); if (upgrades.LIBRO_REAL.canApply(p)) { upgrades.LIBRO_REAL.levels[level].apply(p); }}},
    AGUA_BENDITA: { id: 'AGUA_BENDITA', name: "Agua Bendita (Zona)", evolution: {requires: 'IMAN', to: 'SANTUARIO'}, levels: [{ description: "Lanza viales que crean zonas de daño.", apply: (p) => { p.holyWaterLevel = 1; p.holyWaterTimer = 0; p.holyWaterRate = 300;} },{ description: "Lanza viales más a menudo.", apply: (p) => { p.holyWaterRate = 200; p.holyWaterLevel = 2;} },{ description: "Las zonas de daño son más grandes.", apply: (p) => { p.holyWaterRadius = 80; p.holyWaterLevel = 3;} }], getCurrentLevel: (p) => p.holyWaterLevel || 0, canApply: (p) => (p.holyWaterLevel || 0) < 3, apply: (p) => { const level = upgrades.AGUA_BENDITA.getCurrentLevel(p); if (upgrades.AGUA_BENDITA.canApply(p)) { upgrades.AGUA_BENDITA.levels[level].apply(p); }}},
    EXPLOSION_RADIAL: { id: 'EXPLOSION_RADIAL', name: "Explosión Radial (AoE)", levels: [{ description: "Tus proyectiles explotan en un área de 40px.", apply: (p) => { p.aoeRadius = 40; p.isAoE = true; p.projectileSpeed = 3; p.projectileRange = 180; p.aoeLevel = 1;} },{ description: "Aumenta el radio a 60px.", apply: (p) => { p.aoeRadius = 60; p.aoeLevel = 2;} },{ description: "Aumenta el radio a 80px.", apply: (p) => { p.aoeRadius = 80; p.aoeLevel = 3;} },{ description: "Aumenta el radio a 100px.", apply: (p) => { p.aoeRadius = 100; p.aoeLevel = 4;} },{ description: "Aumenta el radio a 120px.", apply: (p) => { p.aoeRadius = 120; p.aoeLevel = 5;} }], getCurrentLevel: (p) => p.aoeLevel || 0, canApply: (p) => (p.aoeLevel || 0) < 5, apply: (p) => { const level = upgrades.EXPLOSION_RADIAL.getCurrentLevel(p); if (upgrades.EXPLOSION_RADIAL.canApply(p)) { upgrades.EXPLOSION_RADIAL.levels[level].apply(p); }}},
    DISPARO_MULTIPLE: { id: 'DISPARO_MULTIPLE', name: "Disparo Múltiple", levels: [{ description: "Dispara un proyectil adicional (50% de daño).", apply: (p) => { p.multishotLevel = 1; } },{ description: "Dispara 2 proyectiles adicionales.", apply: (p) => { p.multishotLevel = 2; p.projectileSpeed *= 1.1; } },{ description: "Dispara 3 proyectiles adicionales. Daño +1.", apply: (p) => { p.multishotLevel = 3; p.weaponDamage += 1; } }], getCurrentLevel: (p) => p.multishotLevel || 0, canApply: (p) => (p.multishotLevel || 0) < 3, apply: (p) => { const level = upgrades.DISPARO_MULTIPLE.getCurrentLevel(p); if (upgrades.DISPARO_MULTIPLE.canApply(p)) { upgrades.DISPARO_MULTIPLE.levels[level].apply(p); }}},
};

// --- MEJORAS DEL INVOCADOR ---
const summonerUpgrades = {
    SUMMON_DAMAGE: { id: 'SUMMON_DAMAGE', name: "Esbirros Furiosos", description: "Tus esbirros infligen +1 de daño.", apply: (p) => { p.minionDamage += 1; } },
    SUMMON_HEALTH: { id: 'SUMMON_HEALTH', name: "Vínculo Vital", description: "Tus esbirros ganan +2 de vida máxima.", apply: (p) => { p.minionHealth += 2; } },
    SUMMON_RATE: { id: 'SUMMON_RATE', name: "Invocación Rápida", description: "Invoca esbirros un 20% más rápido.", apply: (p) => { p.summonRate = Math.max(10, p.summonRate * 0.8); } }, // Límite mínimo de 10

    SUMMON_COUNT: { id: 'SUMMON_COUNT', name: "Legión Creciente", maxLevel: 3, levels: [
        { description: "Puedes tener 2 esbirros adicionales.", apply: (p) => { p.maxMinions += 2; p.summonerUpgrade_Count = 1; } },
        { description: "Puedes tener 2 esbirros adicionales (Total +4).", apply: (p) => { p.maxMinions += 2; p.summonerUpgrade_Count = 2; } },
        { description: "Puedes tener 2 esbirros adicionales (Total +6).", apply: (p) => { p.maxMinions += 2; p.summonerUpgrade_Count = 3; } }
    ], getCurrentLevel: (p) => p.summonerUpgrade_Count || 0, canApply: (p) => (p.summonerUpgrade_Count || 0) < 3, apply: (p) => { const level = summonerUpgrades.SUMMON_COUNT.getCurrentLevel(p); if (summonerUpgrades.SUMMON_COUNT.canApply(p)) { summonerUpgrades.SUMMON_COUNT.levels[level].apply(p); }} },

    PLAYER_HEALTH: { id: 'PLAYER_HEALTH', name: "Vigor del Maestro", description: "Aumenta tu salud máxima en 3 y te cura.", apply: (p) => { p.maxHealth += 3; p.health = p.maxHealth; } },
    PLAYER_SPEED: { id: 'PLAYER_SPEED', name: "Paso Etéreo", description: "Aumenta tu velocidad de movimiento en 0.5.", apply: (p) => { p.speed += 0.5; p.originalSpeed = (p.originalSpeed || p.speed) + 0.5; } },
    MINION_AOE: { id: 'MINION_AOE', name: "Toque Explosivo", description: "Los ataques de tus esbirros ahora explotan en un área pequeña (25px).", maxLevel: 1, getCurrentLevel: (p) => p.minionAoE || 0, canApply: (p) => (p.minionAoE || 0) < 1, apply: (p) => { p.minionAoE = 25; } },
    MINION_SPEED: { id: 'MINION_SPEED', name: "Esbirros Ágiles", description: "Tus esbirros se mueven un 25% más rápido.", apply: (p) => { p.minionSpeedBonus = (p.minionSpeedBonus || 1) * 1.25; } }
};
// --- FIN MEJORAS INVOCADOR ---

const evolutions = {
    SANTUARIO: { name: "Santuario (Evolución)", apply: (p) => { p.holyWaterLevel = 'EVOLVED'; p.holyWaterRate = 30; p.holyWaterRadius = 250; } },
    CIRCULO_PERPETUO: { name: "Círculo Perpetuo (Evolución)", apply: (p) => { p.bibleLevel = 'EVOLVED'; p.bibleSpeed *= 2; p.bibleDamage *= 2; } },
    ALMA_DE_AJO: { name: "Alma de Ajo (Evolución)", apply: (p) => { p.auraLevel = 'EVOLVED'; p.auraSlows = true; p.auraHeals = true; } },
    TORMENTA_FILAMENTOS: { name: "Torm. Filamentos (Evolución)", apply: (p) => { p.chainLightning = 'EVOLVED'; } },
    ESPIRAL_DE_CUCHILLAS: { name: "Espiral de Cuchillas (Evolución)", apply: (p) => { p.axeLevel = 'EVOLVED'; p.axeCount = 3; p.axeDamage *= 2; p.axeRate = 0; } },
};

const specialUpgrades = {
    COMERCIANTE: { name: "Comerciante", description: "Ganas x3 de XP y monedas durante 120 segundos.", apply: (p) => { p.buffTimer = 120 * 60; game.xpCoinMultiplier = 3; }},
    PARRY: { name: "Parry", description: "50% de probabilidad de devolver proyectiles enemigos.", apply: (p) => { p.hasParry = true; }},
    GIGANTE: { name: "Gigante", description: "Durante 60s: x4 de daño, x2 de tamaño, x5 de vida.", apply: (p) => { p.isGiant = true; p.giantTimer = 60*60; p.originalSize = p.radius; p.originalDamage = p.weaponDamage; p.originalMaxHealth = p.maxHealth; p.radius *= 2; p.weaponDamage *= 4; p.maxHealth *= 5; p.health = p.maxHealth; }},
    RAYO_LASER: { name: "Rayo Láser", description: "Cada 10s, un láser daña a todos los enemigos.", apply: (p) => { p.hasLaser = true; p.laserTimer = 0; }}
};

const talentTree = {
    'start_hp': { name: "Vida Inicial", desc: "Aumenta la vida máxima inicial en 1.", maxLevel: 5, cost: (level) => level + 1, apply: (p, level) => p.maxHealth += level, requires: null },
    'start_dmg': { name: "Daño Inicial", desc: "Aumenta el daño base en 0.2.", maxLevel: 5, cost: (level) => level + 1, apply: (p, level) => p.weaponDamage += level * 0.2, requires: null },
    'start_spd': { name: "Velocidad Inicial", desc: "Aumenta la velocidad de movimiento en 0.1.", maxLevel: 5, cost: (level) => level + 1, apply: (p, level) => p.speed += level * 0.1, requires: null },
    'luck': { name: "Suerte", desc: "Aumenta la probabilidad de encontrar cofres un 10% (relativo).", maxLevel: 5, cost: (level) => level + 1, apply: (p, level) => p.luck = (p.luck || 1) * (1 + level * 0.1), requires: null },
    'greed': { name: "Avaricia", desc: "Gana un 5% más de monedas.", maxLevel: 10, cost: () => 1, apply: (p, level) => p.coinMultiplier = (p.coinMultiplier || 1) + 0.05 * level, requires: 'start_dmg' },
    'wisdom': { name: "Sabiduría", desc: "Gana un 5% más de experiencia.", maxLevel: 10, cost: () => 1, apply: (p, level) => p.xpMultiplier = (p.xpMultiplier || 1) + 0.05 * level, requires: 'start_hp' },
    'regen': { name: "Regeneración", desc: "Regenera 0.1 de vida por segundo.", maxLevel: 3, cost: (level) => 2 + level, apply: (p, level) => p.healthRegen = (p.healthRegen || 0) + 0.1 * level, requires: 'wisdom' },
    'rebirth_bonus': { name: "Bono de Rebirth", desc: "Gana 1 punto de talento extra cada 5 niveles de Rebirth.", maxLevel: 1, cost: () => 5, apply: () => {}, requires: 'greed' },
};

const achievements = {
    'SURVIVE_5_MIN': { name: "Superviviente", description: "Sobrevive 5 minutos.", condition: () => (game.time / 60) >= 300 },
    'KILL_100': { name: "Exterminador", description: "Derrota 100 enemigos.", condition: () => game.stats.kills >= 100 },
    'REACH_LVL_20': { name: "Veterano", description: "Alcanza el nivel 20.", condition: () => game.level >= 20 },
    'EVOLVE_1': { name: "¡Más Poder!", description: "Evoluciona un arma.", condition: () => Object.values(game.player || {}).includes('EVOLVED') },
    'KILL_BOSS': { name: "Matagigantes", description: "Derrota a tu primer jefe.", condition: () => game.stats.bossesKilled >= 1 },
    'KILL_ALL_BOSSES': { name: "Conquistador", description: "Derrota a los 3 jefes en una partida.", condition: () => game.stats.bossesKilled >= 3, reward: { type: 'UNLOCK_CHARACTER', key: 'SUMMONER' } }
};


// --- CLASSES ---

class Entity {
    constructor(x, y, radius, color) { this.x = x; this.y = y; this.radius = radius; this.color = color; this.alive = true; }
    draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
}

class Projectile extends Entity {
    // --- CAMBIO: Añadido spriteKey, spriteWidth, spriteHeight ---
    constructor(x, y, angle, damage, speed, range, isAoE, aoeRadius, owner = 'player', pierce = 0, spriteKey = null, spriteWidth = 8, spriteHeight = 8) {
        // Usa el radio base si no hay sprite, o un tamaño basado en el sprite
        const baseRadius = spriteKey ? Math.max(spriteWidth, spriteHeight) / 2 : 4;
        super(x, y, baseRadius, owner === 'player' ? 'white' : 'red');

        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
        this.damage = damage; this.range = range; this.distanceTraveled = 0;
        this.isAoE = isAoE; this.aoeRadius = aoeRadius; this.owner = owner;
        this.pierceCount = pierce;
        this.hitEnemies = [];

        // --- CAMBIO: Cargar el sprite si se proporciona la clave ---
        this.sprite = spriteKey ? images[spriteKey] : null;
        this.spriteWidth = spriteWidth;
        this.spriteHeight = spriteHeight;
        this.rotation = angle; // Guardar el ángulo para rotar la imagen
        // --- FIN CAMBIO ---
    }

    update() {
        this.x += this.vx; this.y += this.vy;
        this.distanceTraveled += Math.hypot(this.vx, this.vy);
        if (this.distanceTraveled > this.range || this.x < 0 || this.x > WIDTH || this.y < 0 || this.y > HEIGHT || isCollidingWithObstacle(this.x, this.y, this.radius)) {
            if (this.isAoE) {
                game.explosions.push(new Explosion(this.x, this.y, this.damage, this.aoeRadius));
            }
            this.alive = false;
        }
    }

    // --- CAMBIO: Método draw modificado ---
    draw() {
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            // Rota la imagen para que apunte en la dirección del movimiento
            // Añadimos PI/2 porque muchas imágenes de proyectiles apuntan hacia arriba por defecto
            ctx.rotate(this.rotation + Math.PI / 2);
            ctx.drawImage(this.sprite,
                          -this.spriteWidth / 2,
                          -this.spriteHeight / 2,
                          this.spriteWidth,
                          this.spriteHeight);
            ctx.restore();
        } else {
            // Fallback: dibujar círculo si no hay sprite
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // --- FIN CAMBIO ---
}


class Axe extends Entity {
    constructor(player, angle, damage) {
        super(player.x, player.y, 12, 'brown');
        this.player = player;
        this.damage = damage;
        this.angle = angle;
        this.distance = 0;
        this.maxDistance = 150;
        this.speed = 4;
        this.rotation = 0;
        this.state = 'throwing';
        this.hitEnemies = [];
    }
    update() {
        this.rotation += 0.2;
        if (this.state === 'throwing') {
            this.distance += this.speed;
            if (this.distance >= this.maxDistance) {
                this.state = 'returning';
            }
        } else { // returning
            this.distance -= this.speed * 1.5; // Vuelve más rápido
            if (this.distance <= 0) {
                this.alive = false;
            }
        }
        this.x = this.player.x + Math.cos(this.angle) * this.distance;
        this.y = this.player.y + Math.sin(this.angle) * this.distance;

        if(isCollidingWithObstacle(this.x, this.y, this.radius)) {
            this.state = 'returning';
        }

        for(const enemy of game.enemies) {
            if(!this.hitEnemies.includes(enemy) && Math.hypot(this.x - enemy.x, this.y - enemy.y) < this.radius + enemy.radius) {
                enemy.takeDamage(this.damage);
                this.hitEnemies.push(enemy);
            }
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.radius, -this.radius / 4, this.radius * 2, this.radius / 2);
        ctx.fillRect(-this.radius, -this.radius / 2, this.radius / 4, this.radius);
        ctx.restore();
    }
}

class EvolvedAxe extends Entity {
    constructor(player, damage, angleOffset) {
        super(player.x, player.y, 20, 'orange');
        this.player = player;
        this.damage = damage;
        this.angle = angleOffset;
        this.rotation = 0;
        this.orbitRadius = 100;
        this.speed = 0.05;
    }
    update() {
        this.angle += this.speed;
        this.rotation += 0.2;
        this.x = this.player.x + Math.cos(this.angle) * this.orbitRadius;
        this.y = this.player.y + Math.sin(this.angle) * this.orbitRadius;

        for(const enemy of game.enemies) {
            if(Math.hypot(this.x - enemy.x, this.y - enemy.y) < this.radius + enemy.radius) {
                if(!enemy.hitByOrbs) enemy.hitByOrbs = new Set();
                if(!enemy.hitByOrbs.has(this)){
                    enemy.takeDamage(this.damage);
                    enemy.hitByOrbs.add(this);
                    setTimeout(() => { if(enemy.hitByOrbs) enemy.hitByOrbs.delete(this) }, 500);
                }
            }
        }
    }
     draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        const size = 20;
        ctx.fillRect(-size, -size / 4, size * 2, size / 2);
        ctx.fillRect(-size, -size / 2, size / 4, size);
        ctx.restore();
    }
}

// --- CLASE MINION MODIFICADA (DPS CONSTANTE POR CONTACTO) ---
class Minion extends Entity {
    constructor(x, y, damage, health, aoeRadius, speedBonus) {
        super(x, y, 6, '#bdc3c7');
        this.damage = damage; // Esto ahora es Daño POR SEGUNDO
        this.health = health;
        this.maxHealth = health;
        this.aoeRadius = aoeRadius || 0;
        this.speed = 3 * (speedBonus || 1);
        this.target = null;
    }

    update(player) {
        if (!this.target || !this.target.alive) {
            this.findTarget();
        }

        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);

            // Rango de ataque (choque + 5px)
            if (dist < this.radius + this.target.radius + 5) {
                // Está en rango de ataque: Aplicar daño DPS constante
                this.attackTarget(this.target);
            } else {
                // Moverse hacia el objetivo
                this.moveToTarget();
            }
        } else {
            // Si no hay enemigos, vuelve cerca del jugador
            const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
            if (distToPlayer > 100) { // Si se aleja mucho
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                this.x += dx * 0.05;
                this.y += dy * 0.05;
            }
        }
    }

    moveToTarget() {
        if (!this.target) return;
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    attackTarget(target) {
        // --- LÓGICA DE DAÑO MODIFICADA ---
        // Aplica 1/60 del daño por segundo en CADA FRAME mientras esté en contacto
        if (target.alive) {
            // false = no mostrar números de daño para este ataque pequeño
            target.takeDamage(this.damage / 60, false);

            // Si tiene mejora de AoE
            if (this.aoeRadius > 0) {
                // Muestra un efecto visual de vez en cuando (no en cada frame)
                if(game.time % 30 === 0) { // Cada medio segundo
                     game.effects.push(new Explosion(this.x, this.y, 0, this.aoeRadius, 'visual_only'));
                }

                game.enemies.forEach(e => {
                    if (e.alive && e !== target && Math.hypot(this.x - e.x, this.y - e.y) < this.aoeRadius + e.radius) {
                        // Daño AoE (mitad) por frame
                        e.takeDamage((this.damage * 0.5) / 60, false);
                    }
                });
            }
        }
        // --- FIN LÓGICA DE DAÑO MODIFICADA ---
    }

    findTarget() {
        let closest = null;
        let minDistance = 300; // Rango de búsqueda
        for (const enemy of game.enemies) {
            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if (dist < minDistance) {
                minDistance = dist;
                closest = enemy;
            }
        }
        this.target = closest;
    }

    takeDamage(damage) {
        if (!this.alive) return;
        this.health -= damage;
        if (this.health <= 0) {
            this.alive = false;
            // Pequeño efecto visual al morir
            game.effects.push(new Explosion(this.x, this.y, 0, 15, 'visual_only'));
        }
    }

    draw() {
        super.draw(); // Dibuja el círculo base
        // Dibujar barra de vida del minion
        if (settings.showEnemyHealthBars && this.health < this.maxHealth) {
            const barWidth = this.radius * 2;
            const barX = this.x - this.radius;
            const barY = this.y - this.radius - 8;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, 4);
            ctx.fillStyle = 'lime'; // Color vida de aliado
            ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), 4);
        }
    }
}


class Hook extends Entity {
    constructor(owner, targetX, targetY) {
        super(owner.x, owner.y, 8, 'gray');
        this.owner = owner;
        this.targetX = targetX;
        this.targetY = targetY;
        this.state = 'shooting';
        this.speed = 12;
        this.maxLength = 400;
        this.distanceTraveled = 0;
        const angle = Math.atan2(targetY - owner.y, targetX - owner.x);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }
    update() {
        if (this.state === 'shooting') {
            this.x += this.vx;
            this.y += this.vy;
            this.distanceTraveled += this.speed;
            if (this.distanceTraveled >= this.maxLength) {
                this.state = 'returning';
            }
        } else { // returning
            const dx = this.owner.x - this.x;
            const dy = this.owner.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < this.speed) {
                this.alive = false;
            } else {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        }
    }
    draw() {
        super.draw();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.owner.x, this.owner.y);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
    }
}

class Effect {
    constructor(duration) { this.duration = duration; this.alive = true; }
    update() { if (--this.duration <= 0) this.alive = false; }
    draw() {}
}

class DamageNumber extends Effect {
    constructor(x, y, amount) {
        super(60);
        this.x = x + (Math.random() - 0.5) * 10;
        this.y = y;
        this.amount = Math.round(amount);
    }
    update() {
        super.update();
        this.y -= 0.5;
    }
    draw() {
        if (!settings.showDamageNumbers) return;
        ctx.fillStyle = `rgba(255, 255, 100, ${this.duration / 60})`;
        ctx.font = 'bold 14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(this.amount, this.x, this.y);
    }
}

class LightningEffect extends Effect {
    constructor(startX, startY, targets) {
        super(15);
        this.startX = startX; this.startY = startY; this.targets = targets;
    }
    draw() {
        ctx.strokeStyle = `rgba(0, 255, 255, ${this.duration / 15})`;
        ctx.lineWidth = 3;
        let currentX = this.startX;
        let currentY = this.startY;
        this.targets.forEach(target => {
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
            currentX = target.x;
            currentY = target.y;
        });
    }
}

class Gem extends Entity {
    constructor(x, y, value) { super(x, y, 5, '#2ecc71'); this.value = value; }
}

class Explosion {
    constructor(x, y, damage, radius, type = 'radial') {
        this.x = x; this.y = y; this.radius = radius; this.type = type;
        this.alive = true;

        if (type === 'visual_only') {
            this.timer = 10;
            this.color = 'rgba(255, 255, 100, 0.5)'; // Color explosión minion
            return; // No hace daño ni screen shake
        }

        this.timer = (type === 'cross') ? 30 : 15;
        const shakeAmount = type === 'radial' ? 5 : 10;
        triggerScreenShake(shakeAmount);

        if (this.type === 'radial') {
            for (let enemy of game.enemies) {
                if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < this.radius + enemy.radius) {
                    enemy.takeDamage(damage);
                }
            }
        } else if (this.type === 'cross') {
            for (let enemy of game.enemies) {
                const h = enemy.y >= (this.y - 10) && enemy.y <= (this.y + 10);
                const v = enemy.x >= (this.x - 10) && enemy.x <= (this.x + 10);
                if (h || v) enemy.takeDamage(damage);
            }
        }
    }
    update() { if (--this.timer <= 0) this.alive = false; }
    draw() {
        if (!this.alive) return;

        if (this.type === 'visual_only') {
            const alpha = this.timer / 10;
            ctx.fillStyle = `rgba(255, 255, 100, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 - alpha), 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        const alpha = this.timer / 15;
        if (this.type === 'radial') {
            ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * (1 - alpha * 0.5), 0, Math.PI * 2); ctx.stroke();
        } else if (this.type === 'cross') {
            const thickness = 20 * alpha; ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.8})`;
            ctx.fillRect(0, this.y - thickness / 2, WIDTH, thickness); ctx.fillRect(this.x - thickness / 2, 0, thickness, HEIGHT);
        }
    }
}

class Mine extends Entity {
    constructor(x, y) { super(x, y, 15, 'orange'); this.explosionRadius = 150; this.damage = 50; this.timer = 180; }
    update() { if (--this.timer <= 0) this.explode(); }
    draw() { if (this.timer < 60) this.color = (this.timer % 10 < 5) ? 'red' : 'orange'; super.draw(); ctx.strokeStyle = 'rgba(255, 165, 0, 0.2)'; ctx.beginPath(); ctx.arc(this.x, this.y, this.explosionRadius, 0, Math.PI * 2); ctx.stroke(); }
    explode() { this.alive = false; game.explosions.push(new Explosion(this.x, this.y, this.damage, this.explosionRadius, 'radial')); }
}

class HolyWater extends Entity {
    constructor(x,y, radius) { super(x, y, radius, 'rgba(135, 206, 250, 0.2)'); this.duration = 300; this.damage = 1; this.hitTimer = 0; }
    update() { if(--this.duration <= 0) this.alive = false; this.hitTimer++; for (let enemy of game.enemies) { if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < this.radius + enemy.radius) { if (this.hitTimer % 60 === 0) enemy.takeDamage(this.damage * game.player.passiveBonus); } } }
}

class Chest extends Entity {
    constructor(x, y, isLegendary = false) { super(x, y, 10, isLegendary ? 'cyan' : 'gold'); this.glow = 0; this.glowDirection = 1; this.isLegendary = isLegendary;}
    update() { this.glow += this.glowDirection * 0.1; if(this.glow > 5 || this.glow < 0) this.glowDirection *= -1; }
    draw() { super.draw(); ctx.fillStyle = this.isLegendary ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 215, 0, 0.3)'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + this.glow, 0, Math.PI * 2); ctx.fill(); }
}

class Player extends Entity {
    constructor(x, y) { super(x, y, 10, 'cyan'); Object.assign(this, { baseStats: {}, speed: 0, health: 0, maxHealth: 0, weaponDamage: 0, weaponRate: 0, weaponTimer: 0, invincibilityTimer: 0, magnetBonus: 0, pierce: 0, chainLightning: 0, healthRegen: 0, passiveBonus: 1, luck: 1, coinMultiplier: 1, xpMultiplier: 1, projectileSpeed: 5, projectileRange: Infinity, isAoE: false, aoeRadius: 0, aoeLevel: 0, multishotLevel: 0, bombs: 0, crossAttacksAvailable: 0, chestsAvailable: 0, legendaryChestsAvailable: 0, hasResurrection: false, hasFourSeasons: false, fourSeasonsOrbs: [], fourSeasonsAngle: 0, fourSeasonsRadius: 80, fourSeasonsDamage: 3, slowTimer: 0, originalSpeed: 0, isHooked: false, hookTarget: null, hookTimer: 0, hasParry: false, isGiant: false, giantTimer: 0, hasLaser: false, laserTimer: 0, auraLevel:0, auraRadius:0, auraDamage:0, auraSlows: false, auraHeals: false, bibleLevel:0, bibleOrbs:[], bibleOrbsCount: 0, bibleAngle:0, bibleSpeed: 0.05, bibleDamage: 0, holyWaterLevel:0, holyWaterTimer:0, holyWaterRate: 0, holyWaterRadius: 60, axeLevel: 0, axeTimer: 0, isSummoner: false, summonRate: 300, summonTimer: 0, maxMinions: 2, minionDamage: 3, minionHealth: 3, minionAoE: 0, minionSpeedBonus: 1 }); }

    update() {
        if (game.paused) return;

        if (!game.inputHandledThisFrame) {
            this.handleKeyboardInput();
        }

        if (this.isHooked && this.hookTarget) {
            this.handleHooked();
        }

        if (this.invincibilityTimer > 0) { this.invincibilityTimer--; this.drawColor = (this.invincibilityTimer % 10 < 5) ? 'gray' : this.color; } else { this.drawColor = this.color; }
        if (this.slowTimer > 0) {
            if (--this.slowTimer === 0) {
                this.speed = this.originalSpeed;
            } else if (this.speed > this.originalSpeed) {
                this.speed = this.originalSpeed;
            }
        }
        if (++this.weaponTimer >= this.weaponRate) this.attack(game.enemies);
        if (this.healthRegen > 0 && this.health < this.maxHealth) { this.health = Math.min(this.maxHealth, this.health + this.healthRegen / 60); updateHUD(); }

        // Habilidades pasivas
        if (this.auraLevel) this.updateAura();
        if (this.bibleLevel) this.updateBible();
        if (this.holyWaterLevel) this.updateHolyWater();
        if (this.axeLevel) this.updateAxe();
        if (this.hasFourSeasons) this.updateFourSeasons();
        if (this.isSummoner) this.updateSummoning();
        if (this.hasLaser) {
            if(++this.laserTimer > 600) {
                this.laserTimer = 0;
                game.effects.push(new Explosion(WIDTH/2, this.y, 100, 0, 'cross'));
            }
        }
        if (this.isGiant) {
            if(--this.giantTimer <= 0) {
                this.isGiant = false;
                this.radius = this.originalSize;
                this.weaponDamage = this.originalDamage;
                this.maxHealth = this.originalMaxHealth;
                if(this.health > this.maxHealth) this.health = this.maxHealth;
            }
        }
    }

    applyMovement(dx, dy) {
        if (this.isHooked) return;
        if (dx !== 0 || dy !== 0) {
            const mag = Math.hypot(dx, dy);
            let moveX = (dx / mag) * this.speed;
            let moveY = (dy / mag) * this.speed;

            if (!isCollidingWithObstacle(this.x + moveX, this.y, this.radius)) {
                this.x += moveX;
            }
            if (!isCollidingWithObstacle(this.x, this.y + moveY, this.radius)) {
                this.y += moveY;
            }
        }
        this.x = Math.max(this.radius, Math.min(WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(HEIGHT - this.radius, this.y));
    }

    handleHooked() {
        const dx = this.hookTarget.x - this.x;
        const dy = this.hookTarget.y - this.y;
        const dist = Math.hypot(dx, dy);
        const pullSpeed = 12;

        if (dist > this.hookTarget.radius + this.radius + 5) {
            this.x += (dx / dist) * pullSpeed;
            this.y += (dy / dist) * pullSpeed;
        }
        if (--this.hookTimer <= 0) {
            this.isHooked = false;
            this.hookTarget = null;
        }
    }

    handleKeyboardInput() {
        let dx = 0, dy = 0;
        if (game.keys['w'] || game.keys['arrowup']) dy -= 1;
        if (game.keys['s'] || game.keys['arrowdown']) dy += 1;
        if (game.keys['a'] || game.keys['arrowleft']) dx -= 1;
        if (game.keys['d'] || game.keys['arrowright']) dx += 1;

        this.applyMovement(dx, dy);
    }

    draw() {
        ctx.fillStyle = this.drawColor;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        if (this.auraLevel) { ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.beginPath(); ctx.arc(this.x, this.y, this.auraRadius, 0, Math.PI * 2); ctx.fill(); }
        if(this.bibleLevel) this.bibleOrbs.forEach(orb => orb.draw());
        if(this.hasFourSeasons) this.fourSeasonsOrbs.forEach(orb => orb.draw());
    }

    attack(enemies) {
        if (this.weaponDamage <= 0) return; // Invocador no ataca
        soundManager.playSound('shoot');
        this.weaponTimer = 0;
        let closest = null, minDistance = Infinity;
        for (const enemy of enemies) { const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y); if (dist < minDistance) { minDistance = dist; closest = enemy; } }
        if (closest) {
            const angle = Math.atan2(closest.y - this.y, closest.x - this.x);
            const numShots = 1 + this.multishotLevel, spreadAngle = Math.PI / 18;
            const shotDamage = (this.multishotLevel > 0) ? this.weaponDamage / 2 : this.weaponDamage;
            for (let i = 0; i < numShots; i++) {
                let currentAngle = angle + (i - (numShots - 1) / 2) * spreadAngle;
                game.projectiles.push(new Projectile(this.x, this.y, currentAngle, shotDamage, this.projectileSpeed, this.projectileRange, this.isAoE, this.aoeRadius, 'player', this.pierce));
            }
        }
    }

    placeMine() { if (this.bombs > 0) { game.mines.push(new Mine(this.x, this.y)); this.bombs--; updateHUD(); } }
    useCrossAttack() { if (this.crossAttacksAvailable > 0) { game.explosions.push(new Explosion(this.x, this.y, 50, 0, 'cross')); this.crossAttacksAvailable--; updateHUD(); } }
    useChest() { if (this.chestsAvailable > 0 && !game.chestRoulettePending) { this.chestsAvailable--; updateHUD(); showRoulette(false); } }
    useLegendaryChest() { if (this.legendaryChestsAvailable > 0 && !game.chestRoulettePending) { this.legendaryChestsAvailable--; updateHUD(); showRoulette(true); } }

    takeDamage(damage) {
        if (this.invincibilityTimer > 0) return;
        soundManager.playSound('playerHurt');
        triggerScreenShake(3);
        this.health -= damage;
        this.invincibilityTimer = 60;
        if (this.health <= 0) {
            this.health = 0;
            if (this.hasResurrection) {
                this.hasResurrection = false; this.health = this.maxHealth / 2;
                game.explosions.push(new Explosion(this.x, this.y, 100, 200, 'radial'));
            } else { gameOver(); }
        }
        updateHUD();
    }

    updateAura() {
        let enemiesInAura = 0;
        game.enemies.forEach(e => {
            if (Math.hypot(this.x - e.x, this.y - e.y) < this.auraRadius + e.radius) {
                e.takeDamage(this.auraDamage / 60 * this.passiveBonus, false);
                enemiesInAura++;
            }
        });
        if(this.auraHeals && enemiesInAura > 0 && this.health < this.maxHealth){
            this.health += (0.1 * enemiesInAura) / 60;
        }
    }
    updateBible() {
        const orbRadius = this.bibleLevel === 'EVOLVED' ? 15 : 10;
        if (this.bibleOrbs.length !== this.bibleOrbsCount) {
             this.bibleOrbs = Array.from({length: this.bibleOrbsCount}, () => new Entity(0, 0, orbRadius, '#8e44ad'));
        }
        this.bibleAngle += this.bibleSpeed;
        this.bibleOrbs.forEach((orb, i) => {
            orb.radius = orbRadius;
            const angle = this.bibleAngle + (i * (2 * Math.PI / this.bibleOrbs.length));
            orb.x = this.x + Math.cos(angle) * 60; orb.y = this.y + Math.sin(angle) * 60;
            for(const enemy of game.enemies) {
                if(Math.hypot(orb.x - enemy.x, orb.y - enemy.y) < orb.radius + enemy.radius) {
                    if(!enemy.hitByOrbs) enemy.hitByOrbs = new Set();
                    if(!enemy.hitByOrbs.has(orb)){
                        enemy.takeDamage(this.bibleDamage * this.passiveBonus);
                        enemy.hitByOrbs.add(orb);
                        setTimeout(() => { if(enemy.hitByOrbs) enemy.hitByOrbs.delete(orb) }, 500);
                    }
                }
            }
        });
    }
    updateHolyWater() {
        if (++this.holyWaterTimer >= this.holyWaterRate) {
            this.holyWaterTimer = 0;
            let spawnX = this.x + (Math.random() - 0.5) * 200;
            let spawnY = this.y + (Math.random() - 0.5) * 200;
            if(this.holyWaterLevel === 'EVOLVED') {
                spawnX = this.x; spawnY = this.y;
            }
            game.holyWaters.push(new HolyWater(spawnX, spawnY, this.holyWaterRadius));
        }
    }
    updateAxe() {
        if(this.axeLevel === 'EVOLVED') {
            if(!this.evolvedAxes) {
                this.evolvedAxes = [];
                for(let i = 0; i < this.axeCount; i++) {
                    const angleOffset = (i / this.axeCount) * 2 * Math.PI;
                    this.evolvedAxes.push(new EvolvedAxe(this, this.axeDamage * this.passiveBonus, angleOffset));
                    game.effects.push(this.evolvedAxes[i]);
                }
            }
        } else {
            if(++this.axeTimer >= this.axeRate) {
                this.axeTimer = 0;
                for (let i = 0; i < this.axeCount; i++) {
                    const angle = Math.random() * 2 * Math.PI;
                    game.effects.push(new Axe(this, angle, this.axeDamage * this.passiveBonus));
                }
            }
        }
    }
    updateFourSeasons() {
        if (!this.fourSeasonsOrbs) this.fourSeasonsOrbs = [];
        if (this.fourSeasonsOrbs.length !== 4) {
            const colors = ['#81d4fa', '#a5d6a7', '#fff59d', '#ef9a9a']; // Azul, Verde, Amarillo, Rojo
            this.fourSeasonsOrbs = Array.from({length: 4}, (v, i) => new Entity(0, 0, 8, colors[i]));
        }
        this.fourSeasonsAngle = (this.fourSeasonsAngle || 0) + 0.03;
        this.fourSeasonsRadius = 80 + Math.sin(this.fourSeasonsAngle * 2) * 20;

        this.fourSeasonsOrbs.forEach((orb, i) => {
            const angle = this.fourSeasonsAngle + (i * (Math.PI / 2));
            orb.x = this.x + Math.cos(angle) * this.fourSeasonsRadius;
            orb.y = this.y + Math.sin(angle) * this.fourSeasonsRadius;
             for(const enemy of game.enemies) {
                if(Math.hypot(orb.x - enemy.x, orb.y - enemy.y) < orb.radius + enemy.radius) {
                    if(!enemy.hitByOrbs) enemy.hitByOrbs = new Set();
                    if(!enemy.hitByOrbs.has(orb)){
                        enemy.takeDamage(this.fourSeasonsDamage * this.passiveBonus);
                        enemy.hitByOrbs.add(orb);
                        setTimeout(() => { if(enemy.hitByOrbs) enemy.hitByOrbs.delete(orb) }, 300);
                    }
                }
             }
        });
    }
    updateSummoning() {
        if (++this.summonTimer >= this.summonRate) {
            this.summonTimer = 0;
            const currentMinions = game.minions.length;
            if (currentMinions < this.maxMinions) {
                const spawnAngle = Math.random() * 2 * Math.PI;
                const spawnX = this.x + Math.cos(spawnAngle) * 30;
                const spawnY = this.y + Math.sin(spawnAngle) * 30;
                // Pasar vida, aoe y velocidad al minion
                game.minions.push(new Minion(spawnX, spawnY, this.minionDamage * this.passiveBonus, this.minionHealth, this.minionAoE, this.minionSpeedBonus));
            }
        }
    }
}

class Enemy extends Entity {
    constructor(x, y, radius, color, health, speed, damage, xp, coins, type, displayName) {
        super(x, y, radius, color);
        this.maxHealth = health; this.health = health; this.speed = speed;
        this.damage = damage; this.xpValue = xp; this.coinValue = coins;
        this.type = type;
        this.displayName = displayName || type.charAt(0).toUpperCase() + type.slice(1);
        this.hitFlashTimer = 0;
    }
    update(player) {
        let currentSpeed = this.speed * (game.waveConfig.speedMultiplier || 1);
        if(player.auraLevel === 'EVOLVED' && player.auraSlows && Math.hypot(player.x - this.x, player.y - this.y) < player.auraRadius + this.radius) {
            currentSpeed *= 0.8;
        }

        // Los enemigos atacan a los minions
        let target = player;
        if (player.isSummoner) {
            let closestMinion = null;
            let minDist = Infinity;
            for(const minion of game.minions) {
                const dist = Math.hypot(this.x - minion.x, this.y - minion.y);
                if(dist < minDist) {
                    minDist = dist;
                    closestMinion = minion;
                }
            }
            // Si hay un minion cerca, lo prioriza
            if(closestMinion && minDist < 150) {
                target = closestMinion;
            }
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
            let moveX = (dx / dist) * currentSpeed;
            let moveY = (dy / dist) * currentSpeed;

            // Obstacle Avoidance
            const avoidanceForce = {x: 0, y: 0};
            for(const obs of game.map.obstacles) {
                const distToObs = Math.hypot(this.x - obs.x, this.y - obs.y);
                if(distToObs < this.radius + obs.radius + 30) { // 30 is detection range
                    const force = 1 - (distToObs / (this.radius + obs.radius + 30));
                    avoidanceForce.x += (this.x - obs.x) / distToObs * force;
                    avoidanceForce.y += (this.y - obs.y) / distToObs * force;
                }
            }

            const finalMoveX = moveX + avoidanceForce.x * currentSpeed;
            const finalMoveY = moveY + avoidanceForce.y * currentSpeed;
            const finalMag = Math.hypot(finalMoveX, finalMoveY);

            if (finalMag > 0) {
                const finalX = this.x + (finalMoveX / finalMag) * currentSpeed;
                const finalY = this.y + (finalMoveY / finalMag) * currentSpeed;

                if (!isCollidingWithObstacle(finalX, this.y, this.radius)) this.x = finalX;
                if (!isCollidingWithObstacle(this.x, finalY, this.radius)) this.y = finalY;
            }
        }
    }
    takeDamage(damage, showNumber = true) {
        if (!this.alive) return;
        this.health -= damage;
        this.hitFlashTimer = 10;

        if (showNumber) {
            soundManager.playSound('hit');
            if(settings.showDamageNumbers) game.effects.push(new DamageNumber(this.x, this.y - this.radius, damage));
        }

        if (this.health <= 0) { this.alive = false; onEnemyKilled(this); }
    }
    draw() {
        ctx.save();
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer--;
            ctx.filter = 'brightness(2.5)';
        }
        super.draw();
        ctx.restore();

        if (settings.showEnemyHealthBars && this.health < this.maxHealth && !this.type.includes('_boss')) {
            const barWidth = this.radius * 2, barX = this.x - this.radius, barY = this.y - this.radius - 10;
            ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barWidth, 5);
            ctx.fillStyle = 'red'; ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), 5);
        }
    }
}

class RotatorEnemy extends Enemy {
    constructor(x, y, radius, color, health, speed, damage, xp, coins, type) {
        super(x, y, radius, color, health, speed, damage, xp, coins, type);
        this.angle = 0; this.rotationSpeed = 0.05;
    }
    update(player) { super.update(player); this.angle += this.rotationSpeed; }
    draw() {
        const armLength = this.radius * 2.5, armWidth = this.radius * 0.6;
        ctx.save();
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer--;
            ctx.filter = 'brightness(2.5)';
        }
        ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-armLength / 2, -armWidth / 2, armLength, armWidth);
        ctx.fillRect(-armWidth / 2, -armLength / 2, armWidth, armLength);
        ctx.restore();

        if (settings.showEnemyHealthBars && this.health < this.maxHealth) {
            const barWidth = this.radius * 2, barX = this.x - this.radius, barY = this.y - this.radius - 15;
            ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barWidth, 5);
            ctx.fillStyle = 'red'; ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), 5);
        }
    }
}

class CasterEnemy extends Enemy {
    constructor(x, y, radius, color, health, speed, damage, xp, coins, type) {
        super(x, y, radius, color, health, speed, damage, xp, coins, type);
        this.attackRange = 250; this.attackRate = 180;
        this.attackTimer = Math.random() * this.attackRate;
    }
    update(player) {
        // Lógica de targeting para esbirros
        let target = player;
        if (player.isSummoner) {
            let closestMinion = null;
            let minDist = 150; // Rango de "taunt"
            for(const minion of game.minions) {
                const dist = Math.hypot(this.x - minion.x, this.y - minion.y);
                if(dist < minDist) {
                    minDist = dist;
                    closestMinion = minion;
                }
            }
            if(closestMinion) {
                target = closestMinion;
            }
        }

        const dist = Math.hypot(target.x - this.x, target.y - this.y); // Usa target
        if (dist < this.attackRange && !isLineOfSightBlocked(this, target)) { // Usa target
            if (++this.attackTimer >= this.attackRate) {
                this.attackTimer = 0;
                const angle = Math.atan2(target.y - this.y, target.x - this.x); // Usa target
                game.projectiles.push(new Projectile(this.x, this.y, angle, this.damage, 2, 500, false, 0, 'enemy'));
            }
        } else {
            super.update(player); // Se mueve si no está en rango
        }
    }
}


class BroodmotherEnemy extends Enemy {
    constructor(x, y, radius, color, health, speed, damage, xp, coins, type) {
        super(x, y, radius, color, health, speed, damage, xp, coins, type);
        this.spawnRate = 300; this.spawnTimer = Math.random() * this.spawnRate;
    }
    update(player) {
        super.update(player);
        if (++this.spawnTimer >= this.spawnRate) { this.spawnTimer = 0; spawnEnemyAt('normal', this.x, this.y); }
    }
}

class SpectreEnemy extends Enemy {
    constructor(x, y, radius, color, health, speed, damage, xp, coins, type) {
        super(x, y, radius, color, health, speed, damage, xp, coins, type);
    }
    update(player) {
        super.update(player);
        if (Math.hypot(player.x - this.x, player.y - this.y) < player.radius + this.radius) {
            if (player.slowTimer <= 0) player.originalSpeed = player.speed;
            player.speed *= 0.5;
            player.slowTimer = 180; // 3 seconds
            this.alive = false; // El espectro se desvanece al maldecir
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = 0.6;
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer--;
            ctx.filter = 'brightness(2.5)';
        }
        super.draw();
        ctx.restore();
    }
}

class SniperEnemy extends Enemy {
    constructor(x, y, radius, color, health, speed, damage, xp, coins, type) {
        super(x, y, radius, color, health, speed, damage, xp, coins, type);
        this.state = 'moving';
        this.stateTimer = 120; // 2 seconds
        this.aimTarget = {x:0, y:0};
    }
    update(player) {
        // Lógica de targeting para esbirros
        let target = player;
        if (player.isSummoner) {
            let closestMinion = null;
            let minDist = 300; // Rango de "taunt" más grande
            for(const minion of game.minions) {
                const dist = Math.hypot(this.x - minion.x, this.y - minion.y);
                if(dist < minDist) {
                    minDist = dist;
                    closestMinion = minion;
                }
            }
            if(closestMinion) {
                target = closestMinion;
            }
        }

        this.stateTimer--;
        if (this.state === 'moving') {
            const dx = target.x - this.x, dy = target.y - this.y; // Usa target
            const dist = Math.hypot(dx, dy);
            // Moverse perpendicular al target para "strafe"
            const moveX = -(dy / dist) * this.speed * 0.5;
            const moveY = (dx / dist) * this.speed * 0.5;
            if (!isCollidingWithObstacle(this.x + moveX, this.y, this.radius)) this.x += moveX;
            if (!isCollidingWithObstacle(this.x, this.y + moveY, this.radius)) this.y += moveY;

            if (this.stateTimer <= 0) {
                this.state = 'aiming';
                this.stateTimer = 60; // 1 segundo para apuntar
                this.aimTarget.x = target.x; // Usa target
                this.aimTarget.y = target.y; // Usa target
            }
        } else if (this.state === 'aiming') {
            if (this.stateTimer <= 0) {
                this.state = 'firing';
            }
        } else if (this.state === 'firing') {
            const angle = Math.atan2(this.aimTarget.y - this.y, this.aimTarget.x - this.x);
            game.projectiles.push(new Projectile(this.x, this.y, angle, this.damage, 10, 1000, false, 0, 'enemy'));
            this.state = 'moving';
            this.stateTimer = 180; // 3 segundos de enfriamiento
        }
    }
    draw() {
        super.draw();
        if (this.state === 'aiming') {
            ctx.strokeStyle = `rgba(255, 0, 0, ${1 - this.stateTimer/60})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.aimTarget.x, this.aimTarget.y);
            ctx.stroke();
        }
    }
}


class JuggernautBoss extends Enemy {
    constructor(x, y, radius, color, health, speed, damage, xp, coins, type, displayName) {
        super(x, y, radius, color, health, speed, damage, xp, coins, type, displayName);
        this.isEnraged = false;
        this.novaAttackRate = 240; // 4 seconds
        this.novaAttackTimer = 0;
        this.hookAttackRate = 420; // 7 seconds
        this.hookAttackTimer = 120;

        // --- CAMBIO: Propiedad para la imagen del sprite ---
        this.sprite = images.juggernautBossSprite; // Referencia a la imagen cargada
        // Ajusta estos valores al tamaño de tu imagen (el radio original era 30)
        this.spriteWidth = 60; 
        this.spriteHeight = 60; 
        // --- FIN CAMBIO ---
    }
    
    update(player) {
        if (player.isHooked) { /* No se mueve mientras engancha */ }
        else { super.update(player); }

        if (!this.isEnraged && this.health < this.maxHealth / 2) {
            this.isEnraged = true;
            this.speed *= 1.5;
            // Podrías cambiar el sprite o aplicar un filtro si entra en modo furia
            // this.color = '#ff00ff'; // Ya no se usa si hay sprite
        }

        if (this.isEnraged) {
            if (++this.novaAttackTimer >= this.novaAttackRate) {
                this.novaAttackTimer = 0;
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * 2 * Math.PI;
                    game.projectiles.push(new Projectile(this.x, this.y, angle, this.damage, 3, 800, false, 0, 'enemy'));
                }
            }
            if (++this.hookAttackTimer >= this.hookAttackRate) {
                this.hookAttackTimer = 0;
                soundManager.playSound('hook');
                game.effects.push(new Hook(this, player.x, player.y));
                player.isHooked = true;
                player.hookTarget = this;
                player.hookTimer = 90; // Duración del arrastre
            }
        }
    }

    // --- CAMBIO CLAVE: Método draw modificado ---
    draw() {
        // Dibuja la imagen si está cargada
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
            ctx.save();
            if (this.hitFlashTimer > 0) {
                this.hitFlashTimer--;
                ctx.filter = 'brightness(2.5)'; // Efecto flash
            }
            // Centra la imagen
            ctx.drawImage(this.sprite,
                          this.x - this.spriteWidth / 2,
                          this.y - this.spriteHeight / 2,
                          this.spriteWidth,
                          this.spriteHeight);
            ctx.restore();
        } else {
            // Fallback: dibujar círculo si no hay sprite
            super.draw(); // Llama al método draw de la clase Enemy (padre)
        }
        // La barra de vida se dibuja en updateBossHealthBar()
    }
    // --- FIN CAMBIO ---
}

class GreatBroodmotherBoss extends Enemy {
    constructor(x, y, radius, color, health, speed, damage, xp, coins, type, displayName) {
        super(x, y, radius, color, health, speed, damage, xp, coins, type, displayName);
        this.spawnRateNormal = 300; this.spawnTimerNormal = 0;
        this.spawnRateElite = 600; this.spawnTimerElite = 300;
        this.isEnraged = false;
        this.stateTimer = 0;
    }
    update(player) {
        // Movimiento errante
        if(this.stateTimer-- <= 0) {
            this.stateTimer = 180;
            this.wanderAngle = Math.random() * 2 * Math.PI;
        }
        const nextX = this.x + Math.cos(this.wanderAngle) * this.speed;
        const nextY = this.y + Math.sin(this.wanderAngle) * this.speed;
        if (!isCollidingWithObstacle(nextX, this.y, this.radius)) this.x = nextX;
        if (!isCollidingWithObstacle(this.x, nextY, this.radius)) this.y = nextY;
        this.x = Math.max(this.radius, Math.min(WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(HEIGHT - this.radius, this.y));

        if (!this.isEnraged && this.health < this.maxHealth / 2) {
            this.isEnraged = true; this.spawnRateNormal /= 2; this.spawnRateElite /= 2; this.color = '#c0392b';
        }

        if (++this.spawnTimerNormal >= this.spawnRateNormal) {
            this.spawnTimerNormal = 0;
            for(let i=0; i < 3; i++) {
                spawnEnemyAt('normal', this.x + (Math.random() - 0.5) * 50, this.y + (Math.random() - 0.5) * 50);
            }
        }
        if (++this.spawnTimerElite >= this.spawnRateElite) {
            this.spawnTimerElite = 0;
            spawnEnemyAt(this.isEnraged ? 'caster' : 'elite', this.x, this.y);
        }
    }
}

class ArchCasterBoss extends Enemy {
    constructor(x, y, radius, color, health, speed, damage, xp, coins, type, displayName) {
        super(x, y, radius, color, health, speed, damage, xp, coins, type, displayName);
        this.teleportRate = 300; // 5s
        this.teleportTimer = 0;
        this.attackRate = 120; // 2s
        this.attackTimer = 0;
        this.holyWaterRate = 400; // ~7s
        this.holyWaterTimer = 0;

        // --- Propiedad para la imagen del sprite ---
        this.sprite = images.archCasterBossSprite; // Referencia a la imagen cargada
        this.spriteWidth = 80; // Ancho para dibujar (puedes ajustarlo)
        this.spriteHeight = 80; // Alto para dibujar (puedes ajustarlo)
        // --- FIN CAMBIO ---
    }

    update(player) {
        if (++this.teleportTimer >= this.teleportRate) {
            this.teleportTimer = 0;
            // Intenta teletransportarse a un lugar seguro
            let newX, newY, attempts = 0;
            const safeRadius = this.radius + 10; // Un pequeño margen extra
            do {
                newX = Math.random() * (WIDTH - 100) + 50;
                newY = Math.random() * (HEIGHT - 100) + 50;
                attempts++;
                if (attempts > 50) { // Evitar bucle infinito
                    console.warn("No se pudo encontrar un lugar seguro para teletransportar al jefe.");
                    // Si no encuentra sitio, no se teletransporta en este ciclo
                    this.teleportTimer = -60; // Intenta de nuevo en 1 segundo
                    return;
                }
            } while (isCollidingWithObstacle(newX, newY, safeRadius));

            this.x = newX;
            this.y = newY;
            // Podrías añadir un efecto visual de teletransporte aquí si quieres
            // game.effects.push(new TeleportEffect(this.x, this.y, this.radius, this.color));
        }

        if (++this.attackTimer >= this.attackRate) {
            this.attackTimer = 0;
            this.castSpell(player); // <--- Aquí se llama al método
        }

        if(++this.holyWaterTimer >= this.holyWaterRate) {
            this.holyWaterTimer = 0;
            game.holyWaters.push(new HolyWater(player.x, player.y, 100));
        }
    }

    // --- ESTE ES EL MÉTODO castSpell ---
    castSpell(player) {
        for(let i=0; i < 3; i++) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x) + (Math.random() - 0.5);

            // --- Usa la clave del sprite y tamaño ---
            const spriteKey = 'bossProjectileSprite';
            const spriteW = 16; // Ancho de tu imagen de proyectil
            const spriteH = 16; // Alto de tu imagen de proyectil

            const p = new Projectile(this.x, this.y, angle, this.damage, 4, 1000, false, 0, 'enemy', 0, spriteKey, spriteW, spriteH);
            // --- FIN CAMBIO ---

            p.isAoE = true; // Sus proyectiles explotan
            p.aoeRadius = 50;
            game.projectiles.push(p);
        }
    }
    // --- FIN DEL MÉTODO castSpell ---

    draw() {
        // Dibuja la imagen si está cargada
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
            ctx.save();
            if (this.hitFlashTimer > 0) {
                this.hitFlashTimer--;
                ctx.filter = 'brightness(2.5)';
            }
            // Centra la imagen en las coordenadas del enemigo
            ctx.drawImage(this.sprite,
                          this.x - this.spriteWidth / 2,
                          this.y - this.spriteHeight / 2,
                          this.spriteWidth,
                          this.spriteHeight);
            ctx.restore();
        } else {
            // Si la imagen no está disponible, dibuja el círculo (fallback)
            super.draw();
        }
    }
}


// --- ENEMY FACTORY ---
const enemyFactory = {
    normal: (type) => new Enemy(0, 0, 8, 'green', 3, 1.5, 1, 1, 1, type),
    elite: (type) => new Enemy(0, 0, 12, 'orange', 10, 1.2, 2, 5, 3, type),
    sniper: (type) => new SniperEnemy(0, 0, 7, 'purple', 5, 1, 5, 3, 2, type),
    rotator: (type) => new RotatorEnemy(0, 0, 8, 'pink', 5, 2, 1, 2, 1, type),
    caster: (type) => new CasterEnemy(0, 0, 9, 'lightblue', 4, 1, 2, 4, 2, type),
    juggernaut: (type) => new Enemy(0, 0, 18, 'darkred', 30, 0.8, 3, 10, 5, type),
    broodmother: (type) => new BroodmotherEnemy(0, 0, 15, 'brown', 20, 1, 2, 8, 4, type),
    spectre: (type) => new SpectreEnemy(0, 0, 10, '#aaa', 8, 1.8, 1, 6, 3, type),
    bomber: (type) => new Enemy(0, 0, 11, 'yellow', 5, 1.5, 5, 5, 3, type),
    ice_tank: (type) => new Enemy(0, 0, 16, 'cyan', 25, 1, 2, 9, 5, type),
    broodmother_boss: (type) => new GreatBroodmotherBoss(WIDTH/2, HEIGHT/2, 35, 'darkgreen', 1500, 0.5, 5, 100, 50, type, "Reina de la Prole"),
    juggernaut_boss: (type) => new JuggernautBoss(WIDTH / 2, HEIGHT / 2, 30, '#4b0082', 2000, 1, 5, 100, 50, type, "Rey Juggernaut"),
    arch_caster_boss: (type) => new ArchCasterBoss(WIDTH/2, HEIGHT/2, 25, '#2980b9', 3000, 0, 4, 150, 75, type, "El Gran Hechicero")
};

function spawnEnemyAt(type, x, y) {
    const enemy = enemyFactory[type](type);
    if (!enemy || isCollidingWithObstacle(x, y, enemy.radius)) return;
    enemy.x = x; enemy.y = y;
    game.enemies.push(enemy);
}

function spawnEnemy(type) {
    const enemyTemplate = enemyFactory[type](type);
    if (!enemyTemplate) return;
    const radius = enemyTemplate.radius; // Usar el radio REAL

    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch(side) {
        case 0: x = Math.random() * WIDTH; y = -radius; break;
        case 1: x = WIDTH + radius; y = Math.random() * HEIGHT; break;
        case 2: x = Math.random() * WIDTH; y = HEIGHT + radius; break;
        case 3: x = -radius; y = Math.random() * HEIGHT; break;
    }

    if (isCollidingWithObstacle(x, y, radius)) return;

    enemyTemplate.x = x;
    enemyTemplate.y = y;
    game.enemies.push(enemyTemplate);
}


function triggerScreenShake(amount) {
    if(settings.enableScreenShake) {
        game.screenShake = Math.max(game.screenShake, amount);
    }
}

function isCollidingWithObstacle(x, y, radius) {
    for (const obs of game.map.obstacles) {
        if (Math.hypot(x - obs.x, y - obs.y) < radius + obs.radius) {
            return true;
        }
    }
    return false;
}

function isLineOfSightBlocked(start, end) {
    for (const obs of game.map.obstacles) {
        let dx = end.x - start.x;
        let dy = end.y - start.y;
        let dist = Math.hypot(dx, dy);
        if(dist === 0) continue; // Evitar división por cero si start y end son el mismo
        dx /= dist; dy /= dist;
        let testX = start.x;
        let testY = start.y;
        for(let i=0; i < dist; i+=10){
            testX += dx * 10;
            testY += dy * 10;
            if(Math.hypot(testX - obs.x, testY - obs.y) < obs.radius) return true;
        }
    }
    return false;
}

// --- GAME LOGIC & LOOP ---

function update() {
    game.inputHandledThisFrame = false;
    if (game.pendingLevelUps > 0 && !game.levelUpPending) {
        levelUp(); return;
    }

    handleGamepadInput();

    if (game.paused || game.levelUpPending || game.chestRoulettePending) return;

    game.time++;
    if(game.time % 60 === 0) checkAchievements();

    game.player.update();
    ['projectiles', 'enemies', 'explosions', 'mines', 'holyWaters', 'chests', 'effects', 'minions'].forEach(key => game[key].forEach(e => e.update(game.player)));

    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const p = game.projectiles[i];
        if(!p.alive) continue;

        if (p.owner === 'player') {
            for (let j = game.enemies.length - 1; j >= 0; j--) {
                const e = game.enemies[j];
                if (!p.hitEnemies.includes(e) && Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {

                    if (game.player.chainLightning === 'EVOLVED') {
                        e.takeDamage(p.damage);
                        const targets = game.enemies.filter(other => other !== e && Math.hypot(e.x - other.x, e.y - other.y) < 150).slice(0, 2);
                        if (targets.length > 0) game.effects.push(new LightningEffect(e.x, e.y, targets));
                        targets.forEach(t => t.takeDamage(p.damage * 0.5));
                    } else {
                         e.takeDamage(p.damage);
                    }
                    p.hitEnemies.push(e);

                    if (game.player.chainLightning > 0 && game.player.chainLightning !== 'EVOLVED') {
                        if(p.hitEnemies.length === 1) { // Chain only on first hit for non-evolved
                            const targets = game.enemies.filter(other => other !== e && !p.hitEnemies.includes(other) && Math.hypot(e.x - other.x, e.y - other.y) < 150).slice(0, 2 * game.player.chainLightning);
                            targets.forEach(target => {
                                target.takeDamage(p.damage * 0.5);
                                p.hitEnemies.push(target);
                            });
                            if (targets.length > 0) game.effects.push(new LightningEffect(e.x, e.y, targets));
                        }
                    }

                    if (p.pierceCount-- <= 0) {
                        if (p.isAoE) game.explosions.push(new Explosion(p.x, p.y, p.damage, p.aoeRadius));
                        p.alive = false;
                        break;
                    }
                }
            }
        // --- CAMBIO INICIA: Proyectiles enemigos ahora golpean esbirros ---
        } else if (p.owner === 'enemy') {
            // 1. Comprobar colisión con el jugador
             if (Math.hypot(p.x - game.player.x, p.y - game.player.y) < p.radius + game.player.radius) {
                if(game.player.hasParry && Math.random() < 0.5) {
                    p.owner = 'player';
                    p.vx *= -1.5; p.vy *= -1.5;
                    p.damage *= 2;
                    // No ponemos p.alive = false aquí, el proyectil es devuelto
                } else {
                    game.player.takeDamage(p.damage);
                    p.alive = false; // Proyectil destruido
                }
            }
            // 2. Si el proyectil sigue vivo, comprobar colisión con minions
            else if (p.alive) {
                for (const minion of game.minions) {
                    if (Math.hypot(p.x - minion.x, p.y - minion.y) < p.radius + minion.radius) {
                        minion.takeDamage(p.damage);
                        p.alive = false; // Proyectil destruido
                        break; // El proyectil solo puede golpear a un minion a la vez
                    }
                }
            }
        // --- CAMBIO TERMINA ---
        }
    }

    // Colisión Enemigo -> Minion / Player
    for (const enemy of game.enemies) {
        if (!(enemy instanceof SpectreEnemy)) {
            let collisionDone = false;
            // Comprobar colisión con minions
            if (game.player.isSummoner) {
                for(const minion of game.minions) {
                    if (Math.hypot(minion.x - enemy.x, minion.y - enemy.y) < minion.radius + enemy.radius) {
                        minion.takeDamage(enemy.damage);
                        collisionDone = true; // El enemigo choca con el minion
                        break;
                    }
                }
            }
            // Comprobar colisión con jugador (solo si no ha chocado con un minion)
            if (!collisionDone && Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y) < game.player.radius + enemy.radius) {
                 game.player.takeDamage(enemy.damage);
            }
        }
    }

    const magnetRadius = 50 + game.player.magnetBonus;
    for (let i = game.gems.length - 1; i >= 0; i--) {
        const gem = game.gems[i];
        const dist = Math.hypot(game.player.x - gem.x, game.player.y - gem.y);
        if (dist < magnetRadius) {
            if (dist < game.player.radius + gem.radius) { gainXP(gem.value); gem.alive = false; }
            else { gem.x += (game.player.x - gem.x) * 0.1; gem.y += (game.player.y - gem.y) * 0.1; }
        }
    }

    for (let i = game.chests.length - 1; i >= 0; i--) {
        const chest = game.chests[i];
        if (Math.hypot(game.player.x - chest.x, game.player.y - chest.y) < game.player.radius + chest.radius) {
            chest.alive = false;
            soundManager.playSound('pickupChest');
            if (chest.isLegendary) game.player.legendaryChestsAvailable++;
            else game.player.chestsAvailable++;
            updateHUD();
        }
    }

    updateWave();
    updateBossHealthBar();
    ['projectiles', 'enemies', 'explosions', 'mines', 'gems', 'holyWaters', 'chests', 'effects', 'minions'].forEach(key => game[key] = game[key].filter(e => e.alive));
}

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (!game.player) return;

    if(game.screenShake > 0) {
        const dx = (Math.random() - 0.5) * game.screenShake * 2;
        const dy = (Math.random() - 0.5) * game.screenShake * 2;
        ctx.save();
        ctx.translate(dx, dy);
        game.screenShake *= 0.9; // Dampen
        if(game.screenShake < 0.5) game.screenShake = 0;
    }

    if(game.map.background) {
        ctx.fillStyle = game.map.background;
        ctx.fillRect(0,0,WIDTH,HEIGHT);
    }
    game.map.obstacles.forEach(o => {
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    game.player.draw();
    ['mines', 'holyWaters', 'gems', 'chests', 'enemies', 'projectiles', 'explosions', 'effects', 'minions'].forEach(key => game[key].forEach(e => e.draw()));

    if(game.screenShake > 0) ctx.restore();
}

function gameLoop() {
  updateFPS();
    if (!game.running) return;
    try {
        update();
        draw();
    } catch(e) {
        console.error("Error en el bucle del juego:", e);
        game.running = false;
        alert("Se ha producido un error crítico. El juego se detendrá. Revisa la consola (F12) para más detalles.");
    }
    requestAnimationFrame(gameLoop);
}

// --- UI & HUD FUNCTIONS ---

function updateHUD() {
    if(!game.player) return;
    healthBarFill.style.width = `${(game.player.health / game.player.maxHealth) * 100}%`;
    healthText.textContent = `${Math.ceil(game.player.health)} / ${Math.ceil(game.player.maxHealth)}`;
    xpBarFill.style.width = `${(game.xp / game.xpToNextLevel) * 100}%`;
    xpText.textContent = `${game.xp} / ${game.xpToNextLevel}`;
    document.getElementById('level').textContent = game.level;
    coinsDisplay.textContent = `${game.coins}`;
    bombsDisplay.textContent = game.player.bombs;
    crossAttacksDisplay.textContent = game.player.crossAttacksAvailable;
    chestsDisplay.textContent = game.player.chestsAvailable;
    legendaryChestsDisplay.textContent = game.player.legendaryChestsAvailable;
    waveDisplay.textContent = game.currentWave + 1;
    rebirthLevelDisplay.textContent = persistentData.rebirthLevel;
    enemiesLeftDisplay.textContent = game.enemies.length;
    enemiesToSpawnDisplay.textContent = game.enemiesToSpawnInCurrentWave;
    timeValue.textContent = Math.floor(game.time / 60);
}

function updateBossHealthBar() {
    const boss = game.enemies.find(e => e.type.includes('_boss'));
    if (boss) {
        bossHealthContainer.style.display = 'block';
        bossName.textContent = boss.displayName;
        bossHealthFill.style.width = `${(boss.health / boss.maxHealth) * 100}%`;
    } else {
        bossHealthContainer.style.display = 'none';
    }
}

function gainXP(amount) {
    game.xp += Math.round(amount * game.player.xpMultiplier * game.xpCoinMultiplier);
    while (game.xp >= game.xpToNextLevel) {
        game.pendingLevelUps++;
        game.xp -= game.xpToNextLevel;
        game.level++;
        game.xpToNextLevel = Math.floor(game.xpToNextLevel * 1.2);
    }
    updateHUD();
}

function addCoins(amount) {
    game.coins += Math.ceil(amount * game.player.coinMultiplier * game.xpCoinMultiplier);
    
    // 1. Actualiza el texto de arriba (Vida, XP)
    updateHUD();
    
    // 2. Actualiza la tienda lateral (Ilumina los botones si tienes dinero)
    updateRunShopUI();
    
    if(game.running) updateRebirthButton();
}

function onEnemyKilled(enemy) {
    soundManager.playSound('enemyDie');
    game.stats.kills++;
    addCoins(enemy.coinValue);
    game.gems.push(new Gem(enemy.x, enemy.y, enemy.xpValue));
    if (enemy.type === 'bomber') {
        game.explosions.push(new Explosion(enemy.x, enemy.y, 10, 60, 'radial'));
    }
    if (enemy.type.includes('_boss')) {
        game.stats.bossesKilled++;
        game.chests.push(new Chest(enemy.x, enemy.y, true));
        triggerScreenShake(15);
    }
    else if (Math.random() < 0.02 * (game.player.luck || 1)) {
        game.chests.push(new Chest(enemy.x, enemy.y));
    }
}

function levelUp() {
    soundManager.playSound('levelUp');
    game.pendingLevelUps--; game.levelUpPending = true; game.paused = true;
    game.player.health = game.player.maxHealth;
    showLevelUpMenu(); updateHUD();
}

function showLevelUpMenu() {
    levelUpMenu.style.display = 'flex';
    document.getElementById('current-level').textContent = game.level;
    const optionsContainer = document.getElementById('upgrade-options');
    optionsContainer.innerHTML = '';

    const isSummoner = game.player.isSummoner;
    const upgradePool = isSummoner ? summonerUpgrades : upgrades;

    const availableUpgrades = Object.keys(upgradePool).filter(key => !upgradePool[key].canApply || upgradePool[key].canApply(game.player));
    const chosenUpgrades = [];
    while (chosenUpgrades.length < 3 && availableUpgrades.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
        chosenUpgrades.push(availableUpgrades.splice(randomIndex, 1)[0]);
    }
    chosenUpgrades.forEach(key => {
        const upgrade = upgradePool[key];
        const card = document.createElement('div'); card.className = 'upgrade-card';
        let description = upgrade.description;
        if (upgrade.levels) {
            const currentLevel = upgrade.getCurrentLevel(game.player);
            if (currentLevel < upgrade.levels.length) {
                description = upgrade.levels[currentLevel].description;
            } else {
                description = "¡NIVEL MÁXIMO!";
            }
        }
        card.innerHTML = `<h3>${upgrade.name}</h3><p>${description}</p>`;
        card.onclick = () => selectUpgrade(upgrade);
        optionsContainer.appendChild(card);
    });

    game.gamepad.menuSelectionIndex = 0;
}

function selectUpgrade(upgrade) {
    upgrade.apply(game.player);
    levelUpMenu.style.display = 'none';
    game.levelUpPending = false;

    try {
        checkForEvolutions();
    } catch (e) {
        console.error("Error al comprobar evoluciones:", e);
    }

    if (game.pendingLevelUps === 0 && !game.chestRoulettePending) {
        game.paused = false;
    }
}


function checkForEvolutions() {
    const p = game.player;
    Object.values(upgrades).forEach(upg => {
        if (!upg.evolution || !upg.id) return;

        let isAlreadyEvolved = false;
        if ((upg.id === 'AGUA_BENDITA' && p.holyWaterLevel === 'EVOLVED') ||
            (upg.id === 'LIBRO_REAL' && p.bibleLevel === 'EVOLVED') ||
            (upg.id === 'AJO' && p.auraLevel === 'EVOLVED') ||
            (upg.id === 'RAYO_EN_CADENA' && p.chainLightning === 'EVOLVED') ||
            (upg.id === 'HACHA' && p.axeLevel === 'EVOLVED')) {
            isAlreadyEvolved = true;
        }
        if (isAlreadyEvolved) return;

        let isMaxLevel = false;
        if (typeof upg.getCurrentLevel === 'function') {
            if (upg.levels && upg.getCurrentLevel(p) === upg.levels.length) {
                isMaxLevel = true;
            } else if (upg.maxLevel && !upg.levels && upg.getCurrentLevel(p) >= upg.maxLevel) {
                isMaxLevel = true;
            }
        }

        if (isMaxLevel) {
            const req = upg.evolution.requires;
            let hasReq = false;
            if (req === 'IMAN' && (p.imanLevel || 0) > 0) hasReq = true;
            if (req === 'CADENCIA' && (p.cadenceLevel || 0) > 0) hasReq = true;
            if (req === 'VIGOR' && (p.vigorLevel || 0) > 0) hasReq = true;
            if (req === 'BALAS_PERFORANTES' && (p.pierce || 0) >= 5) hasReq = true;
            if (req === 'CELERIDAD' && (p.celeridadLevel || 0) > 0) hasReq = true;

            if(hasReq) {
                const evolutionName = upg.evolution.to;
                evolutions[evolutionName].apply(p);
                soundManager.playSound('evolution');
                alert(`¡EVOLUCIÓN! ¡${upg.name} ha evolucionado a ${evolutions[evolutionName].name}!`);
            }
        }
    });
}

function showRoulette(isLegendary) {
    game.paused = true;
    game.chestRoulettePending = true;
    rouletteMenu.style.display = 'flex';
    document.getElementById('roulette-title').textContent = isLegendary ? "¡COFRE LEGENDARIO!" : "¡COFRE!";
    const wheel = document.getElementById('roulette-wheel');

    wheel.style.transition = 'none';
    wheel.style.left = '0px';
    wheel.innerHTML = '';

    let pool;
    if (isLegendary) {
        pool = specialUpgrades;
    } else {
        pool = game.player.isSummoner ? summonerUpgrades : upgrades;
    }

    let availableUpgrades = Object.keys(pool).filter(key => {
        const upg = pool[key];
        if (upg.canApply) return upg.canApply(game.player);
        return true;
    });

    if (availableUpgrades.length === 0) {
        const rewardCoins = isLegendary ? 1000 : 250;
        addCoins(rewardCoins);
        wheel.innerHTML = `<div class="upgrade-card" style="margin: auto; text-align: center;"><h3>¡Recompensa!</h3><p>No quedan mejoras. ¡Has recibido ${rewardCoins} monedas!</p></div>`;
        setTimeout(() => endRoulette(null), 2500);
        return;
    }

    const rouletteUpgrades = [];
    for (let i = 0; i < 30; i++) {
        rouletteUpgrades.push(pool[availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)]]);
    }

    let wheelHTML = '';
    rouletteUpgrades.forEach(upgrade => {
        let description = upgrade.description;
        if (upgrade.levels && typeof upgrade.getCurrentLevel === 'function') {
            const currentLevel = upgrade.getCurrentLevel(game.player);
            description = currentLevel < upgrade.levels.length ? upgrade.levels[currentLevel].description : "¡NIVEL MÁXIMO!";
        }
        wheelHTML += `<div class="upgrade-card"><h3>${upgrade.name}</h3><p>${description}</p></div>`;
    });
    wheel.innerHTML = wheelHTML;

    setTimeout(() => {
        const cardWidth = 180 + 20; // Ancho de la tarjeta + gap
        const targetIndex = 25;
        const menuContentWidth = rouletteMenu.querySelector('.menu-content').offsetWidth;
        const finalPosition = - (targetIndex * cardWidth) + (menuContentWidth / 2) - (cardWidth / 2) + 10;

        wheel.style.transition = 'left 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
        wheel.style.left = `${finalPosition}px`;

        setTimeout(() => {
            endRoulette(rouletteUpgrades[targetIndex]);
        }, 3500);
    }, 50);
}

function endRoulette(chosenUpgrade) {
    if (chosenUpgrade && chosenUpgrade.apply) {
        chosenUpgrade.apply(game.player);
    }
    updateHUD();
    checkForEvolutions();
    setTimeout(() => {
        rouletteMenu.style.display = 'none';
        game.chestRoulettePending = false;
        if (game.pendingLevelUps === 0) {
            game.paused = false;
        }
    }, 1500);
}

// --- WAVE SYSTEM ---
function startNextWave() {
    const waveIndex = game.currentWave;
    let waveConfig;
    if (waveIndex >= waves.length) {
        const wavePower = waveIndex - waves.length;
        waveConfig = { spawnCount: 40 + wavePower * 5, enemyTypes: allEnemyTypesForEndless, spawnRate: Math.max(15, 40 - wavePower), title: `Oleada Infinita ${wavePower + 1}`};
    } else {
        waveConfig = { ...waves[waveIndex] };
    }

    if(!game.waveConfig || !game.waveConfig.title.includes(waveConfig.title)) {
        if(game.currentWave > 1 && !waveConfig.title.includes("El Rey") && !waveConfig.title.includes("La Reina") && !waveConfig.title.includes("Hechicero") && Math.random() < 0.2) {
            const modifier = Math.random() < 0.5 ? 'fast' : 'elite';
            if(modifier === 'fast') {
                waveConfig.title = `(RÁPIDA) ${waveConfig.title}`;
                waveConfig.speedMultiplier = 1.5;
            } else {
                waveConfig.title = `(ÉLITE) ${waveConfig.title}`;
                waveConfig.onlyElites = true;
            }
        }
    }
    game.waveConfig = waveConfig;

    game.enemiesToSpawnInCurrentWave = game.waveConfig.spawnCount;
    game.waveActive = true; game.spawnTimer = 0; updateHUD();
    waveIndicator.textContent = game.waveConfig.title; waveIndicator.style.opacity = 1;
    setTimeout(() => { waveIndicator.style.opacity = 0; }, 2500);
}

function updateWave() {
    if (!game.waveActive && game.enemies.length === 0) { startNextWave(); return; }
    if (!game.waveActive) return;

    if (++game.spawnTimer >= game.waveConfig.spawnRate && game.enemiesToSpawnInCurrentWave > 0) {
        game.spawnTimer = 0;
        let enemyPool = game.waveConfig.enemyTypes;
        if(game.waveConfig.onlyElites) {
            enemyPool = enemyPool.filter(e => ['elite', 'juggernaut', 'broodmother', 'ice_tank'].includes(e.type));
            if(enemyPool.length === 0) enemyPool = game.waveConfig.enemyTypes; // fallback
        }

        const rand = Math.random(); let cumulativeWeight = 0;
        const totalWeight = enemyPool.reduce((sum, e) => sum + e.weight, 0);
        for (const enemyType of enemyPool) {
            cumulativeWeight += enemyType.weight / totalWeight;
            if (rand <= cumulativeWeight) {
                spawnEnemy(enemyType.type);
                break;
            }
        }
        game.enemiesToSpawnInCurrentWave--;
    }

    if (game.enemiesToSpawnInCurrentWave === 0 && game.enemies.length === 0) {
        game.waveActive = false; game.currentWave++;
        addCoins(50 + game.currentWave * 5);
        if (game.currentWave > 0 && waves[game.currentWave-1] && !waves[game.currentWave-1].enemyTypes[0].type.includes('_boss')) {
             game.chests.push(new Chest(WIDTH / 2, HEIGHT / 2));
        }
    }
    updateHUD();
}

// --- GAME STATE & MENU CONTROLS ---

function showDifficultyMenu() {
    soundManager.init();
    mainMenu.style.display = 'none';
    difficultyMenu.style.display = 'flex';
    game.gamepad.menuSelectionIndex = 0;
}
function setDifficulty(diff) { game.difficulty = diff; difficultyMenu.style.display = 'none'; showCharacterSelectMenu(); }
function showCharacterSelectMenu() {
    characterSelectMenu.style.display = 'flex';
    game.gamepad.menuSelectionIndex = 0;
    const options = document.getElementById('character-options'); options.innerHTML = '';

    const playableCharacters = Object.keys(characters).filter(key => key !== 'ADMIN');

    playableCharacters.forEach(key => {
        const char = characters[key];
        const isUnlocked = !char.locked || persistentData.unlockedCharacters[key];

        const card = document.createElement('div');
        card.className = 'character-card';
        card.id = `char-card-${key}`;

        if (!isUnlocked) {
            card.classList.add('locked');
            card.innerHTML = `<h3>${char.name}</h3><p style="font-size: 0.9em; text-align: center; color: #ffcc66;">🔒 Bloqueado</p><p style="text-align: center;">${char.unlockCondition}</p>`;
        } else {
            card.innerHTML = `<h3>${char.name}</h3><p>${char.description}</p><ul><li>Vida: <span class="char-stat">${char.stats.maxHealth}</span></li><li>Velocidad: <span class="char-stat">${char.stats.speed}</span></li><li>Daño: <span class="char-stat">${char.stats.weaponDamage}</span></li><li>Cadencia: <span class="char-stat">${(60 / char.stats.weaponRate).toFixed(1)}</span>/s</li></ul>`;
            card.onclick = () => selectCharacter(char.stats);
        }
        options.appendChild(card);
    });
}

function selectCharacter(stats) {
    characterSelectMenu.style.display = 'none';
    let finalStats = { ...stats };
    Object.keys(persistentData.talents).forEach(talentKey => {
        const talent = talentTree[talentKey];
        const level = persistentData.talents[talentKey];
        if (talent && talent.apply) {
            talent.apply(finalStats, level);
        }
    });
    startGame(finalStats);
}

function generateMap() {
    game.map = { obstacles: [], background: '#111'};
    const mapType = Math.random() < 0.5 ? 'forest' : 'arena';

    if (mapType === 'forest') {
        game.map.background = '#164A41';
        const safeZoneRadius = 100; // Radio de la zona segura para el jugador
        const centerX = WIDTH / 2;
        const centerY = HEIGHT / 2;

        for(let i=0; i<20; i++){
            let x, y, distToCenter;

            // Asegurarse de que el obstáculo no esté en la zona segura
            do {
                x = Math.random() * WIDTH;
                y = Math.random() * HEIGHT;
                distToCenter = Math.hypot(x - centerX, y - centerY);
            } while (distToCenter < safeZoneRadius);

            game.map.obstacles.push({
                x: x,
                y: y,
                radius: 10 + Math.random() * 20,
                color: '#4D774E'
            });
        }
    }
}


function startGame(charStats) {
    generateMap();
    game.stats = { kills: 0, bossesKilled: 0 };
    game.player = new Player(WIDTH / 2, HEIGHT / 2);
    Object.assign(game.player, charStats);
    if(charStats.startsWith) {
        upgrades[charStats.startsWith].levels[0].apply(game.player);
    }
    game.player.baseStats = { ...charStats };
    game.player.bombs = 1; mainMenu.style.display = 'none';
    game.running = true; game.paused = false;
    updateRebirthButton(); 
    updateHUD(); 
    
    // 👇 ¡AQUÍ VA EL PASO 1! Arrancamos la tienda lateral 👇
    startRunShop(); 
    
    gameLoop();
}

function gameOver() {
    checkAchievements();
    game.running = false; gameOverScreen.style.display = 'flex';
    document.getElementById('final-time').textContent = Math.floor(game.time / 60);
    document.getElementById('final-rebirth-level').textContent = persistentData.rebirthLevel;
}

function togglePause() {
    if (!game.running || game.levelUpPending || game.chestRoulettePending || adminMenu.style.display === 'flex') return;
    game.paused = !game.paused;
    pauseMenu.style.display = game.paused ? 'flex' : 'none';
    if (game.paused) {
        game.gamepad.menuSelectionIndex = 0;
    }
}

// --- PEGA LAS SIGUIENTES DOS FUNCIONES AQUÍ ---

/**
 * Muestra u oculta el menú de inventario.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
function showInventoryMenu(show) {
    if (show) {
        // Oculta el menú de pausa para mostrar el de inventario
        pauseMenu.style.display = 'none';
        game.paused = true;
        populateInventory();
        inventoryMenu.style.display = 'flex';
        game.gamepad.menuSelectionIndex = 0; // Resetea la selección del gamepad
    } else {
        // Oculta el inventario y vuelve a mostrar el menú de pausa
        inventoryMenu.style.display = 'none';
        pauseMenu.style.display = 'flex';
        game.gamepad.menuSelectionIndex = 0; // Resetea la selección del gamepad
    }
}

/**
 * Rellena el grid del inventario con las mejoras actuales del jugador.
 */
function populateInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    const p = game.player;

    let foundUpgrades = [];

    // Función auxiliar para añadir al inventario
    const addUpgradeToInventory = (name, level) => {
        if (!name) return;
        let levelText;
        if (level === 'EVOLVED') {
            levelText = `<span class="evo-text">¡EVOLUCIONADO!</span>`;
        } else if (typeof level === 'number') {
            levelText = `Nivel: <span class="level-text">${level}</span>`;
        } else {
            levelText = `<span class="level-text">Activado</span>`;
        }
        
        foundUpgrades.push({ name, levelText });
    };

    // 1. Mejoras de Nivel (Armas y Pasivas)
    if (p.isSummoner) {
        // Mejoras de Invocador
        if (p.minionDamage > p.baseStats.minionDamage) addUpgradeToInventory(summonerUpgrades.SUMMON_DAMAGE.name, (p.minionDamage - p.baseStats.minionDamage).toFixed(0));
        if (p.minionHealth > p.baseStats.minionHealth) addUpgradeToInventory(summonerUpgrades.SUMMON_HEALTH.name, (p.minionHealth - p.baseStats.minionHealth).toFixed(0));
        if (p.summonerUpgrade_Count > 0) addUpgradeToInventory(summonerUpgrades.SUMMON_COUNT.name, p.summonerUpgrade_Count);
        if (p.minionAoE > 0) addUpgradeToInventory(summonerUpgrades.MINION_AOE.name, 'Sí');
        if (p.minionSpeedBonus > 1) addUpgradeToInventory(summonerUpgrades.MINION_SPEED.name, `${(p.minionSpeedBonus * 100 - 100).toFixed(0)}%`);
        if (p.maxHealth > p.baseStats.maxHealth) addUpgradeToInventory(summonerUpgrades.PLAYER_HEALTH.name, (p.maxHealth - p.baseStats.maxHealth).toFixed(0));
        if (p.speed > p.baseStats.speed) addUpgradeToInventory(summonerUpgrades.PLAYER_SPEED.name, (p.speed - p.baseStats.speed).toFixed(1));
    } else {
        // Mejoras Estándar
        if (p.vigorLevel > 0) addUpgradeToInventory(upgrades.VIGOR.name, p.vigorLevel);
        if (p.cadenceLevel > 0) addUpgradeToInventory(upgrades.CADENCIA.name, p.cadenceLevel);
        if (p.imanLevel > 0) addUpgradeToInventory(upgrades.IMAN.name, p.imanLevel);
        if (p.celeridadLevel > 0) addUpgradeToInventory(upgrades.CELERIDAD.name, p.celeridadLevel);
        if (p.pierce > 0) addUpgradeToInventory(upgrades.BALAS_PERFORANTES.name, p.pierce);
        if (p.chainLightning > 0) addUpgradeToInventory(upgrades.RAYO_EN_CADENA.name, p.chainLightning);
        if (p.axeLevel > 0) addUpgradeToInventory(upgrades.HACHA.name, p.axeLevel);
        if (p.auraLevel > 0) addUpgradeToInventory(upgrades.AJO.name, p.auraLevel);
        if (p.bibleLevel > 0) addUpgradeToInventory(upgrades.LIBRO_REAL.name, p.bibleLevel);
        if (p.holyWaterLevel > 0) addUpgradeToInventory(upgrades.AGUA_BENDITA.name, p.holyWaterLevel);
        if (p.aoeLevel > 0) addUpgradeToInventory(upgrades.EXPLOSION_RADIAL.name, p.aoeLevel);
        if (p.multishotLevel > 0) addUpgradeToInventory(upgrades.DISPARO_MULTIPLE.name, p.multishotLevel);
    }
    
    // 2. Mejoras de Tienda y Especiales
    if (p.hasFourSeasons) addUpgradeToInventory(shopItems.FOUR_SEASONS.name, 1);
    if (p.hasResurrection) addUpgradeToInventory(shopItems.RESURRECTION.name, 1);
    if (p.hasParry) addUpgradeToInventory(specialUpgrades.PARRY.name, 1);
    if (p.hasLaser) addUpgradeToInventory(specialUpgrades.RAYO_LASER.name, 1);
    if (p.isGiant) addUpgradeToInventory(specialUpgrades.GIGANTE.name, 1);

    // 3. Renderizar en el grid
    if (foundUpgrades.length === 0) {
        grid.innerHTML = '<p style="color: #888; grid-column: 1 / -1; text-align: center;">No tienes ninguna mejora activa.</p>';
        return;
    }

    foundUpgrades.forEach(upg => {
        const card = document.createElement('div');
        card.className = 'inventory-card';
        card.innerHTML = `<h3>${upg.name}</h3><p>${upg.levelText}</p>`;
        grid.appendChild(card);
    });
} 
    
function populateShop() {
    const inventory = document.getElementById('shop-inventory');
    document.getElementById('shop-coins-display').textContent = game.coins; inventory.innerHTML = '';
    Object.keys(shopItems).forEach(key => {
        const item = shopItems[key];
        const card = document.createElement('div'); card.className = 'shop-item-card';
        card.innerHTML = `<h3>${item.name}</h3><p>${item.description}</p><button class="buy-button" id="buy-${key}">Comprar (🪙${item.cost})</button>`;
        inventory.appendChild(card);
        const button = document.getElementById(`buy-${key}`);
        button.disabled = game.coins < item.cost || (key === 'FOUR_SEASONS' && game.player.hasFourSeasons);
        button.onclick = () => { if (game.coins >= item.cost) { game.coins -= item.cost; item.buy(game.player); populateShop(); } };
    });
}

// --- EVENT LISTENERS ---
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    game.keys[key] = true;
    if (!game.running) return;
    if (key === 'p' || key === 'escape') {
        togglePause();
        return;
    }
    if (game.paused) return;
    switch(key) {
        case 'q': game.player.placeMine(); break;
        case 'e': game.player.useCrossAttack(); break;
        case 'c': game.player.useChest(); break;
        case 'l': game.player.useLegendaryChest(); break;
    }
});
window.addEventListener('keyup', (e) => { game.keys[e.key.toLowerCase()] = false; });
window.addEventListener('gamepadconnected', (e) => { gamepadIndicator.style.display = 'block'; });
window.addEventListener('gamepaddisconnected', (e) => { gamepadIndicator.style.display = 'none'; });

window.addEventListener('DOMContentLoaded', () => {
    preloadAssets(); // Cargar imágenes primero
    loadProgress(); // Luego cargar el progreso guardado
});


// --- ADMIN, REBIRTH & SAVE/LOAD FUNCTIONS ---
function showAdminPrompt() {
    const pass = prompt("Introduce la contraseña de administrador:");
    if (pass === "admin8009") { toggleAdminMenu(true); } else if (pass) { alert("Contraseña incorrecta."); }
}
function toggleAdminMenu(show) {
    adminMenu.style.display = show ? 'flex' : 'none';
    pauseMenu.style.display = show ? 'none' : 'flex';
    if(show) { game.paused = true; showAdminSubMenu('main'); }
}
function addLevels(num) {
    alert(`Has ganado ${num} subidas de nivel. Elige tus mejoras.`);
    game.pendingLevelUps += num;
    toggleAdminMenu(false);
}
function showWaveJumpPrompt() {
    const waveNum = parseInt(prompt(`Estás en la ronda ${game.currentWave + 1}. ¿A qué ronda quieres saltar?`));
    if (!isNaN(waveNum) && waveNum > 0) {
        game.currentWave = waveNum - 1; game.waveActive = false;
        ['enemies', 'gems', 'projectiles', 'explosions', 'mines', 'holyWaters', 'chests'].forEach(key => game[key] = []);
        toggleAdminMenu(false); game.paused = false;
    }
}
function showAdminSubMenu(menu) {
    document.getElementById('admin-main-content').style.display = menu === 'main' ? 'block' : 'none';
    document.getElementById('admin-upgrades-content').style.display = menu === 'upgrades' ? 'block' : 'none';
    if (menu === 'upgrades') {
        const container = document.getElementById('admin-upgrade-options'); container.innerHTML = '';

        const upgradePool = game.player.isSummoner ? summonerUpgrades : upgrades;

        Object.keys(upgradePool).forEach(key => {
            const upg = upgradePool[key];
            if (!upg.canApply || upg.canApply(game.player)){
                const btn = document.createElement('button'); btn.textContent = upg.name;
                btn.onclick = () => { upg.apply(game.player); alert(`Mejora "${upg.name}" aplicada.`); showAdminSubMenu('upgrades'); updateHUD(); };
                container.appendChild(btn);
            }
        });
    }
}
function updateRebirthButton() {
    const cost = 100 * Math.pow(2, persistentData.rebirthLevel);
    rebirthCostDisplay.textContent = cost;
    if (rebirthButton) {
        rebirthButton.disabled = game.coins < cost;
    }
}
function showRebirthPrompt() {
    const cost = 100 * Math.pow(2, persistentData.rebirthLevel);
    if (game.coins < cost) { alert("No tienes suficientes monedas para renacer."); return; }
    if (confirm(`¿Seguro que quieres renacer por ${cost} monedas?\n\nObtendrás 1 Punto de Talento para gastar en mejoras permanentes.`)) {
        performRebirth(cost);
    }
}
function performRebirth() {
    persistentData.rebirthLevel++;
    persistentData.talentPoints++;
    if(talentTree['rebirth_bonus'].apply && (persistentData.talents['rebirth_bonus'] || 0) > 0 && persistentData.rebirthLevel % 5 === 0) {
        persistentData.talentPoints++;
        alert("¡Bono de Rebirth! Has ganado un punto de talento extra.");
    }
    saveProgress();

    alert("¡Has renacido! Has ganado Puntos de Talento.");
    window.location.reload();
}

function showTalentTree(show) {
    if (show) {
        mainMenu.style.display = 'none';
        talentTreeMenu.style.display = 'flex';
        populateTalentTree();
    } else {
        talentTreeMenu.style.display = 'none';
        mainMenu.style.display = 'flex';
    }
}

function populateTalentTree() {
    const grid = document.getElementById('talent-tree-grid');
    grid.innerHTML = '';
    document.getElementById('talent-points-display').textContent = `Puntos: ${persistentData.talentPoints}`;

    Object.keys(talentTree).forEach(key => {
        const talent = talentTree[key];
        const currentLevel = persistentData.talents[key] || 0;
        const card = document.createElement('div');
        card.className = 'talent-card';

        const isMaxed = currentLevel >= talent.maxLevel;
        const requirementMet = !talent.requires || (persistentData.talents[talent.requires] || 0) > 0;
        const isLocked = !requirementMet;

        card.innerHTML = `
            <h3>${talent.name}</h3>
            <p>${talent.desc}</p>
            <div class="level">Nivel: ${currentLevel} / ${talent.maxLevel}</div>
            <div class="cost">${isMaxed ? 'MAX' : `Coste: ${talent.cost(currentLevel)}`}</div>
            ${isLocked ? `<div class="talent-req">Req: ${talentTree[talent.requires].name}</div>` : ''}
        `;

        if (isLocked) {
            card.classList.add('locked');
        } else if (isMaxed) {
            card.classList.add('maxed');
        } else {
             card.classList.add('unlocked');
             card.onclick = () => buyTalent(key);
        }
        grid.appendChild(card);
    });
}

function buyTalent(key) {
    const talent = talentTree[key];
    const currentLevel = persistentData.talents[key] || 0;
    const cost = talent.cost(currentLevel);

    if (persistentData.talentPoints >= cost && currentLevel < talent.maxLevel) {
        persistentData.talentPoints -= cost;
        persistentData.talents[key] = currentLevel + 1;
        saveProgress();
        populateTalentTree();
    } else {
        if(persistentData.talentPoints < cost) alert("No tienes suficientes puntos.");
        else alert("Ya has alcanzado el nivel máximo para esta mejora.");
    }
}

function saveProgress() {
    try {
        persistentData.settings = { ...settings };
        localStorage.setItem('survivalShooterSave', JSON.stringify(persistentData));
        console.log("Progreso guardado.");
        document.getElementById('load-button').textContent = `Mejoras (R-Nivel ${persistentData.rebirthLevel})`;
    } catch (e) {
        console.error("No se pudo guardar el progreso.", e);
    }
}

function loadProgress() {
    try {
        const savedData = localStorage.getItem('survivalShooterSave');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (!parsedData.talents) parsedData.talents = {};
            if (!parsedData.achievements) parsedData.achievements = {};
            if (!parsedData.unlockedCharacters) parsedData.unlockedCharacters = { STANDARD: true, SNIPER: true, TANK: true, MAGE: true, BARBARIAN: true, CLERIC: true };
            Object.assign(persistentData, parsedData);
            if (parsedData.settings) {
                Object.assign(settings, parsedData.settings);
            }
            console.log("Progreso cargado.");
        }
    } catch (e) {
        console.error("No se pudo cargar el progreso.", e);
    }
    document.getElementById('load-button').textContent = `Mejoras (R-Nivel ${persistentData.rebirthLevel})`;
    document.getElementById('setting-health-bars').checked = settings.showEnemyHealthBars;
    document.getElementById('setting-damage-numbers').checked = settings.showDamageNumbers;
    document.getElementById('setting-screen-shake').checked = settings.enableScreenShake;
    changeMenuColor(settings.menuColor, false);
}

function showSettingsMenu(show) {
    if(show) {
        mainMenu.style.display = 'none';
        settingsMenu.style.display = 'flex';
        game.gamepad.menuSelectionIndex = 0;
    } else {
        mainMenu.style.display = 'flex';
        settingsMenu.style.display = 'none';
        game.gamepad.menuSelectionIndex = 0;
    }
}

function toggleSetting(settingName) {
    settings[settingName] = !settings[settingName];
    saveProgress();
}

function changeMenuColor(color, doSave = true) {
    document.documentElement.style.setProperty('--menu-glow-color', color);
    settings.menuColor = color;

    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('selected', swatch.style.backgroundColor === color || `rgb(${swatch.style.backgroundColor})` === hexToRgb(color));
    });

    if (doSave) saveProgress();
}
function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) { r = "0x" + hex[1] + hex[1]; g = "0x" + hex[2] + hex[2]; b = "0x" + hex[3] + hex[3]; }
    else if (hex.length == 7) { r = "0x" + hex[1] + hex[2]; g = "0x" + hex[3] + hex[4]; b = "0x" + hex[5] + hex[6]; }
    return "rgb(" + +r + ", " + +g + ", " + +b + ")";
}


function showAchievementsMenu(show) {
    if(show) {
        mainMenu.style.display = 'none';
        achievementsMenu.style.display = 'flex';
        populateAchievementsMenu();
    } else {
        achievementsMenu.style.display = 'none';
        mainMenu.style.display = 'flex';
    }
}

function populateAchievementsMenu() {
    const grid = document.getElementById('achievements-grid');
    grid.innerHTML = '';
    Object.keys(achievements).forEach(key => {
        const ach = achievements[key];
        const card = document.createElement('div');
        card.className = 'achievement-card';
        if (persistentData.achievements[key]) {
            card.classList.add('unlocked');
        }
        card.innerHTML = `<h4>${ach.name}</h4><p>${ach.description}</p>`;
        grid.appendChild(card);
    });
}

function checkAchievements() {
    if (!game.running) return;
    Object.keys(achievements).forEach(key => {
        if (!persistentData.achievements[key]) { // Si no está ya desbloqueado
            if (achievements[key].condition()) {
                unlockAchievement(key);
            }
        }
    });
}

function unlockAchievement(key) {
    if (persistentData.achievements[key]) return; // Ya desbloqueado
    persistentData.achievements[key] = true;
    showAchievementToast(achievements[key]);

    // Procesar recompensa si existe
    const reward = achievements[key].reward;
    if (reward) {
        if (reward.type === 'UNLOCK_CHARACTER') {
            persistentData.unlockedCharacters[reward.key] = true;
            alert(`¡Nuevo personaje desbloqueado: ${characters[reward.key].name}!`);
        }
    }
    saveProgress();
}

function showAchievementToast(achievement) {
    const toast = document.getElementById('achievement-toast');
    const toastText = document.getElementById('achievement-toast-text');
    toastText.textContent = achievement.name;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}


function checkAdminCharacterSelect() {
    const code = prompt("Introduce el código de personaje:");
    if (code === "admin8009") { alert("¡Código correcto! Personaje de Administrador desbloqueado. ¡Diviértete!"); selectCharacter(characters.ADMIN.stats); }
    else if (code) { alert("Código incorrecto."); }
}

function resetFullProgress() {
    if (confirm("¿Estás seguro de que quieres borrar TODO tu progreso? Esta acción es irreversible y perderás tu nivel de Rebirth, talentos, logros y personajes desbloqueados.")) {
        localStorage.removeItem('survivalShooterSave');
        window.location.reload();
    }
}

function handleGamepadInput() {
    const gamepads = navigator.getGamepads();
    if (!gamepads[0]) return;
    const gamepad = gamepads[0];
    const deadzone = 0.2;

    const currentButtonStates = gamepad.buttons.map(b => b.pressed);
    const wasButtonPressed = (index) => currentButtonStates[index] && !game.gamepad.lastButtonStates[index];

    // --- Control Fuera de Partida (Menús) ---
    const isMenuVisible = mainMenu.style.display === 'flex' ||
                          pauseMenu.style.display === 'flex' ||
                          levelUpMenu.style.display === 'flex' ||
                          difficultyMenu.style.display === 'flex' ||
                          characterSelectMenu.style.display === 'flex' ||
                          settingsMenu.style.display === 'flex' ||
                          achievementsMenu.style.display === 'flex' ||
                          talentTreeMenu.style.display === 'flex';

    if (isMenuVisible) {
        let container, options, isHorizontal = false;

        if (levelUpMenu.style.display === 'flex') {
            container = document.getElementById('upgrade-options');
            options = container.querySelectorAll('.upgrade-card');
            isHorizontal = true;
        } else if (mainMenu.style.display === 'flex') {
            container = mainMenu.querySelector('.menu-content');
            options = container.querySelectorAll('button, a.menu-button');
        } else if (pauseMenu.style.display === 'flex') {
            container = pauseMenu.querySelector('.menu-content');
            options = container.querySelectorAll('button');
        } else if (difficultyMenu.style.display === 'flex') {
            container = difficultyMenu.querySelector('.menu-content');
            options = container.querySelectorAll('button');
        } else if (characterSelectMenu.style.display === 'flex') {
            container = document.getElementById('character-options');
            options = container.querySelectorAll('.character-card');
            isHorizontal = true;
        }

        if (container && options && options.length > 0) {
            let moved = false;
            if (isHorizontal) {
                if (wasButtonPressed(14) || wasButtonPressed(4)) { game.gamepad.menuSelectionIndex = (game.gamepad.menuSelectionIndex - 1 + options.length) % options.length; moved = true; } // Izquierda / L1
                if (wasButtonPressed(15) || wasButtonPressed(5)) { game.gamepad.menuSelectionIndex = (game.gamepad.menuSelectionIndex + 1) % options.length; moved = true; } // Derecha / R1
            }
            if (wasButtonPressed(12)) { game.gamepad.menuSelectionIndex = (game.gamepad.menuSelectionIndex - 1 + options.length) % options.length; moved = true; } // Arriba
            if (wasButtonPressed(13)) { game.gamepad.menuSelectionIndex = (game.gamepad.menuSelectionIndex + 1) % options.length; moved = true; } // Abajo

            if(moved) {
                options.forEach((opt, index) => opt.classList.toggle('selected', index === game.gamepad.menuSelectionIndex));
            }

            if (wasButtonPressed(0)) { // Botón X (Aceptar)
                options[game.gamepad.menuSelectionIndex].click();
            }
        }
    }

    // --- Control Durante la Partida ---
    if (!game.paused && game.running && game.player) {
        let stickX = gamepad.axes[0];
        let stickY = gamepad.axes[1];
        if (Math.abs(stickX) < deadzone) stickX = 0;
        if (Math.abs(stickY) < deadzone) stickY = 0;

        if (stickX !== 0 || stickY !== 0) {
            game.inputHandledThisFrame = true;
            game.player.applyMovement(stickX, stickY);
        }

        if (wasButtonPressed(2)) game.player.placeMine();       // Square
        if (wasButtonPressed(3)) game.player.useCrossAttack(); // Triangle
        if (wasButtonPressed(5)) game.player.useChest();        // R1
        if (wasButtonPressed(4)) game.player.useLegendaryChest(); // L1
    }

    if (wasButtonPressed(17)) { // Panel Táctil
        togglePause();
    }

    game.gamepad.lastButtonStates = currentButtonStates;
}
// ==========================================
// CONFIGURACIÓN AUTOMÁTICA DE PHOTON
// ==========================================
const appId = "f0e6c485-6d70-4298-b182-a539a6f52b66";
const client = new Photon.LoadBalancing.LoadBalancingClient(Photon.ConnectionProtocol.Wss, appId, "1.0");

// Esto se ejecuta solo cada vez que el servidor cambia de estado
client.onStateChange = function (state) {
    console.log("Estado de Photon:", state);
    
    if (state === Photon.LoadBalancing.LoadBalancingClient.State.ConnectedToMaster) {
        console.log("✅ ¡Conectado al Master oficial!");
    }
};

// CONEXIÓN AUTOMÁTICA (Sin botones)
client.connectToRegionMaster("eu");
// --- LÓGICA DE LA NUEVA TIENDA DE PARTIDA (RUN SHOP) ---

// =========================================================
// --- LÓGICA DE LA NUEVA TIENDA DE PARTIDA (RUN SHOP) ---
// =========================================================

// 1. INVENTARIO DE LA TIENDA (Tus objetos + Mejoras Base)
const runUpgradesData = [
    // TUS OBJETOS ORIGINALES
    { id: 'bomb', name: 'Mina Estática', icon: '⬛', baseCost: 10, currentLevel: 0, costFactor: 1, statEffect: '1 Mina', onOffer: false },
    { id: 'cross_attack', name: 'Disp. Cruzado', icon: '🔺', baseCost: 50, currentLevel: 0, costFactor: 1, statEffect: '+1 Carga', onOffer: false },
    { id: 'xp_potion', name: 'Poción 2x', icon: '💰', baseCost: 75, currentLevel: 0, costFactor: 1, statEffect: '120s Doble XP/Oro', onOffer: false },
    { id: 'resurrection', name: 'Resurrección', icon: '🧟', baseCost: 100, currentLevel: 0, costFactor: 1, statEffect: 'Revive 50% HP', onOffer: false },
    { id: 'rate_boost', name: 'Cartucho Mej.', icon: '🔫', baseCost: 500, currentLevel: 0, costFactor: 1.5, statEffect: 'Cadencia x1.25', onOffer: false },
    { id: 'four_seasons', name: 'Ciclo Eterno', icon: '🌀', baseCost: 1000, currentLevel: 0, costFactor: 1, statEffect: '4 Orbes (50s)', onOffer: false },
    
    // MEJORAS BASE EXTRA
    { id: 'dmg_basic', name: 'Daño Base', icon: '⚔️', baseCost: 60, currentLevel: 0, costFactor: 1.6, statEffect: '+5 Daño', onOffer: false },
    { id: 'move_speed', name: 'Velocidad', icon: '👟', baseCost: 40, currentLevel: 0, costFactor: 1.4, statEffect: '+0.3 Vel', onOffer: false }
];

// 2. Elegir una oferta al azar
function applyRunShopOffers() {
    runUpgradesData.forEach(upgrade => upgrade.onOffer = false);
    if (runUpgradesData.length > 0) {
        const randomIndex = Math.floor(Math.random() * runUpgradesData.length);
        runUpgradesData[randomIndex].onOffer = true;
    }
}

// 3. Función para calcular el precio actual (Con descuento de oferta)
function getCurrentCost(upgrade) {
    let cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costFactor, upgrade.currentLevel));
    if (upgrade.onOffer) {
        cost = Math.floor(cost * 0.7); // 30% de descuento
    }
    return cost;
}

// 4. Actualizar la Interfaz de la tienda
function updateRunShopUI() {
    const container = document.getElementById('run-upgrades-container');
    const scoreDisplay = document.getElementById('shop-score-display');
    
    if (!container) return;
    
    // ⚠️ ATENCIÓN: Asumimos que tu dinero está en game.coins, ajusta si es game.score
    if (scoreDisplay) scoreDisplay.innerText = Math.floor(game.coins || 0);
    
    container.innerHTML = '';

    runUpgradesData.forEach(upgrade => {
        const currentCost = getCurrentCost(upgrade);
        // ⚠️ ATENCIÓN: Lo mismo aquí, comprueba que game.coins es tu variable de dinero
        const canAfford = (game.coins || 0) >= currentCost;
        
        let statText = '';
        if (upgrade.costFactor === 1) {
            statText = `Efecto: ${upgrade.statEffect}`;
        } else {
            statText = `Nivel: ${upgrade.currentLevel} | Stat: ${upgrade.statEffect}`;
        }

        const offerBadgeHtml = upgrade.onOffer ? `<span class="offer-badge">¡OFERTA!</span>` : '';
        const itemOfferClass = upgrade.onOffer ? 'on-offer' : '';
        const buttonOfferClass = upgrade.onOffer ? 'on-offer' : '';

        const upgradeHtml = `
            <div class="upgrade-item ${itemOfferClass}" title="Cuesta ${currentCost}">
                <div class="upgrade-info-block">
                    <div class="upgrade-icon">${upgrade.icon}</div>
                    <div class="upgrade-text">
                        <div class="upgrade-name-container">
                            <span class="upgrade-name">${upgrade.name}</span>
                            ${offerBadgeHtml}
                        </div>
                        <span class="upgrade-stats">${statText}</span>
                    </div>
                </div>
                <button 
                    class="buy-button ${buttonOfferClass}" 
                    ${!canAfford ? 'disabled' : ''} 
                    onclick="buyRunUpgrade('${upgrade.id}')"
                >
                    $${currentCost}
                </button>
            </div>
        `;
        
        container.innerHTML += upgradeHtml;
    });
}

// 5. El MOTOR DE COMPRA (Conectado a tus variables reales)
function buyRunUpgrade(upgradeId) {
    canvas.focus(); // Devolver foco inmediatamente al juego
    
    const upgrade = runUpgradesData.find(u => u.id === upgradeId);
    if (!upgrade) return;

    const currentCost = getCurrentCost(upgrade);
    const p = game.player;

    // ⚠️ ATENCIÓN: Revisa que "game.coins" sea la variable de tus monedas
    if (game.coins >= currentCost) {
        
        game.coins -= currentCost;

        switch(upgrade.id) {
            case 'bomb':
                p.bombs++;
                updateHUD();
                break;
                
            case 'cross_attack':
                p.crossAttacksAvailable = (p.crossAttacksAvailable || 0) + 1;
                updateHUD();
                break;
                
            case 'xp_potion':
                game.xpCoinMultiplier = 2; 
                game.buffTimer = 120 * 60;
                break;
                
            case 'resurrection':
                p.hasResurrection = true;
                break;
                
            case 'rate_boost':
                applyRateMultiplier(p, 1.25);
                upgrade.currentLevel++; 
                break;
                
            case 'four_seasons':
                p.hasFourSeasons = true;
                setTimeout(() => {
                    p.hasFourSeasons = false;
                    console.log("Ciclo Eterno agotado");
                }, 50000);
                break;
                
            case 'dmg_basic':
                p.damage = (p.damage || 10) + 5; 
                upgrade.currentLevel++;
                break;

            case 'move_speed':
                p.speed = (p.speed || 3) + 0.3;
                upgrade.currentLevel++;
                break;
        }

        updateRunShopUI();
        if (typeof updateHUD === "function") updateHUD();
    }
}

// 6. Iniciar la tienda
function startRunShop() {
    runUpgradesData.forEach(u => u.currentLevel = 0);
    applyRunShopOffers();
    const shop = document.getElementById('in-game-shop');
    if (shop) shop.style.display = 'block';
    updateRunShopUI();
}
// Evitar que las flechas muevan la pantalla (Scroll)
window.addEventListener("keydown", function(e) {
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
}, false);
