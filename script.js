// --- DOM要素の取得 ---
const modeSelectionScreen = document.getElementById('mode-selection-screen');
const gameContainer = document.getElementById('game-container');
const scoreScreen = document.getElementById('score-screen');
const loaderOverlay = document.getElementById('loader-overlay');
const classicModeButton = document.getElementById('classic-mode-button');
const scoreAttackButton = document.getElementById('score-attack-button');
const baseStatsModeButton = document.getElementById('base-stats-mode-button');
const guessButton = document.getElementById('guess-button');
const nextQuestionButton = document.getElementById('next-question-button');
const returnToMenuButton = document.getElementById('return-to-menu-button');
const backToMenuButton = document.getElementById('back-to-menu-button');
const playAgainButton = document.getElementById('play-again-button');
const homeButton = document.getElementById('home-button');
const howToPlayButton = document.getElementById('how-to-play-button');
const aboutSiteButton = document.getElementById('about-site-button');
const infoButtons = document.querySelectorAll('.info-button');
const modalCloseButton = document.getElementById('modal-close-button');
const guessInput = document.getElementById('guess-input');
const messageArea = document.getElementById('message-area');
const resultHistory = document.getElementById('result-history');
const resultHeader = document.getElementById('result-header');
const gameControls = document.getElementById('game-controls');
const inputArea = document.getElementById('input-area');
const suggestionsBox = document.getElementById('suggestions-box');
const finalScoreSpan = document.getElementById('final-score');
const gameTitle = document.getElementById('game-title');
const gameStatus = document.getElementById('game-status');
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const resultModalOverlay = document.getElementById('result-modal-overlay');
const resultModal = document.getElementById('result-modal');

// --- グローバル変数と定数 ---
const allPokemonNames = Object.keys(allPokemonData);
let correctPokemon = null;
let answeredPokemonNames = new Set();
let gameMode = null;
let gameOver = false;
let guessesLeft = 5;
let correctCount = 0;
let totalGuesses = 0;
let suggestionRequestToken = 0;

// ---------- 初期化処理 ----------
document.addEventListener('DOMContentLoaded', () => {
    classicModeButton.addEventListener('click', () => startGame('classic'));
    scoreAttackButton.addEventListener('click', () => startGame('scoreAttack'));
    baseStatsModeButton.addEventListener('click', () => startGame('baseStats'));
    guessButton.addEventListener('click', handleGuess);
    guessInput.addEventListener('keydown', (event) => {
        if (event.isComposing) return;
        if (event.key === 'Enter') handleGuess();
    });
    nextQuestionButton.addEventListener('click', () => {
        nextQuestionButton.classList.add('hidden');
        inputArea.classList.remove('hidden');
        initGame();
    });
    const backToMenu = () => switchScreen('mode-selection-screen');
    returnToMenuButton.addEventListener('click', backToMenu);
    backToMenuButton.addEventListener('click', backToMenu);
    playAgainButton.addEventListener('click', () => startGame(gameMode));
    homeButton.addEventListener('click', backToMenu);
    guessInput.addEventListener('input', handleInput);
    document.addEventListener('click', (event) => {
        if (!gameControls.contains(event.target)) {
            suggestionsBox.classList.add('hidden');
        }
    });

    const openModal = (title, content) => {
        modalContent.innerHTML = `<h3>${title}</h3>${content}`;
        modalOverlay.classList.remove('hidden');
    };
    const closeModal = () => modalOverlay.classList.add('hidden');

    howToPlayButton.addEventListener('click', () => openModal('遊び方', `...`));
    aboutSiteButton.addEventListener('click', () => openModal('このサイトについて', `...`));
    infoButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const mode = event.target.dataset.mode;
            if (mode === 'classic') openModal('クラシックモード', '...');
            else if (mode === 'scoreAttack') openModal('スコアモード', '...');
            else if (mode === 'baseStats') openModal('種族値モード', '...');
        });
    });
    modalCloseButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
});


