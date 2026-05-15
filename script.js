const SUPABASE_URL = 'https://uyjyjkualjybzfckmgdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QADVddyaye_VV4M3JIEQDQ_iE0YF0lH';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = "cat781grey";

// Функция авторизации (сохраняет ник в браузере и делает аватарку)
window.loginUser = function() {
    const name = prompt("Введите ваш никнейм для комментирования:");
    if (!name || !name.trim()) return;

    const trimmedName = name.trim();
    // Генерируем уникального робота-аватарку на основе имени
    const randomAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedName)}`;

    // Сохраняем данные в память браузера
    localStorage.setItem('chat_username', trimmedName);
    localStorage.setItem('chat_avatar', randomAvatar);

    updateProfileUI();
};

// Обновление плашки профиля на экране (если она есть в HTML)
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
    data.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        
        // Отрендерим пост красиво: сверху аватарка + ник, снизу сам текст
        div.innerHTML = `
            <div style="display: flex; gap: 12px; margin-bottom: 10px; align-items: center;">
                <img src="${post.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}" style="width: 35px; height: 35px; border-radius: 50%; background: #202225;">
                <strong style="color: #fff; font-size: 15px;">${post.username || 'Аноним'}</strong>
            </div>
            <div style="color: #dcddde; padding-left: 47px; display: flex; justify-content: space-between; align-items: center;">
                <span style="word-break: break-word; font-size: 16px;">${post.text}</span>
                <button class="del-btn" style="display:none; color:#da373c; background:none; border:none; cursor:pointer; font-weight:bold; font-size: 14px;" onclick="deletePost(${post.id})">удалить</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Отправка нового сообщения на стену
async function addPost() {
    let username = localStorage.getItem('chat_username');
    let avatar = localStorage.getItem('chat_avatar');

    // Если гость пытается написать без авторизации, сначала просим представиться
    if (!username) {
        window.loginUser();
        username = localStorage.getItem('chat_username');
        avatar = localStorage.getItem('chat_avatar');
        if (!username) return; // Если нажал «Отмена» — прерываем отправку
    }

    const input = document.getElementById('postInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    // Пушим в Supabase сразу три поля: текст, имя и аватарку
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

// Удаление сообщения (Админка)
async function deletePost(id) {
    const { error } = await supabaseClient.from('posts').delete().eq('id', id);
    if (!error) loadPosts();
}

window.admin = function() {
    const pass = prompt("Пароль модератора:");
    if (pass === ADMIN_PASS) {
        document.querySelectorAll('.del-btn').forEach(btn => btn.style.display = 'block');
    } else {
        alert("Неверный пароль!");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.onclick = addPost;
    }
    
    // Привязка отправки на кнопку Enter для удобства
    const postInput = document.getElementById('postInput');
    if (postInput) {
        postInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addPost();
        });
    }

    updateProfileUI();
    loadPosts();
});
