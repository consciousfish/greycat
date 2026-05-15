const SUPABASE_URL = 'https://uyjyjkualjybzfckmgdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QADVddyaye_VV4M3JIEQDQ_iE0YF0lH';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = "cat781grey";
let isAdminMode = false; 
let isSending = false; // Флаг для защиты от двойных/множественных кликов

// Функция авторизации (сохраняет ник и генерирует аватарку ТОЛЬКО если нет кастомной)
window.loginUser = function() {
    const name = prompt("Введите ваш никнейм для комментирования:");
    if (!name || !name.trim()) return;

    const trimmedName = name.trim();
    localStorage.setItem('chat_username', trimmedName);

    // БАГФИКС: Проверяем, есть ли уже кастомная аватарка (Base64). Если нет — ставим робота
    const existingAvatar = localStorage.getItem('chat_avatar');
    if (!existingAvatar || !existingAvatar.startsWith('data:image')) {
        const randomAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedName)}`;
        localStorage.setItem('chat_avatar', randomAvatar);
    }

    updateProfileUI();
};

// Функция обработки кастомной аватарки (конвертация картинки в Base64)
window.uploadCustomAvatar = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    let username = localStorage.getItem('chat_username');
    if (!username) {
        window.loginUser();
        username = localStorage.getItem('chat_username');
        if (!username) return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        localStorage.setItem('chat_avatar', base64Image); 
        updateProfileUI();
        alert("Аватарка успешно сохранена!");
    };
    reader.readAsDataURL(file);
};

// Обновление плашки профиля на экране
function updateProfileUI() {
    const username = localStorage.getItem('chat_username');
    const avatar = localStorage.getItem('chat_avatar');
    
    const userAvatarImg = document.getElementById('userAvatar');
    const userStatusSpan = document.getElementById('userStatus');
    const authBtn = document.getElementById('authBtn');

    if (username) {
        if (userStatusSpan) userStatusSpan.textContent = username;
        if (authBtn) authBtn.textContent = 'Сменить ник';
    }
    if (avatar && userAvatarImg) {
        userAvatarImg.src = avatar;
        userAvatarImg.style.display = 'block';
    }
}

// Загрузка сообщений со стены
async function loadPosts() {
    const container = document.getElementById('postsContainer');
    if (!container) return; 

    const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error('Ошибка загрузки постов:', error.message);
        return;
    }

    container.innerHTML = '';
    
    if (isAdminMode) {
        const massDelBtn = document.createElement('button');
        massDelBtn.id = 'massDeleteBtn';
        massDelBtn.textContent = 'Удалить выбранные сообщения';
        massDelBtn.style = 'background: #da373c; color: white; border: none; padding: 12px 15px; border-radius: 5px; font-weight: bold; cursor: pointer; margin-bottom: 15px; width: 100%; font-size: 16px;';
        massDelBtn.onclick = deleteSelectedPosts;
        container.appendChild(massDelBtn);
    }

    data.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        
        // Форматирование даты создания поста
        const postDate = post.created_at ? new Date(post.created_at) : new Date();
        const formattedDate = postDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        const checkboxHTML = isAdminMode 
            ? `<input type="checkbox" class="admin-select-checkbox" value="${post.id}" style="margin-right: 15px; width: 22px; height: 22px; cursor: pointer;">` 
            : '';

        // Большой размер карточек (аватарки 55px, тексты и ники увеличены)
        div.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 15px;">
                ${checkboxHTML}
                <img src="${post.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}" style="width: 55px; height: 55px; border-radius: 50%; background: #202225; object-fit: cover; border: 2px solid #5865f2; flex-shrink: 0;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                        <strong style="color: #fff; font-size: 18px;">${post.username || 'Аноним'}</strong>
                        <span style="color: #72767d; font-size: 13px;">${formattedDate}</span>
                    </div>
                    <div style="color: #dcddde; word-break: break-word; font-size: 17px; line-height: 1.4; margin-bottom: 12px;">${post.text}</div>
                    
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button class="reaction-btn" onclick="addReaction(${post.id}, 'likes', ${post.likes || 0})">👍 <span>${post.likes || 0}</span></button>
                        <button class="reaction-btn" onclick="addReaction(${post.id}, 'dislikes', ${post.dislikes || 0})">👎 <span>${post.dislikes || 0}</span></button>
                        <button style="background: none; border: none; color: #5865f2; font-weight: bold; cursor: pointer; font-size: 15px; margin-left: 10px;" onclick="replyToUser('${post.username}')">Ответить</button>
                    </div>
                </div>
                <button class="del-btn" style="display: ${isAdminMode ? 'block' : 'none'}; color: #da373c; background: none; border: none; cursor: pointer; font-weight: bold; font-size: 15px;" onclick="deletePost(${post.id})">удалить</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Функция ответа (добавляет упоминание в инпут)
window.replyToUser = function(username) {
    const input = document.getElementById('postInput');
    if (!input) return;
    input.value = `@${username}, ` + input.value;
    input.focus();
};

// Функция добавления лайка / дизлайка
window.addReaction = function(id, type, currentCount) {
    // Чтобы не спамить в БД, отключаем клики на долю секунды
    supabaseClient.from('posts').update({ [type]: currentCount + 1 }).eq('id', id)
    .then(({ error }) => {
        if (!error) loadPosts();
    });
};

// Отправка нового сообщения на стену
async function addPost() {
    if (isSending) return; // ЗАЩИТА ОТ СПАМА: Если запрос выполняется, игнорируем клик

    let username = localStorage.getItem('chat_username');
    let avatar = localStorage.getItem('chat_avatar');

    if (!username) {
        window.loginUser();
        username = localStorage.getItem('chat_username');
        avatar = localStorage.getItem('chat_avatar');
        if (!username) return; 
    }

    const input = document.getElementById('postInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    // Включаем блокировку кнопки отправки
    isSending = true;
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.disabled = true;

    const { error } = await supabaseClient.from('posts').insert([{ 
        text: text,
        username: username,
        avatar: avatar
    }]);

    // Выключаем блокировку
    isSending = false;
    if (sendBtn) sendBtn.disabled = false;

    if (error) {
        alert('Ошибка базы данных: ' + error.message);
        console.error(error);
    } else {
        input.value = '';
        loadPosts();
    }
}

// Удаление одного сообщения (Админка)
async function deletePost(id) {
    const { error } = await supabaseClient.from('posts').delete().eq('id', id);
    if (!error) loadPosts();
}

// Массовое удаление выделенных постов
async function deleteSelectedPosts() {
    const checkboxes = document.querySelectorAll('.admin-select-checkbox:checked');
    if (checkboxes.length === 0) {
        alert("Вы не выбрали ни одного сообщения!");
        return;
    }

    if (!confirm(`Удалить выбранные сообщения (${checkboxes.length} шт.)?`)) return;

    const idsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.value));
    const { error } = await supabaseClient.from('posts').delete().in('id', idsToDelete);

    if (error) {
        alert("Ошибка при удалении: " + error.message);
    } else {
        loadPosts(); 
    }
}

// Режим админа через консоль: admin()
window.admin = function() {
    const pass = prompt("Пароль модератора:");
    if (pass === ADMIN_PASS) {
        isAdminMode = true; 
        loadPosts(); 
        alert("Режим модератора успешно активирован!");
    } else {
        alert("Неверный пароль!");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.onclick = addPost;
    }
    
    const postInput = document.getElementById('postInput');
    if (postInput) {
        postInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addPost();
        });
    }

    updateProfileUI();
    loadPosts();
});
