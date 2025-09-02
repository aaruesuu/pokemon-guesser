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

/**
 * ポケモンデータをAPIから取得する
 * @param {string|number} pokemonIdentifier ポケモン名(英語)または図鑑番号
 * @returns {Promise<object|null>} ポケモンデータオブジェクト or null
 */
async function fetchPokemonData(pokemonIdentifier) {
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
        
        let generationId = 8; // デフォルトはヒスイ地方などを含む8世代
        if (speciesData.generation) {
            const generationUrl = speciesData.generation.url;
            generationId = parseInt(generationUrl.split('/').slice(-2, -1)[0]);
        }
        
        const typeNameMap = {"normal":"ノーマル","fire":"ほのお","water":"みず","grass":"くさ","electric":"でんき","ice":"こおり","fighting":"かくとう","poison":"どく","ground":"じめん","flying":"ひこう","psychic":"エスパー","bug":"むし","rock":"いわ","ghost":"ゴースト","dragon":"ドラゴン","dark":"あく","steel":"はがね","fairy":"フェアリー"};
        const japaneseTypes = pokemonData.types.map(t => typeNameMap[t.type.name] || t.type.name);

        return {
            id: pokemonData.id,
            name: name,
            generation: generationId,
            type1: japaneseTypes[0] || 'なし',
            type2: japaneseTypes[1] || 'なし',
            height: pokemonData.height / 10,
            weight: pokemonData.weight / 10,
            sprite: pokemonData.sprites.front_default,
            evolutionCount: evolutionCount
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
        if (stage.species.name === speciesName) {
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
    else if (guessed.type2 === correct.type1) result.type2 = 'bg-yellow-500';
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
