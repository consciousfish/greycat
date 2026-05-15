const SUPABASE_URL = 'https://uyjykjualjybzfckmgdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QADVddyaye_VV4M3JIEQDQ_iE0YF0lH';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = "781";

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
        div.innerHTML = `
            <span>${post.text}</span>
            <button class="del-btn" style="display:none; color:#da373c; background:none; border:none; cursor:pointer; font-weight:bold;" onclick="deletePost(${post.id})">удалить</button>
        `;
        container.appendChild(div);
    });
}

// Отправка нового сообщения на стену
async function addPost() {
    const input = document.getElementById('postInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    const { error } = await supabaseClient.from('posts').insert([{ text: text }]);
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
    loadPosts();
});
