// --- DOM要素の取得 ---
const modeSelectionScreen = document.getElementById('mode-selection-screen');
const classicModeButton = document.getElementById('classic-mode-button');
const scoreAttackButton = document.getElementById('score-attack-button');
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

// --- グローバル変数と定数 ---
const allPokemonNames = Object.keys(pokemonNameMap);
let correctPokemon = null;
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/';

// --- ゲーム状態変数 ---
let gameMode = null; // 'classic' or 'scoreAttack'
let gameOver = false;
let guessesLeft = 5;
let correctCount = 0;
let totalGuesses = 0;
let answeredPokemonIds = new Set();
const MAX_POKEMON_ID = 1025;

// --- メインロジック ---

/**
 * ひらがなをカタカナに変換する
 * @param {string} str 変換する文字列
 * @returns {string} 変換後の文字列
 */
function hiraToKana(str) {
    return str.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));
}

/**
 * 特定のゲームモードでゲームを開始する
 * @param {string} mode 'classic' または 'scoreAttack'
 */
function startGame(mode) {
    gameMode = mode;
    resetGame();
    
    modeSelectionScreen.classList.add('hidden');
    scoreScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    setupUIForMode();
    initGame();
}

/**
 * UIを現在のゲームモードに合わせて設定する
 */
function setupUIForMode() {
    if (gameMode === 'classic') {
        gameTitle.textContent = 'クラシックモード';
        gameDescription.textContent = '5回のうちにポケモンを当てよう！';
    } else {
        gameTitle.textContent = 'スコアアタック';
        gameDescription.textContent = '3匹当てるまでの合計回答数を競え！';
    }
    updateStatusUI();
}

/**
 * ゲーム状態（残り回数やスコア）の表示を更新する
 */
function updateStatusUI() {
    if (gameMode === 'classic') {
        gameStatus.innerHTML = `<div>残り: <span id="guesses-left">${guessesLeft}</span> 回</div>`;
    } else {
        gameStatus.innerHTML = `
            <div>正解数: <span id="correct-count">${correctCount}</span> / 3</div>
            <div>合計回答数: <span id="total-guesses">${totalGuesses}</span></div>`;
    }
}

/**
 * 新しい問題（ポケモン）を読み込む
 */
async function initGame() {
    guessInput.disabled = true;
    guessButton.disabled = true;
    messageArea.textContent = `次のポケモンを読み込み中...`;
    
    let randomId;
    let retries = 0;
    const maxRetries = 20;

    // 既に出題されたIDは避け、有効なIDが見つかるまで試行する
    while (true) {
        randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
        
        // gen9Data または pokedex-data.js (API対象) に存在するIDかチェック
        const existsInGen9 = Object.values(gen9Data).some(data => data.id === randomId);
        const existsInApi = Object.values(pokemonNameMap).some(name => {
            const idFromMap = parseInt(name.split('-')[0]); // これは不正確なので使わない
            return false; // API対象のIDチェックは困難なため、ここでは行わない
        });

        // 簡略化：とりあえずIDが存在しそうか（欠番でないか）で判断
        // 厳密な欠番チェックはデータが完全でないと難しいため、エラーハンドリングに任せる
        if (!answeredPokemonIds.has(randomId)) {
            break;
        }

        retries++;
        if (retries > maxRetries) {
            console.warn("出題済みのポケモンが多いため、履歴をリセットします。");
            answeredPokemonIds.clear(); 
        }
    }
    
    // IDが906以上なら、それは第9世代 (DLC含む)
    if (randomId >= 906) {
        const gen9Entry = Object.values(gen9Data).find(data => data.id === randomId);
        if (gen9Entry) {
            correctPokemon = gen9Entry;
        }
    } else {
        correctPokemon = await fetchPokemonDataFromApi(randomId);
    }
    
    if (correctPokemon) {
        console.log(`正解:`, correctPokemon);
        messageArea.textContent = `ポケモンを推測しよう！`;
        resultHistory.innerHTML = '';
        resultHeader.classList.add('hidden');
        guessInput.disabled = false;
        guessButton.disabled = false;
        guessInput.focus();
    } else {
        // 読み込みに失敗した場合、ループに陥らないようにそのIDは一時的に避ける
        answeredPokemonIds.add(randomId);
        messageArea.textContent = `[ID: ${randomId}] の読み込みに失敗。再試行します...`;
        setTimeout(initGame, 50); // すぐに再試行
    }
}

/**
 * ゲーム状態をリセットする
 */
function resetGame() {
    gameOver = false;
    guessesLeft = 5;
    correctCount = 0;
    totalGuesses = 0;
    answeredPokemonIds.clear();
    
    messageArea.textContent = '';
    inputArea.classList.remove('hidden');
    nextQuestionButton.classList.add('hidden');
    backToMenuButton.classList.add('hidden');
    
    updateStatusUI();
}

/**
 * ユーザーの推測を処理する
 */
