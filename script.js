// --- DOM要素の取得 ---
const modeSelectionScreen = document.getElementById('mode-selection-screen');
const classicModeButton = document.getElementById('classic-mode-button');
const scoreAttackButton = document.getElementById('score-attack-button');
const baseStatsModeButton = document.getElementById('base-stats-mode-button');
const gameContainer = document.getElementById('game-container');
const scoreScreen = document.getElementById('score-screen');
const guessInput = document.getElementById('guess-input');
const guessButton = document.getElementById('guess-button');
const messageArea = document.getElementById('message-area');
const resultHistory = document.getElementById('result-history');
const resultHeader = document.getElementById('result-header');
const gameControls = document.getElementById('game-controls');
const inputArea = document.getElementById('input-area');
const suggestionsBox = document.getElementById('suggestions-box');
const nextQuestionButton = document.getElementById('next-question-button');
const backToMenuButton = document.getElementById('back-to-menu-button');
const playAgainButton = document.getElementById('play-again-button');
const finalScoreSpan = document.getElementById('final-score');
const gameTitle = document.getElementById('game-title');
const gameDescription = document.getElementById('game-description');
const gameStatus = document.getElementById('game-status');
const homeButton = document.getElementById('home-button');
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const modalCloseButton = document.getElementById('modal-close-button');

// --- グローバル変数と定数 ---
const allPokemonNames = Object.keys(pokemonNameMap);
let correctPokemon = null;
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/';
const MAX_POKEMON_ID = 1025;
const gen9PokemonData = gen9Data; // gen9-data.jsから読み込み

// --- ゲーム状態変数 ---
let gameMode = null; // 'classic', 'scoreAttack', 'baseStats'
let gameOver = false;
let guessesLeft = 5;
let correctCount = 0;
let totalGuesses = 0;
let answeredPokemonIds = new Set();


// --- メインロジック ---

function hiraToKana(str) {
    return str.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));
}

function startGame(mode) {
    gameMode = mode;
    resetGame();
    modeSelectionScreen.classList.add('hidden');
    scoreScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    setupUIForMode();
    initGame();
}

