const SUPABASE_URL = 'https://uyjyjkualjybzfckmgdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QADVddyaye_VV4M3JIEQDQ_iE0YF0lH';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ROOM_PREFIX = '[greycat-spy-room]';
const PLAYER_ID_KEY = 'spy_player_id';
const CUSTOM_PACKS_KEY = 'spy_custom_packs';
const ROOM_POLL_MS = 1800;
const ADMIN_PASS = 'cat781grey';

const DEFAULT_PACKS = [
    { id: 'games', name: 'Игры', words: ['Minecraft', 'Dota 2', 'Roblox', 'Among Us', 'Counter-Strike', 'GTA', 'Fortnite', 'Terraria'] },
    { id: 'characters', name: 'Персонажи', words: ['Шрек', 'Гарри Поттер', 'Марио', 'Соник', 'Дарт Вейдер', 'Человек-паук', 'Губка Боб', 'Бэтмен'] },
    { id: 'memes', name: 'Мемы', words: ['Ждун', 'Рикролл', 'Кот в очках', 'Огайо', 'Сигма', 'Троллфейс', 'Капибара', 'Пельмени'] }
];

let playerId = localStorage.getItem(PLAYER_ID_KEY);
let playerName = '';
let currentRoomPostId = null;
let currentRoom = null;
let pollTimer = null;
let timerInterval = null;
let channel = null;
let roleLockedOpen = false;

if (!playerId) {
    playerId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(PLAYER_ID_KEY, playerId);
}

function getPlayerName() {
    const storedName = localStorage.getItem('chat_username');
    if (storedName && storedName.trim()) return storedName.trim();
    const promptedName = prompt('Введите имя игрока:');
    const name = promptedName && promptedName.trim() ? promptedName.trim() : `Игрок ${Math.floor(Math.random() * 90) + 10}`;
    localStorage.setItem('chat_username', name);
    return name;
}

function roomText(room) {
    return `${ROOM_PREFIX}${JSON.stringify(room)}`;
}

function parseRoomPost(post) {
    if (!post.text || !post.text.startsWith(ROOM_PREFIX)) return null;
    try {
        return JSON.parse(post.text.slice(ROOM_PREFIX.length));
    } catch (e) {
        return null;
    }
}