// ---------- ゲーム進行管理 ----------

function startGame(mode) {
    gameMode = mode;
    resetGame();
    switchScreen('game-container');
    setupUIForMode();
    initGame();
}

function initGame() {
    if (answeredPokemonNames.size >= allPokemonNames.length) {
        answeredPokemonNames.clear();
    }

    const allPokemonArray = Object.values(allPokemonData);
    let candidate;
    do {
        candidate = allPokemonArray[Math.floor(Math.random() * allPokemonArray.length)];
    } while (answeredPokemonNames.has(candidate.name));

    correctPokemon = candidate;
    answeredPokemonNames.add(candidate.name);
    
    // デバッグ用
    correctPokemon = Object.values(allPokemonData).find(p => p.name === "デオキシス（アタックフォルム）");

    guessInput.value = "";
    resultHistory.innerHTML = "";
    messageArea.textContent = "";
}

function handleGuess() {
    if (gameOver) return; // ゲームオーバーなら処理しない

    const guessRaw = guessInput.value.trim();
    if (!guessRaw) return;
    let guessedPokemon = Object.values(allPokemonData).find(p => p.name === guessRaw);

    if (!guessedPokemon) {
        const guessName = normalizePokemonName(guessRaw);
        guessedPokemon = Object.values(allPokemonData).find(
            p => normalizePokemonName(p.name) === guessName
        );
    }

    if (!guessedPokemon) {
        messageArea.textContent = "ポケモンが見つかりませんでした。";
        return;
    }

    const comparisonResult = comparePokemon(guessedPokemon, correctPokemon);
    if (!comparisonResult) return; 
    
    renderResult(guessedPokemon, comparisonResult);

    if (gameMode !== 'classic') {
        totalGuesses++;
    } else {
        guessesLeft--;
    }

    updateStatusUI();

    if (isCorrectAnswer(guessedPokemon, correctPokemon)) {
        endGame(true);
    } else {
        if (gameMode === 'classic' && guessesLeft <= 0) {
            endGame(false);
        }
    }

    suggestionsBox.classList.add('hidden');
    guessInput.value = "";
    guessInput.focus();
}

function endGame(isWin) {
    gameOver = true;
    inputArea.classList.add('hidden');

    if (isWin) {
        if (gameMode !== 'classic') {
            correctCount++;
            updateStatusUI();
        }
        showResultModal(correctPokemon, "正解");
    } else {
        showResultModal(correctPokemon, "残念");
    }
}

function resetGame() {
    gameOver = false;
    guessesLeft = 5;
    correctCount = 0;
    totalGuesses = 0;
    messageArea.textContent = '';
    resultHistory.innerHTML = '';
    resultHeader.classList.add('hidden');
    inputArea.classList.remove('hidden');
    nextQuestionButton.classList.add('hidden');
    returnToMenuButton.classList.remove('hidden');
    backToMenuButton.classList.add('hidden');
    updateStatusUI();
}

function showScoreScreen() {
    finalScoreSpan.textContent = totalGuesses;
    switchScreen('score-screen');
}