function setupUIForMode() {
    resultHeader.innerHTML = '';
    // ▼ 修正点: 各ヘッダー項目にクラスを追加
    if (gameMode === 'classic' || gameMode === 'scoreAttack') {
        gameTitle.textContent = gameMode === 'classic' ? 'クラシックモード' : 'スコアアタック';
        gameDescription.textContent = gameMode === 'classic' ? '5回のうちにポケモンを当てよう！' : '3匹当てるまでの合計回答数を競え！';
        resultHeader.className = 'result-header-classic'; // CSSでクラス名を統一
        resultHeader.innerHTML = `
            <span class="header-sprite">  #</span>
            <span class="header-name">名前</span>
            <span class="header-gen">世代</span>
            <span class="header-type1">タイプ1</span>
            <span class="header-type2">タイプ2</span>
            <span class="header-height">高さ</span>
            <span class="header-weight">重さ</span>
            <span class="header-evo">進化</span>`;
    } else if (gameMode === 'baseStats') {
        gameTitle.textContent = '種族値アタック';
        gameDescription.textContent = '種族値をヒントに3匹当てろ！';
        resultHeader.className = 'result-header-stats'; // CSSでクラス名を統一
        resultHeader.innerHTML = `
            <span class="header-sprite">#</span>
            <span class="header-name">名前</span>
            <span class="header-hp">HP</span>
            <span class="header-attack">攻撃</span>
            <span class="header-defense">防御</span>
            <span class="header-sp-attack">特攻</span>
            <span class="header-sp-defense">特防</span>
            <span class="header-speed">素早さ</span>`;
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

async function initGame(retryCount = 3) {
    if (retryCount <= 0) {
        messageArea.textContent = 'ポケモンの読み込みに失敗しました。HOMEに戻ってやり直してください。';
        guessInput.disabled = true;
        guessButton.disabled = true;
        backToMenuButton.classList.remove('hidden');
        return;
    }

    guessInput.disabled = true;
    guessButton.disabled = true;
    messageArea.textContent = `次のポケモンを読み込み中...`;
    
    let randomId;
    let retries = 0;
    const maxRetries = 20;
    while (true) {
        randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
        if (!answeredPokemonIds.has(randomId)) {
            break;
        }
        retries++;
        if (retries > maxRetries) {
            console.warn("出題済みのポケモンが多いため、履歴をリセットします。");
            answeredPokemonIds.clear();
        }
    }
    
    let pokemonData = null;
    const gen9Entry = Object.values(gen9PokemonData).find(data => data.id === randomId);
    if (gen9Entry) {
        pokemonData = gen9Entry;
    } else {
        pokemonData = await fetchPokemonDataFromApi(randomId);
    }

    if (pokemonData) {
        correctPokemon = pokemonData;
        console.log(`正解:`, correctPokemon);
        messageArea.textContent = `ポケモンを推測しよう！`;
        resultHistory.innerHTML = '';
        guessInput.disabled = false;
        guessButton.disabled = false;
        guessInput.focus();
    } else {
        answeredPokemonIds.add(randomId);
        messageArea.textContent = `[ID: ${randomId}] の読み込みに失敗。再試行します... (${4 - retryCount}/3)`;
        setTimeout(() => initGame(retryCount - 1), 50);
    }
}

function resetGame() {
    gameOver = false;
    guessesLeft = 5;
    correctCount = 0;
    totalGuesses = 0;
    answeredPokemonIds.clear();
    messageArea.textContent = '';
    resultHistory.innerHTML = '';
    resultHeader.classList.add('hidden');
    inputArea.classList.remove('hidden');
    nextQuestionButton.classList.add('hidden');
    backToMenuButton.classList.add('hidden');
    updateStatusUI();
}


async function handleGuess() {
    if (gameOver) return;
    
    let guessNameJa = hiraToKana(guessInput.value.trim());
    if (!guessNameJa) return;

    suggestionsBox.classList.add('hidden');

    let guessedPokemon = null;
    
    const gen9Match = Object.values(gen9PokemonData).find(p => p.name === guessNameJa);
    if (gen9Match) {
        guessedPokemon = gen9Match;
    } else {
        const guessNameEn = pokemonNameMap[guessNameJa];
        if (!guessNameEn) {
            messageArea.textContent = `「${guessNameJa}」というポケモンは見つかりませんでした。`;
            return;
        }
        guessButton.disabled = true;
        messageArea.textContent = `${guessNameJa}の情報を調べています...`;
        guessedPokemon = await fetchPokemonDataFromApi(guessNameEn);
    }


    if (!guessedPokemon) {
        messageArea.textContent = `「${guessNameJa}」のデータ取得に失敗しました。`;
        guessButton.disabled = false;
        return;
    }
    
    if (gameMode === 'classic') {
        guessesLeft--;
    } else {
        totalGuesses++;
    }

    updateStatusUI();
    
    const comparison = comparePokemon(guessedPokemon, correctPokemon);
    renderResult(guessedPokemon, comparison);

    const isCorrect = guessedPokemon.id === correctPokemon.id;

    if (gameMode === 'classic') {
        if (isCorrect) {
            messageArea.textContent = `正解！おめでとう！答えは ${correctPokemon.name} でした！`;
            endGame();
        } else if (guessesLeft === 0) {
            messageArea.textContent = `残念！ゲームオーバー。正解は ${correctPokemon.name} でした。`;
            endGame();
        } else {
            messageArea.textContent = `ポケモンを推測しよう！`;
        }
    } else { // scoreAttack or baseStats
        if (isCorrect) {
            correctCount++;
            answeredPokemonIds.add(correctPokemon.id);
            updateStatusUI();
            if (correctCount < 3) {
                messageArea.textContent = `正解！ ${correctPokemon.name} でした！`;
                inputArea.classList.add('hidden');
                nextQuestionButton.classList.remove('hidden');
            } else {
                showScoreScreen();
            }
        } else {
            messageArea.textContent = `ポケモンを推測しよう！`;
        }
    }
    
    guessInput.value = '';
    if (!gameOver && !isCorrect) {
        guessButton.disabled = false;
        guessInput.focus();
    }
}

function endGame() {
    gameOver = true;
    inputArea.classList.add('hidden');
    backToMenuButton.classList.remove('hidden');
}

function showScoreScreen() {
    finalScoreSpan.textContent = totalGuesses;
    gameContainer.classList.add('hidden');
    scoreScreen.classList.remove('hidden');
}

function handleInput() {
    const inputText = guessInput.value.trim();
    if (inputText.length === 0) {
        suggestionsBox.classList.add('hidden');
        return;
    }
    const inputTextKana = hiraToKana(inputText);
    const suggestions = allPokemonNames.filter(name => name.startsWith(inputTextKana)).slice(0, 7);
    suggestionsBox.innerHTML = '';
    if (suggestions.length > 0) {
        suggestions.forEach(name => {
            const suggestionItem = document.createElement('div');
            suggestionItem.textContent = name;
            suggestionItem.className = 'suggestion-item';
            suggestionItem.addEventListener('click', () => {
                guessInput.value = name;
                suggestionsBox.classList.add('hidden');
                guessInput.focus();
            });
            suggestionsBox.appendChild(suggestionItem);
        });
        suggestionsBox.classList.remove('hidden');
    } else {
        suggestionsBox.classList.add('hidden');
    }
}


async function fetchPokemonDataFromApi(pokemonIdentifier) {
    try {
        const identifier = pokemonIdentifier.toString().toLowerCase();
        const pokemonRes = await fetch(`${POKEAPI_BASE_URL}pokemon/${identifier}`);
        if (!pokemonRes.ok) throw new Error('Pokemon not found');
        const pokemonData = await pokemonRes.json();
        
        const speciesRes = await fetch(pokemonData.species.url);
        if (!speciesRes.ok) throw new Error('Species not found');
        const speciesData = await speciesRes.json();
        
        const evolutionChainRes = await fetch(speciesData.evolution_chain.url);
        if (!evolutionChainRes.ok) throw new Error('Evolution chain not found');
        const evolutionChainData = await evolutionChainRes.json();
        
        const evolutionCount = getEvolutionCount(evolutionChainData, speciesData.name);
        const name = speciesData.names.find(n => n.language.name === 'ja-Hrkt')?.name || pokemonData.name;
        
        let generationId = 8;
        if (speciesData.generation) {
            const generationUrl = speciesData.generation.url;
            generationId = parseInt(generationUrl.split('/').slice(-2, -1)[0]);
        }
        
        const typeNameMap = {"normal":"ノーマル","fire":"ほのお","water":"みず","grass":"くさ","electric":"でんき","ice":"こおり","fighting":"かくとう","poison":"どく","ground":"じめん","flying":"ひこう","psychic":"エスパー","bug":"むし","rock":"いわ","ghost":"ゴースト","dragon":"ドラゴン","dark":"あく","steel":"はがね","fairy":"フェアリー"};
        const japaneseTypes = pokemonData.types.map(t => typeNameMap[t.type.name] || t.type.name);
        
        const stats = {
            hp: pokemonData.stats[0].base_stat,
            attack: pokemonData.stats[1].base_stat,
            defense: pokemonData.stats[2].base_stat,
            spAttack: pokemonData.stats[3].base_stat,
            spDefense: pokemonData.stats[4].base_stat,
            speed: pokemonData.stats[5].base_stat,
        };

        return {
            id: pokemonData.id, name: name, generation: generationId,
            type1: japaneseTypes[0] || 'なし', type2: japaneseTypes[1] || 'なし',
            height: pokemonData.height / 10, weight: pokemonData.weight / 10,
            sprite: pokemonData.sprites.front_default, evolutionCount: evolutionCount,
            stats: stats
        };
    } catch (error) {
        console.error(`Data fetch error for ${pokemonIdentifier}:`, error);
        return null;
    }
}

function getEvolutionCount(chainData, speciesName) {
    function findPokemon(stage, count) {
        if (stage.species.name.startsWith(speciesName.split('-')[0])) {
            return count;
        }
        for (const nextStage of stage.evolves_to) {
            const result = findPokemon(nextStage, count + 1);
            if (result !== null) return result;
        }
        return null;
    }
    return findPokemon(chainData.chain, 0) ?? 0;
}

function comparePokemon(guessed, correct) {
    if (gameMode === 'baseStats') {
        const result = { stats: {} };
        const statKeys = ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed'];
        statKeys.forEach(stat => {
            if (guessed.stats[stat] === correct.stats[stat]) {
                result.stats[stat] = { class: 'bg-green-500', symbol: '✔' };
            } else {
                const symbol = guessed.stats[stat] > correct.stats[stat] ? '▼' : '▲';
                result.stats[stat] = { class: 'bg-gray-700', symbol: symbol };
            }
        });
        return result;
    } else {
        const result = {};
        if (guessed.generation === correct.generation) result.generation = 'bg-green-500';
        else if (Math.abs(guessed.generation - correct.generation) === 1) result.generation = 'bg-yellow-500';
        else result.generation = 'bg-gray-700';
        if (guessed.type1 === correct.type1) result.type1 = 'bg-green-500';
        else if (guessed.type1 === correct.type2) result.type1 = 'bg-yellow-500';
        else result.type1 = 'bg-gray-700';
        if (guessed.type2 === correct.type2) result.type2 = 'bg-green-500';
        else if (guessed.type2 === correct.type1 && guessed.type2 !== 'なし') result.type2 = 'bg-yellow-500';
        else result.type2 = 'bg-gray-700';
        result.height = guessed.height > correct.height ? '▼' : (guessed.height < correct.height ? '▲' : '✔');
        result.weight = guessed.weight > correct.weight ? '▼' : (guessed.weight < correct.weight ? '▲' : '✔');
        if (guessed.evolutionCount === correct.evolutionCount) result.evolutionCount = 'bg-green-500';
        else result.evolutionCount = 'bg-gray-700';
        return result;
    }
}

function renderResult(pokemon, comparison) {
    const row = document.createElement('div');
    
    if (gameMode === 'baseStats') {
        row.className = 'result-row result-row-stats';
        row.innerHTML = `
            <div class="flex items-center justify-center h-full"><img src="${pokemon.sprite}" alt="${pokemon.name}" class="w-10 h-10"></div>
            <div class="font-bold">${pokemon.name}</div>
            <div class="${comparison.stats.hp.class} rounded p-1 flex justify-center items-center">${pokemon.stats.hp} <span class="ml-1 text-xs">${comparison.stats.hp.symbol}</span></div>
            <div class="${comparison.stats.attack.class} rounded p-1 flex justify-center items-center">${pokemon.stats.attack} <span class="ml-1 text-xs">${comparison.stats.attack.symbol}</span></div>
            <div class="${comparison.stats.defense.class} rounded p-1 flex justify-center items-center">${pokemon.stats.defense} <span class="ml-1 text-xs">${comparison.stats.defense.symbol}</span></div>
            <div class="${comparison.stats.spAttack.class} rounded p-1 flex justify-center items-center">${pokemon.stats.spAttack} <span class="ml-1 text-xs">${comparison.stats.spAttack.symbol}</span></div>
            <div class="${comparison.stats.spDefense.class} rounded p-1 flex justify-center items-center">${pokemon.stats.spDefense} <span class="ml-1 text-xs">${comparison.stats.spDefense.symbol}</span></div>
            <div class="${comparison.stats.speed.class} rounded p-1 flex justify-center items-center">${pokemon.stats.speed} <span class="ml-1 text-xs">${comparison.stats.speed.symbol}</span></div>
        `;
    } else {
        row.className = 'result-row result-row-classic';
        row.innerHTML = `
            <div class="flex items-center justify-center h-full"><img src="${pokemon.sprite}" alt="${pokemon.name}" class="w-10 h-10"></div>
            <div class="font-bold">${pokemon.name}</div>
            <div class="${comparison.generation} rounded p-2">${pokemon.generation}</div>
            <div class="${comparison.type1} rounded p-2">${pokemon.type1}</div>
            <div class="${comparison.type2} rounded p-2">${pokemon.type2}</div>
            <div class="bg-gray-700 rounded p-2 flex justify-center items-center">${pokemon.height}m <span class="ml-1 text-xs">${comparison.height}</span></div>
            <div class="bg-gray-700 rounded p-2 flex justify-center items-center">${pokemon.weight}kg <span class="ml-1 text-xs">${comparison.weight}</span></div>
            <div class="${comparison.evolutionCount} rounded p-2">${pokemon.evolutionCount}</div>
        `;
    }
    resultHistory.insertAdjacentElement('afterbegin', row);
}

// --- イベントリスナーの設定 ---
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

    const backToMenu = () => {
        gameContainer.classList.add('hidden');
        scoreScreen.classList.add('hidden');
        modeSelectionScreen.classList.remove('hidden');
    };
    backToMenuButton.addEventListener('click', backToMenu);
    playAgainButton.addEventListener('click', backToMenu);
    homeButton.addEventListener('click', backToMenu);

    guessInput.addEventListener('input', handleInput);
    document.addEventListener('click', (event) => {
        if (!gameControls.contains(event.target)) {
            suggestionsBox.classList.add('hidden');
        }
    });
});
