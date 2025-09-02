// --- DOM要素の取得 ---
const guessInput = document.getElementById('guess-input');
const guessButton = document.getElementById('guess-button');
const messageArea = document.getElementById('message-area');
const resultHistory = document.getElementById('result-history');
const resultHeader = document.getElementById('result-header');
const gameControls = document.getElementById('game-controls');
const inputArea = document.getElementById('input-area');
const retryButton = document.getElementById('retry-button');
const suggestionsBox = document.getElementById('suggestions-box');
const correctCountSpan = document.getElementById('correct-count');
const totalGuessesSpan = document.getElementById('total-guesses');

// --- グローバル変数と定数 ---
const allPokemonNames = Object.keys(pokemonNameMap);
let correctPokemon = null;
let gameOver = false;
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/';

// --- 新モード用のゲーム状態変数 ---
let correctCount = 0;
let totalGuesses = 0;
let answeredPokemonIds = new Set(); // 回答済みの正解ポケモンIDを保存

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
 * ゲームの初期化、または次の問題を開始する
 */
async function initGame() {
    messageArea.textContent = `${correctCount + 1} 問目のポケモンを読み込み中...`;
    
    let randomId;
    // すでに出題されたポケモンは避ける
    do {
        randomId = Math.floor(Math.random() * 905) + 1;
    } while (answeredPokemonIds.has(randomId));

    correctPokemon = await fetchPokemonData(randomId);
    
    if (correctPokemon) {
        console.log(`${correctCount + 1}問目の正解:`, correctPokemon);
        messageArea.textContent = `[${correctCount + 1} / 3 問目] ポケモンを推測しよう！`;
        resultHistory.innerHTML = ''; // 前の問題の履歴をクリア
        resultHeader.classList.add('hidden');
    } else {
        messageArea.textContent = 'ポケモンの読み込みに失敗しました。再試行します...';
        setTimeout(initGame, 1000);
    }
}

/**
 * ゲーム全体をリセットする
 */
function resetGame() {
    correctCount = 0;
    totalGuesses = 0;
    answeredPokemonIds.clear();
    gameOver = false;

    updateStatus(); // 表示を0にリセット
    
    messageArea.textContent = '';
    retryButton.classList.add('hidden');
    inputArea.classList.remove('hidden');
    
    initGame();
}

/**
 * ユーザーの推測を処理する
 */
async function handleGuess() {
    if (gameOver) return;
    
    let guessNameJa = hiraToKana(guessInput.value.trim());
    if (!guessNameJa) return;

    suggestionsBox.classList.add('hidden');

    const guessNameEn = pokemonNameMap[guessNameJa];
    if (!guessNameEn) {
        messageArea.textContent = `「${guessNameJa}」というポケモンは見つかりませんでした。`;
        return;
    }
    
    guessButton.disabled = true;
    messageArea.textContent = `${guessNameJa}の情報を調べています...`;
    const guessedPokemon = await fetchPokemonData(guessNameEn);

    if (!guessedPokemon) {
        messageArea.textContent = `「${guessNameJa}」のデータ取得に失敗しました。`;
        guessButton.disabled = false;
        return;
    }
    
    totalGuesses++;
    updateStatus();
    
    const comparison = comparePokemon(guessedPokemon, correctPokemon);
    renderResult(guessedPokemon, comparison);

    // 正解した場合の処理
    if (guessedPokemon.id === correctPokemon.id) {
        correctCount++;
        answeredPokemonIds.add(correctPokemon.id);
        updateStatus();

        if (correctCount < 3) {
            messageArea.textContent = `正解！ ${correctPokemon.name} でした！ 次の問題へ！`;
            // 少し待ってから次の問題へ
            setTimeout(initGame, 2000); 
        } else {
            messageArea.textContent = `ゲームクリア！最終スコアは ${totalGuesses} 回でした！`;
            endGame();
        }
    } else {
        messageArea.textContent = `[${correctCount + 1} / 3 問目] ポケモンを推測しよう！`;
    }
    
    guessInput.value = '';
    guessButton.disabled = false;
}

/**
 * ゲーム終了時の処理
 */
function endGame() {
    gameOver = true;
    inputArea.classList.add('hidden');
    retryButton.classList.remove('hidden');
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
 * スコア表示を更新する
 */
function updateStatus() {
    correctCountSpan.textContent = correctCount;
    totalGuessesSpan.textContent = totalGuesses;
}

// --- API通信とデータ処理 ---

async function fetchPokemonData(pokemonIdentifier) {
    // ... (この関数は変更なし)
}
function getEvolutionCount(chainData, speciesName) {
    // ... (この関数は変更なし)
}
function comparePokemon(guessed, correct) {
    // ... (この関数は変更なし)
}
function renderResult(pokemon, comparison) {
    // ... (この関数は変更なし)
}


// --- イベントリスナーの設定 ---
guessButton.addEventListener('click', handleGuess);
guessInput.addEventListener('keydown', (event) => {
    if (event.isComposing && event.key === 'Enter') {
        return;
    }
    if (!event.isComposing && event.key === 'Enter') {
        handleGuess();
    }
});
retryButton.addEventListener('click', resetGame);
guessInput.addEventListener('input', handleInput);
document.addEventListener('click', (event) => {
    if (!gameControls.contains(event.target)) {
        suggestionsBox.classList.add('hidden');
    }
});

// --- ゲーム開始 ---
initGame();