function showResultModal(pokemon, verdict) {
    const verdictEl = resultModal.querySelector('#result-modal-verdict');
    verdictEl.textContent = verdict;
    verdictEl.className = (verdict === "正解") ? 'verdict-correct' : 'verdict-incorrect';

    const setData = (field, value) => {
        const el = resultModal.querySelector(`[data-field="${field}"]`);
        if (el) el.textContent = value;
    };
    
    resultModal.querySelector('[data-field="sprite"]').src = pokemon.sprite;
    
    const { main: mainName, form: formName } = formatDisplayName(pokemon.name);
    setData('name', mainName);
    setData('form', formName);

    let nationalNo = pokemon.id;
    if (pokemon.name.includes('（')) {
        const baseName = pokemon.name.split('（')[0];
        const allPokemonArray = Object.values(allPokemonData);
        const candidateForms = allPokemonArray.filter(p => p.name.startsWith(baseName));
        if (candidateForms.length > 0) {
            const baseForm = candidateForms.reduce((minPokemon, currentPokemon) => {
                return currentPokemon.id < minPokemon.id ? currentPokemon : minPokemon;
            });
            nationalNo = baseForm.id;
        }
    }
    setData('nationalNo', nationalNo || '---');

    setData('generation', pokemon.generation ? `${pokemon.generation}世代` : '不明');
    setData('genderRatio', formatGenderRate(pokemon.genderRate));
    setData('height', pokemon.height ? `${pokemon.height} m` : '不明');
    setData('weight', pokemon.weight ? `${pokemon.weight} kg` : '不明');
    setData('evolutionCount', pokemon.evolutionCount !== null ? pokemon.evolutionCount : '不明');
    setData('formsSwitchable', pokemon.formsSwitchable ? '○' : '×');
    setData('type1', pokemon.type1 || 'なし');
    setData('type2', pokemon.type2 || 'なし');
    setData('ability1', pokemon.ability1 || 'なし');
    setData('ability2', pokemon.ability2 || 'なし');
    setData('hiddenAbility', pokemon.hiddenAbility || 'なし');
    setData('eggGroup1', pokemon.eggGroup1 || 'なし');
    setData('eggGroup2', pokemon.eggGroup2 || 'なし');
    
    const stats = ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed'];
    let totalStats = 0;
    stats.forEach(stat => {
        const value = pokemon.stats[stat];
        totalStats += value;
        setData(stat, value);
        const bar = resultModal.querySelector(`[data-field="${stat}-bar"]`);
        if(bar) {
            const percentage = (value / 255) * 100;
            bar.style.width = `${Math.min(percentage, 100)}%`;
        }
    });
    
    setData('totalStats', totalStats);
    const totalBar = resultModal.querySelector('[data-field="totalStats-bar"]');
    if(totalBar) {
        const totalPercentage = (totalStats / 800) * 100;
        totalBar.style.width = `${Math.min(totalPercentage, 100)}%`;
    }

    setupModalButtons(verdict);
    resultModalOverlay.classList.remove('hidden');
}

function setupModalButtons(verdict) {
    const leftButton = document.getElementById('result-modal-left-button');
    const rightButton = document.getElementById('result-modal-right-button');

    const newLeft = leftButton.cloneNode(true);
    leftButton.parentNode.replaceChild(newLeft, leftButton);

    const newRight = rightButton.cloneNode(true);
    rightButton.parentNode.replaceChild(newRight, rightButton);

    newLeft.classList.add('hidden');
    newRight.classList.add('hidden');

    if (verdict === '正解') {
        if (gameMode === 'classic') {
            newLeft.textContent = 'もう一度遊ぶ';
            newLeft.onclick = () => {
                resultModalOverlay.classList.add('hidden');
                startGame(gameMode);
            };
            newLeft.classList.remove('hidden');

            newRight.textContent = 'モード選択へ';
            newRight.onclick = () => {
                resultModalOverlay.classList.add('hidden');
                switchScreen('mode-selection-screen');
            };
            newRight.classList.remove('hidden');
        } else {
            if (correctCount >= 3) {
                newRight.textContent = 'スコア確認';
                newRight.onclick = () => {
                    resultModalOverlay.classList.add('hidden');
                    showScoreScreen();
                };
                newRight.classList.remove('hidden');
            } else {
                newLeft.textContent = '次の問題へ';
                newLeft.onclick = () => proceedToNextQuestion();
                newLeft.classList.remove('hidden');
            }
        }
    } else {
        newLeft.textContent = 'もう一度遊ぶ';
        newLeft.onclick = () => {
            resultModalOverlay.classList.add('hidden');
            startGame(gameMode);
        };
        newLeft.classList.remove('hidden');

        newRight.textContent = 'モード選択へ';
        newRight.onclick = () => {
            resultModalOverlay.classList.add('hidden');
            switchScreen('mode-selection-screen');
        };
        newRight.classList.remove('hidden');
    }
}

