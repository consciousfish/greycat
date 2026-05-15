const SUPABASE_URL = 'https://uyjyjkualjybzfckmgdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QADVddyaye_VV4M3JIEQDQ_iE0YF0lH';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = "cat781grey";
let isAdminMode = false; // Флаг, чтобы админка не слетала при обновлении списка

// Функция авторизации (сохраняет ник в браузере и делает аватарку)
window.loginUser = function() {
    const name = prompt("Введите ваш никнейм для комментирования:");
    if (!name || !name.trim()) return;

    const trimmedName = name.trim();
    const randomAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedName)}`;

    localStorage.setItem('chat_username', trimmedName);
    localStorage.setItem('chat_avatar', randomAvatar);

    updateProfileUI();
};

// Функция обработки кастомной аватарки (конвертация картинки в Base64)
window.uploadCustomAvatar = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Проверка, авторизован ли вообще юзер, перед тем как менять аватарку
    let username = localStorage.getItem('chat_username');
    if (!username) {
        window.loginUser();
        username = localStorage.getItem('chat_username');
        if (!username) return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        localStorage.setItem('chat_avatar', base64Image); // Сохраняем личную аватарку в кэш
        updateProfileUI();
        alert("Аватарка успешно обновлена!");
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

    if (username && avatar) {
        if (userAvatarImg) { 
            userAvatarImg.src = avatar; 
            userAvatarImg.style.display = 'block'; 
        }
        if (userStatusSpan) userStatusSpan.textContent = username;
        if (authBtn) authBtn.textContent = 'Сменить ник';
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
    
    // Если включен админ-режим, добавляем кнопку массового удаления сверху списка
    if (isAdminMode) {
        const massDelBtn = document.createElement('button');
        massDelBtn.id = 'massDeleteBtn';
        massDelBtn.textContent = 'Удалить выбранные сообщения';
        massDelBtn.style = 'background: #da373c; color: white; border: none; padding: 10px 15px; border-radius: 5px; font-weight: bold; cursor: pointer; margin-bottom: 15px; width: 100%;';
        massDelBtn.onclick = deleteSelectedPosts;
        container.appendChild(massDelBtn);
    }

    data.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        div.style.position = 'relative';
        
        // Чекбокс для админа (виден только если isAdminMode = true)
        const checkboxHTML = isAdminMode 
            ? `<input type="checkbox" class="admin-select-checkbox" value="${post.id}" style="margin-right: 15px; width: 18px; height: 18px; cursor: pointer;">` 
            : '';

        // Настройки отображения поста: аватарки увеличены до 50px
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                ${checkboxHTML}
                <img src="${post.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}" style="width: 50px; height: 50px; border-radius: 50%; background: #202225; object-fit: cover; border: 2px solid #5865f2;">
                <div style="flex: 1;">
                    <strong style="color: #fff; font-size: 16px; display: block; margin-bottom: 4px;">${post.username || 'Аноним'}</strong>
                    <span style="color: #dcddde; word-break: break-word; font-size: 15px;">${post.text}</span>
                </div>
                <button class="del-btn" style="display: ${isAdminMode ? 'block' : 'none'}; color: #da373c; background: none; border: none; cursor: pointer; font-weight: bold; font-size: 14px;" onclick="deletePost(${post.id})">удалить</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Отправка нового сообщения на стену
async function addPost() {
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

    const { error } = await supabaseClient.from('posts').insert([{ 
        text: text,
        username: username,
        avatar: avatar
    }]);

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
        alert("Вы не выбрали ни одного сообщения для удаления!");
        return;
    }

    if (!confirm(`Вы уверены, что хотите удалить ${checkboxes.length} сообщений сразу?`)) return;

    // Собираем массивом все ID, у которых проставлен флажок
    const idsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.value));

    // Массовый запрос в Supabase через фильтр .in()
    const { error } = await supabaseClient.from('posts').delete().in('id', idsToDelete);

    if (error) {
        alert("Ошибка при массовом удалении: " + error.message);
    } else {
        loadPosts(); // Обновляем стену
    }
}

// Включение перманентного режима админа через консоль: admin()
window.admin = function() {
    const pass = prompt("Пароль модератора:");
    if (pass === ADMIN_PASS) {
        isAdminMode = true; // Запоминаем статус, он больше не сбросится
        loadPosts(); // Перерисовываем стену, чтобы вывелись чекбоксы и кнопки
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