function escapeHTML(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function generateRoomCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

function getLocalCustomPacks() {
    try {
        return JSON.parse(localStorage.getItem(CUSTOM_PACKS_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function hasAdminAccess() {
    return localStorage.getItem('forum_admin_unlocked') === 'true';
}

window.unlockAdmin = function() {
    if (hasAdminAccess()) {
        renderRoom();
        return;
    }
    const pass = prompt('Пароль модератора:');
    if (pass === ADMIN_PASS) {
        localStorage.setItem('forum_admin_unlocked', 'true');
        localStorage.setItem('forum_admin_mode', 'true');
        renderRoom();
    } else if (pass !== null) {
        alert('Неверный пароль!');
    }
};

function canManagePacks() {
    return isHost() || hasAdminAccess();
}

function saveLocalCustomPack(pack) {
    const packs = getLocalCustomPacks().filter(item => item.id !== pack.id);
    packs.push(pack);
    localStorage.setItem(CUSTOM_PACKS_KEY, JSON.stringify(packs));
}

function getRoomPacks(room) {
    const roomCustomPacks = room && Array.isArray(room.customPacks) ? room.customPacks : [];
    const deleted = new Set(room && Array.isArray(room.deletedPackIds) ? room.deletedPackIds : []);
    const packMap = new Map();
    DEFAULT_PACKS.forEach(pack => {
        if (!deleted.has(pack.id)) packMap.set(pack.id, { ...pack, source: 'default' });
    });
    [...getLocalCustomPacks(), ...roomCustomPacks].forEach(pack => {
        if (!deleted.has(pack.id)) packMap.set(pack.id, { ...pack, source: pack.ownerId ? 'custom' : 'default' });
    });
    return Array.from(packMap.values());
}

function getSelectedWords(room) {
    const packs = getRoomPacks(room);
    const selectedIds = new Set(room.selectedPackIds || []);
    return packs
        .filter(pack => selectedIds.has(pack.id))
        .flatMap(pack => pack.words || [])
        .map(word => String(word).trim())
        .filter(Boolean);
}

function isHost() {
    return currentRoom && currentRoom.hostId === playerId;
}

async function updateRoom(nextRoom) {
    currentRoom = {
        ...nextRoom,
        updatedAt: Date.now()
    };
    const { error } = await supabaseClient
        .from('posts')
        .update({ text: roomText(currentRoom) })
        .eq('id', currentRoomPostId);
    if (error) {
        alert('Ошибка обновления комнаты: ' + error.message);
        return false;
    }
    renderRoom();
    return true;
}

async function fetchRoomByCode(code) {
    const { data, error } = await supabaseClient
        .from('posts')
        .select('id,text')
        .order('id', { ascending: false })
        .limit(100);
    if (error) {
        alert('Ошибка поиска комнаты: ' + error.message);
        return null;
    }
    const found = (data || []).map(post => ({ post, room: parseRoomPost(post) })).find(item => item.room && item.room.code === code);
    return found ? { id: found.post.id, room: found.room } : null;
}

function subscribeRoom() {
    if (channel) supabaseClient.removeChannel(channel);
    if (!currentRoomPostId) return;
    channel = supabaseClient
        .channel(`spy-room-${currentRoomPostId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts', filter: `id=eq.${currentRoomPostId}` }, payload => {
            const room = parseRoomPost(payload.new);
            if (room) {
                currentRoom = room;
                renderRoom();
            }
        })
        .subscribe();
}

function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refreshRoom, ROOM_POLL_MS);
}

async function refreshRoom() {
    if (!currentRoomPostId) return;
    const { data, error } = await supabaseClient
        .from('posts')
        .select('text')
        .eq('id', currentRoomPostId)
        .maybeSingle();
    if (error || !data) return;
    const room = parseRoomPost(data);
    if (room) {
        currentRoom = room;
        renderRoom();
    }
}

window.createRoom = async function() {
    playerName = getPlayerName();
    let code = generateRoomCode();
    let attempt = 0;
    while (attempt < 8 && await fetchRoomByCode(code)) {
        code = generateRoomCode();
        attempt += 1;
    }

    const room = {
        code,
        hostId: playerId,
        players: [{ id: playerId, name: playerName }],
        customPacks: [],
        deletedPackIds: [],
        selectedPackIds: DEFAULT_PACKS.map(pack => pack.id),
        phase: 'lobby',
        spyId: null,
        secretWord: '',
        selectedWords: [],
        startedAt: null,
        durationSec: 300,
        votes: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const { data, error } = await supabaseClient
        .from('posts')
        .insert([{ text: roomText(room), username: 'spy-room', avatar: '', parent_id: null, image: null }])
        .select('id')
        .single();

    if (error) {
        alert('Ошибка создания комнаты: ' + error.message);
        return;
    }

    currentRoomPostId = data.id;
    currentRoom = room;
    subscribeRoom();
    startPolling();
    renderRoom();
};

window.joinRoom = async function() {
    playerName = getPlayerName();
    const input = document.getElementById('joinCodeInput');
    const code = input ? input.value.trim() : '';
    if (!/^\d{4}$/.test(code)) {
        alert('Введите код из 4 цифр.');
        return;
    }
    const found = await fetchRoomByCode(code);
    if (!found) {
        alert('Комната не найдена.');
        return;
    }

    currentRoomPostId = found.id;
    currentRoom = found.room;
    if (!currentRoom.players.some(player => player.id === playerId)) {
        currentRoom.players.push({ id: playerId, name: playerName });
        await updateRoom(currentRoom);
    }
    subscribeRoom();
    startPolling();
    renderRoom();
};

window.leaveRoom = async function() {
    if (currentRoom && currentRoomPostId) {
        const remainingPlayers = (currentRoom.players || []).filter(player => player.id !== playerId);
        if (remainingPlayers.length === 0) {
            await supabaseClient.from('posts').delete().eq('id', currentRoomPostId);
        } else {
            const nextHostId = currentRoom.hostId === playerId ? remainingPlayers[0].id : currentRoom.hostId;
            await updateRoom({ ...currentRoom, hostId: nextHostId, players: remainingPlayers });
        }
    }
    if (pollTimer) clearInterval(pollTimer);
    if (timerInterval) clearInterval(timerInterval);
    if (channel) supabaseClient.removeChannel(channel);
    currentRoomPostId = null;
    currentRoom = null;
    document.getElementById('roomGate').classList.remove('hidden');
    document.getElementById('roomPanel').classList.add('hidden');
    document.getElementById('idleMatch').classList.remove('hidden');
    document.getElementById('matchPanel').classList.add('hidden');
};

window.addCustomPack = async function() {
    if (!currentRoom) return;
    const nameInput = document.getElementById('customPackName');
    const wordsInput = document.getElementById('customPackWords');
    const name = nameInput.value.trim();
    const words = wordsInput.value.split(',').map(word => word.trim()).filter(Boolean);
    if (!name || words.length < 2) {
        alert('Введите название и минимум 2 слова через запятую.');
        return;
    }
    const pack = {
        id: `custom-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        name,
        words,
        ownerId: playerId
    };
    saveLocalCustomPack(pack);
    const nextRoom = {
        ...currentRoom,
        customPacks: [...(currentRoom.customPacks || []), pack],
        selectedPackIds: isHost() ? [...new Set([...(currentRoom.selectedPackIds || []), pack.id])] : currentRoom.selectedPackIds
    };
    await updateRoom(nextRoom);
    nameInput.value = '';
    wordsInput.value = '';
};

window.togglePack = async function(packId, checked) {
    if (!isHost()) return;
    const selected = new Set(currentRoom.selectedPackIds || []);
    if (checked) selected.add(packId);
    else selected.delete(packId);
    await updateRoom({ ...currentRoom, selectedPackIds: Array.from(selected) });
};

window.editPack = async function(packId) {
    if (!currentRoom || !canManagePacks()) return;
    const pack = getRoomPacks(currentRoom).find(item => item.id === packId);
    if (!pack) return;
    const nextName = prompt('Новое название пака:', pack.name);
    if (!nextName || !nextName.trim()) return;
    const nextWordsRaw = prompt('Слова/фразы через запятую:', (pack.words || []).join(', '));
    if (nextWordsRaw === null) return;
    const nextWords = nextWordsRaw.split(',').map(word => word.trim()).filter(Boolean);
    if (nextWords.length < 2) {
        alert('В паке должно быть минимум 2 слова.');
        return;
    }
    const updatedPack = {
        id: pack.id,
        name: nextName.trim(),
        words: nextWords,
        ownerId: pack.ownerId || playerId
    };
    const customPacks = (currentRoom.customPacks || []).filter(item => item.id !== pack.id);
    customPacks.push(updatedPack);
    await updateRoom({ ...currentRoom, customPacks });
};

window.deletePack = async function(packId) {
    if (!currentRoom || !canManagePacks()) return;
    const pack = getRoomPacks(currentRoom).find(item => item.id === packId);
    if (!pack) return;
    if (!confirm(`Удалить пак "${pack.name}" из этой комнаты?`)) return;
    const customPacks = (currentRoom.customPacks || []).filter(item => item.id !== packId);
    const deletedPackIds = new Set(currentRoom.deletedPackIds || []);
    deletedPackIds.add(packId);
    const selectedPackIds = (currentRoom.selectedPackIds || []).filter(id => id !== packId);
    await updateRoom({ ...currentRoom, customPacks, deletedPackIds: Array.from(deletedPackIds), selectedPackIds });
};

window.setGameDuration = async function(value) {
    if (!isHost() || !currentRoom || currentRoom.phase !== 'lobby') return;
    const minutes = Math.max(1, Math.min(30, parseInt(value, 10) || 5));
    await updateRoom({ ...currentRoom, durationSec: minutes * 60 });
};

window.startGame = async function() {
    if (!isHost() || !currentRoom) return;
    if ((currentRoom.players || []).length < 3) {
        alert('Для игры лучше минимум 3 игрока.');
        return;
    }
    const selectedWords = getSelectedWords(currentRoom);
    if (selectedWords.length === 0) {
        alert('Выберите хотя бы один пак со словами.');
        return;
    }
    const players = currentRoom.players || [];
    const spy = players[Math.floor(Math.random() * players.length)];
    const secretWord = selectedWords[Math.floor(Math.random() * selectedWords.length)];
    await updateRoom({
        ...currentRoom,
        phase: 'game',
        spyId: spy.id,
        secretWord,
        selectedWords,
        startedAt: Date.now(),
        durationSec: currentRoom.durationSec || 300,
        votes: {}
    });
};

function renderRoom() {
    if (!currentRoom) return;
    document.getElementById('roomGate').classList.add('hidden');
    document.getElementById('roomPanel').classList.remove('hidden');
    document.getElementById('roomCode').textContent = currentRoom.code;

    const playersList = document.getElementById('playersList');
    playersList.innerHTML = (currentRoom.players || []).map(player => `
        <span class="pill ${player.id === currentRoom.hostId ? 'host' : ''}">${escapeHTML(player.name)}${player.id === currentRoom.hostId ? ' · хост' : ''}</span>
    `).join('');

    renderPacks();
    renderMatch();
}

function renderPacks() {
    const packList = document.getElementById('packList');
    const lobbyControls = document.getElementById('lobbyControls');
    const startBtn = document.getElementById('startBtn');
    const timeControl = document.getElementById('timeControl');
    const durationInput = document.getElementById('durationInput');
    const inLobby = currentRoom.phase === 'lobby';
    lobbyControls.classList.toggle('hidden', !inLobby);
    startBtn.style.display = isHost() ? 'inline-flex' : 'none';
    timeControl.style.display = isHost() ? 'flex' : 'none';
    if (durationInput) durationInput.value = Math.round((currentRoom.durationSec || 300) / 60);

    const selected = new Set(currentRoom.selectedPackIds || []);
    packList.innerHTML = getRoomPacks(currentRoom).map(pack => `
        <div class="pack-card">
            <input type="checkbox" ${selected.has(pack.id) ? 'checked' : ''} ${isHost() ? '' : 'disabled'} onchange="togglePack('${pack.id}', this.checked)">
            <span class="pack-body">
                <span class="pack-name">${escapeHTML(pack.name)}</span>
                <span class="pack-count">${(pack.words || []).length} слов</span>
                ${canManagePacks() ? `
                    <span class="pack-actions" style="display:flex;">
                        <button class="secondary" onclick="editPack('${pack.id}')">Изм.</button>
                        <button class="danger" onclick="deletePack('${pack.id}')">Удал.</button>
                    </span>
                ` : ''}
            </span>
        </div>
    `).join('');
}

function renderMatch() {
    const idle = document.getElementById('idleMatch');
    const panel = document.getElementById('matchPanel');
    const inGame = currentRoom.phase === 'game';
    idle.classList.toggle('hidden', inGame);
    panel.classList.toggle('hidden', !inGame);
    if (!inGame) return;

    const words = currentRoom.selectedWords || getSelectedWords(currentRoom);
    document.getElementById('possibleWords').innerHTML = words.map(word => `<span class="pill">${escapeHTML(word)}</span>`).join('');
    renderVoting();
    hideRole();
    startTimer();
}

function renderVoting() {
    const voteList = document.getElementById('voteList');
    if (!voteList) return;
    const votes = currentRoom.votes || {};
    const counts = {};
    Object.values(votes).forEach(targetId => {
        counts[targetId] = (counts[targetId] || 0) + 1;
    });
    voteList.innerHTML = (currentRoom.players || []).map(player => {
        const isVoted = votes[playerId] === player.id;
        return `
            <div class="vote-row">
                <span>${escapeHTML(player.name)} · ${counts[player.id] || 0} голосов</span>
                <button class="${isVoted ? '' : 'secondary'}" onclick="voteForSpy('${player.id}')">${isVoted ? 'Выбран' : 'Голос'}</button>
            </div>
        `;
    }).join('');
}

window.voteForSpy = async function(targetId) {
    if (!currentRoom || currentRoom.phase !== 'game') return;
    const votes = { ...(currentRoom.votes || {}) };
    if (votes[playerId] === targetId) delete votes[playerId];
    else votes[playerId] = targetId;
    await updateRoom({ ...currentRoom, votes });
};

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const renderTimer = () => {
        const total = currentRoom.durationSec || 300;
        const elapsed = Math.floor((Date.now() - (currentRoom.startedAt || Date.now())) / 1000);
        const left = Math.max(0, total - elapsed);
        const minutes = String(Math.floor(left / 60)).padStart(2, '0');
        const seconds = String(left % 60).padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    };
    renderTimer();
    timerInterval = setInterval(renderTimer, 1000);
}

window.showRole = function() {
    if (!currentRoom || currentRoom.phase !== 'game') return;
    const roleCard = document.getElementById('roleCard');
    const roleTitle = document.getElementById('roleTitle');
    const roleWord = document.getElementById('roleWord');
    const isSpy = currentRoom.spyId === playerId;
    roleTitle.textContent = isSpy ? 'Ты Шпион' : 'Ты Местный';
    roleWord.textContent = isSpy ? 'Узнай слово по вопросам' : currentRoom.secretWord;
    roleCard.style.display = 'block';
};

window.hideRole = function() {
    if (!roleLockedOpen) {
        const roleCard = document.getElementById('roleCard');
        if (roleCard) roleCard.style.display = 'none';
    }
};

window.toggleRole = function() {
    roleLockedOpen = !roleLockedOpen;
    if (roleLockedOpen) showRole();
    else hideRole();
};

document.addEventListener('DOMContentLoaded', () => {
    playerName = getPlayerName();
});