function proceedToNextQuestion() {
    resultModalOverlay.classList.add('hidden');
    gameOver = false;
    inputArea.classList.remove('hidden');
    initGame();
}

// ---------- UI管理 ----------
function switchScreen(targetScreen) {
    [modeSelectionScreen, gameContainer, scoreScreen].forEach(screen => {
        screen.classList.toggle('hidden', screen.id !== targetScreen);
        screen.classList.toggle('fade-in', screen.id === targetScreen);
    });
}

function setupUIForMode() {
    resultHeader.innerHTML = '';
    if (gameMode === 'classic' || gameMode === 'scoreAttack') {
        gameTitle.textContent = gameMode === 'classic' ? 'クラシックモード' : 'スコアアタック';
        resultHeader.className = 'result-header-classic';
        resultHeader.innerHTML = `
            <span>#</span>
            <span>名前</span>
            <span>世代</span>
            <span>タイプ1</span>
            <span>タイプ2</span>
            <span>特性1</span>
            <span>特性2</span>
            <span>夢特性</span>
            <span>タマゴ1</span>
            <span>タマゴ2</span>
            <span>♂：♀</span>
            <span>高さ</span>
            <span>重さ</span>
            <span>進化</span>
            <span>合計</span>
            <span>FC</span>
            `;
    } else if (gameMode === 'baseStats') {
        gameTitle.textContent = '種族値アタック';
        resultHeader.className = 'result-header-stats';
        resultHeader.innerHTML = `
            <span>#</span>
            <span>名前</span>
            <span>HP</span>
            <span>攻撃</span>
            <span>防御</span>
            <span>特攻</span>
            <span>特防</span>
            <span>素早さ</span>
            `;
    }
    resultHeader.classList.remove('hidden');
    updateStatusUI();
}

function updateStatusUI() {
    if (gameMode === 'classic') {
        gameStatus.innerHTML = `<div>残り: <span id="guesses-left">${guessesLeft}</span> 回</div>`;
    } else {
        gameStatus.innerHTML = `
            <div>正解数: <span id="correct-count">${correctCount}</span> / 3</div>
            <div>合計回答数: <span id="total-guesses">${totalGuesses}</span></div>`;
    }
}