async function handleGuess() {
    if (gameOver) return;
    
    let guessNameJa = hiraToKana(guessInput.value.trim());
    if (!guessNameJa) return;

    suggestionsBox.classList.add('hidden');

    // ★ データソースを切り替える
    let guessedPokemon = null;
    if (gen9Data[guessNameJa]) {
        // 第9世代のポケモンならローカルデータから取得
        guessedPokemon = gen9Data[guessNameJa];
    } else {
        // それ以外はAPIから取得
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
    
    // (以降のゲーム進行ロジックは変更なし)
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
        } else { messageArea.textContent = `ポケモンを推測しよう！`;
        }
    } else {
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
    if (!gameOver && !isCorrect) { guessButton.disabled = false; }
}

/**
 * ゲーム終了時の処理 (主にクラシックモード用)
 */
function endGame() {
    gameOver = true;
    inputArea.classList.add('hidden');
    backToMenuButton.classList.remove('hidden');
}

/**
 * スコアアタッククリア時のスコア画面表示
 */
function showScoreScreen() {
    finalScoreSpan.textContent = totalGuesses;
    gameContainer.classList.add('hidden');
    scoreScreen.classList.remove('hidden');
}

/**
 * 入力サジェストを処理する
 */
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
            suggestionItem.className = 'p-3 hover:bg-gray-600 cursor-pointer';
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

/**
 * ポケモンデータをAPIから取得する
 * @param {string|number} pokemonIdentifier ポケモン名(英語)または図鑑番号
 * @returns {Promise<object|null>} ポケモンデータオブジェクト or null
 */
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
        const typeNameMap = { "normal": "ノーマル", "fire": "ほのお", "water": "みず", "grass": "くさ", "electric": "でんき", "ice": "こおり", "fighting": "かくとう", "poison": "どく", "ground": "じめん", "flying": "ひこう", "psychic": "エスパー", "bug": "むし", "rock": "いわ", "ghost": "ゴースト", "dragon": "ドラゴン", "dark": "あく", "steel": "はがね", "fairy": "フェアリー" };
        const japaneseTypes = pokemonData.types.map(t => typeNameMap[t.type.name] || t.type.name);
        return {
            id: pokemonData.id, name: name, generation: generationId,
            type1: japaneseTypes[0] || 'なし', type2: japaneseTypes[1] || 'なし',
            height: pokemonData.height / 10, weight: pokemonData.weight / 10,
            sprite: pokemonData.sprites.front_default, evolutionCount: evolutionCount
        };
    } catch (error) {
        console.error(`Data fetch error for ${pokemonIdentifier}:`, error);
        return null;
    }
}

/**
 * 進化の系統から進化回数を計算する
 * @param {object} chainData 進化系統データ
 * @param {string} speciesName ポケモン種族名(英語)
 * @returns {number} 進化回数 (0, 1, or 2)
 */
function getEvolutionCount(chainData, speciesName) {
    function findPokemon(stage, count) {
        // 'aegislash'のような名前と'aegislash-shield'のようなAPIの種族名が異なる場合があるので、-で分割して比較
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

/**
 * 2匹のポケモンを比較し、結果を返す
 * @param {object} guessed 推測したポケモン
 * @param {object} correct 正解のポケモン
 * @returns {object} 比較結果オブジェクト
 */
function comparePokemon(guessed, correct) {
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

/**
 * 結果を行としてレンダリングする
 * @param {object} pokemon ポケモンデータ
 * @param {object} comparison 比較結果
 */
function renderResult(pokemon, comparison) {
    resultHeader.classList.remove('hidden');
    const row = document.createElement('div');
    row.className = 'result-row grid grid-cols-8 gap-2 items-center text-center bg-gray-800 p-2 rounded-lg text-sm';
    row.innerHTML = `
        <div class="flex items-center justify-center h-full"><img src="${pokemon.sprite}" alt="${pokemon.name}" class="w-10 h-10"></div>
        <div class="font-bold">${pokemon.name}</div>
        <div class="${comparison.generation} rounded p-2">${pokemon.generation}</div>
        <div class="${comparison.type1} rounded p-2">${pokemon.type1}</div>
        <div class="${comparison.type2} rounded p-2">${pokemon.type2}</div>
        <div class="bg-gray-700 rounded p-2">${pokemon.height}m ${comparison.height}</div>
        <div class="bg-gray-700 rounded p-2">${pokemon.weight}kg ${comparison.weight}</div>
        <div class="${comparison.evolutionCount} rounded p-2">${pokemon.evolutionCount}</div>
    `;
    resultHistory.insertAdjacentElement('afterbegin', row);
}

// --- イベントリスナーの設定 ---
document.addEventListener('DOMContentLoaded', () => {
    classicModeButton.addEventListener('click', () => startGame('classic'));
    scoreAttackButton.addEventListener('click', () => startGame('scoreAttack'));

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
    homeButton.addEventListener('click', backToMenu); // ★ HOMEボタンにイベントを追加

    guessInput.addEventListener('input', handleInput);
    document.addEventListener('click', (event) => {
        if (!gameControls.contains(event.target)) {
            suggestionsBox.classList.add('hidden');
        }
    });
});