function renderResult(pokemon, comparisonResult) {
    const row = document.createElement('div');
    row.classList.add('result-row', 'fade-in');
    
    const { main: mainName, form: formName } = formatDisplayName(pokemon.name);
    const displayName = formName ? `${mainName}<br><span class="form-name">${formName}</span>` : mainName;

    if (gameMode === 'baseStats') {
        row.className = 'result-row result-row-stats';
        row.innerHTML = `
            <div><img src="${pokemon.sprite}" alt="${pokemon.name}"></div>
            <div class="font-bold">${displayName}</div>
            <div class="${comparisonResult.stats.hp.class}"><span>${pokemon.stats.hp}</span> <span class="${comparisonResult.stats.hp.symbolClass}">${comparisonResult.stats.hp.symbol}</span></div>
            <div class="${comparisonResult.stats.attack.class}"><span>${pokemon.stats.attack}</span> <span class="${comparisonResult.stats.attack.symbolClass}">${comparisonResult.stats.attack.symbol}</span></div>
            <div class="${comparisonResult.stats.defense.class}"><span>${pokemon.stats.defense}</span> <span class="${comparisonResult.stats.defense.symbolClass}">${comparisonResult.stats.defense.symbol}</span></div>
            <div class="${comparisonResult.stats.spAttack.class}"><span>${pokemon.stats.spAttack}</span> <span class="${comparisonResult.stats.spAttack.symbolClass}">${comparisonResult.stats.spAttack.symbol}</span></div>
            <div class="${comparisonResult.stats.spDefense.class}"><span>${pokemon.stats.spDefense}</span> <span class="${comparisonResult.stats.spDefense.symbolClass}">${comparisonResult.stats.spDefense.symbol}</span></div>
            <div class="${comparisonResult.stats.speed.class}"><span>${pokemon.stats.speed}</span> <span class="${comparisonResult.stats.speed.symbolClass}">${comparisonResult.stats.speed.symbol}</span></div>
        `;
    } else {
        row.className = 'result-row result-row-classic';
        row.innerHTML = `
            <div><img src="${pokemon.sprite}" alt="${pokemon.name}"></div>
            <div class="font-bold">${displayName}</div>
            <div class="${comparisonResult.generation}">${pokemon.generation}</div>
            <div class="${comparisonResult.type1}">${pokemon.type1}</div>
            <div class="${comparisonResult.type2}">${pokemon.type2}</div>
            <div class="${comparisonResult.ability1}" title="${pokemon.ability1}">${pokemon.ability1}</div>
            <div class="${comparisonResult.ability2}" title="${pokemon.ability2}">${pokemon.ability2}</div>
            <div class="${comparisonResult.hiddenAbility}" title="${pokemon.hiddenAbility}">${pokemon.hiddenAbility}</div>
            <div class="${comparisonResult.eggGroup1}" title="${pokemon.eggGroup1}">${pokemon.eggGroup1}</div>
            <div class="${comparisonResult.eggGroup2}" title="${pokemon.eggGroup2}">${pokemon.eggGroup2}</div>
            <div class="${comparisonResult.genderRate}">${formatGenderRate(pokemon.genderRate)}</div>
            <div class="${comparisonResult.height.class}"><span>${pokemon.height}m</span> <span class="${comparisonResult.height.symbolClass}">${comparisonResult.height.symbol}</span></div>
            <div class="${comparisonResult.weight.class}"><span>${pokemon.weight}kg</span> <span class="${comparisonResult.weight.symbolClass}">${comparisonResult.weight.symbol}</span></div>
            <div class="${comparisonResult.evolutionCount}">${pokemon.evolutionCount}</div>
            <div class="${comparisonResult.totalStats.class}"><span>${pokemon.totalStats}</span> <span class="${comparisonResult.totalStats.symbolClass}">${comparisonResult.totalStats.symbol}</span></div>
            <div class="${comparisonResult.formsSwitchable}">${pokemon.formsSwitchable ? '○' : '×'}</div>
        `;
    }
    resultHistory.insertAdjacentElement('afterbegin', row);
}

function handleInput() {
    const currentToken = ++suggestionRequestToken;
    const inputText = guessInput.value.trim();
    if (inputText.length === 0) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    const inputTextKana = normalizePokemonName(inputText);
    const suggestions = allPokemonNames.filter(name => normalizePokemonName(name).startsWith(inputTextKana)).slice(0, 50);
    
    if (currentToken !== suggestionRequestToken) return;

    if (suggestions.length > 0) {
        const itemsHtml = suggestions.map(name => {
            const pokemon = allPokemonData[name];
            const spriteUrl = pokemon ? pokemon.sprite : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
            return `
                <div class="suggestion-item" data-name="${name}">
                    <img src="${spriteUrl}" alt="${name}" class="suggestion-sprite">
                    <span>${name}</span>
                </div>
            `;
        }).join('');

        suggestionsBox.innerHTML = itemsHtml;
        suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                guessInput.value = item.dataset.name;
                suggestionsBox.classList.add('hidden');
                guessInput.focus();
            });
        });
        suggestionsBox.classList.remove('hidden');
    } else {
        suggestionsBox.classList.add('hidden');
    }
}


// ---------- データ処理 ----------

function normalizePokemonName(input) {
    if (!input) return "";
    let str = input;
    str = str.replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
    str = str.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
    str = str.normalize("NFC");
    str = str.replace(/[\s・．\.\-＿_]/g, "");
    return str.trim();
}

function formatDisplayName(name) {
    const match = name.match(/(.+?)（(.+)）/);
    if (match) {
        return { main: match[1], form: `（${match[2]}）` };
    }
    return { main: name, form: '' };
}

function isCorrectAnswer(guessed, correct) {
    if (!guessed || !correct) return false;
    if (guessed.id === correct.id) return true;
    if (normalizePokemonName(guessed.name) === normalizePokemonName(correct.name)) return true;
    return false;
}

function comparePokemon(guessed, correct) {
    if (!guessed || !correct) {
        console.error("comparePokemon was called with invalid data:", { guessed, correct });
        return; 
    }

    const createNumericComparison = (guessedValue, correctValue) => {
        let symbol = '';
        let symbolClass = '';
        if (guessedValue > correctValue) {
            symbol = '▼';
            symbolClass = 'text-blue';
        } else if (guessedValue < correctValue) {
            symbol = '▲';
            symbolClass = 'text-red';
        }
        return {
            class: guessedValue === correctValue ? 'bg-green' : 'bg-gray',
            symbol: symbol,
            symbolClass: symbolClass
        };
    };

    if (gameMode === 'baseStats') {
        const result = { stats: {} };
        ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed'].forEach(stat => {
            result.stats[stat] = createNumericComparison(guessed.stats[stat], correct.stats[stat]);
        });
        return result;
    } else {
        const result = {};
        result.generation = guessed.generation === correct.generation ? 'bg-green' : (Math.abs(guessed.generation - correct.generation) <= 1 ? 'bg-yellow' : 'bg-gray');
        result.evolutionCount = guessed.evolutionCount === correct.evolutionCount ? 'bg-green' : 'bg-gray';
        result.genderRate = guessed.genderRate === correct.genderRate ? 'bg-green' : 'bg-gray';
        result.formsSwitchable = guessed.formsSwitchable === correct.formsSwitchable ? 'bg-green' : 'bg-gray';
        result.type1 = guessed.type1 === correct.type1 ? 'bg-green' : (guessed.type1 === correct.type2 ? 'bg-yellow' : 'bg-gray');
        result.type2 = guessed.type2 === correct.type2 ? 'bg-green' : (guessed.type2 !== 'なし' && guessed.type2 === correct.type1 ? 'bg-yellow' : 'bg-gray');
        const correctAbilities = [correct.ability1, correct.ability2, correct.hiddenAbility].filter(a => a !== 'なし');
        ['ability1', 'ability2', 'hiddenAbility'].forEach(key => {
            if (guessed[key] === 'なし' && correct[key] === 'なし') result[key] = 'bg-green';
            else if (guessed[key] !== 'なし' && guessed[key] === correct[key]) result[key] = 'bg-green';
            else if (guessed[key] !== 'なし' && correctAbilities.includes(guessed[key])) result[key] = 'bg-yellow';
            else result[key] = 'bg-gray';
        });
        const correctEggGroups = [correct.eggGroup1, correct.eggGroup2].filter(g => g !== 'なし');
        ['eggGroup1', 'eggGroup2'].forEach(key => {
            if (guessed[key] === 'なし' && correct[key] === 'なし') result[key] = 'bg-green';
            else if (guessed[key] !== 'なし' && guessed[key] === correct[key]) result[key] = 'bg-green';
            else if (guessed[key] !== 'なし' && correctEggGroups.includes(guessed[key])) result[key] = 'bg-yellow';
            else result[key] = 'bg-gray';
        });
        result.height = createNumericComparison(guessed.height, correct.height);
        result.weight = createNumericComparison(guessed.weight, correct.weight);
        result.totalStats = createNumericComparison(guessed.totalStats, correct.totalStats);
        return result;
    }
}

function formatGenderRate(rate) {
    if (rate === -1) return '不明';
    if (rate === 0) return '♂のみ';
    if (rate === 8) return '♀のみ';
    const femaleRatio = rate / 8 * 100;
    const maleRatio = 100 - femaleRatio;
    return `${maleRatio}:${femaleRatio}`;
}
