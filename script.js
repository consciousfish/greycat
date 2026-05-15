const SUPABASE_URL = 'https://uyjykjualjybzfckmgdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QADVddyaye_VV4M3JIEQDQ_iE0YF0lH';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = "781";

async function loadPosts() {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error('Ошибка базы данных:', error.message);
        return;
    }

    const container = document.getElementById('postsContainer');
    if (!container) return; // Защита от запуска скрипта на страницах без стены
    
    container.innerHTML = '';
    data.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = `
            <span>${post.text}</span>
            <button class="del-btn" style="display:none; color:#da373c; background:none; border:none; cursor:pointer;" onclick="deletePost(${post.id})">удалить</button>
        `;
        container.appendChild(div);
    });
}

async function addPost() {
    const input = document.getElementById('postInput');
    const text = input.value.trim();
    if (!text) return;

    const { error } = await supabase.from('posts').insert([{ text: text }]);
    if (error) {
        alert('Ошибка базы данных! Проверь вкладку SQL Editor в Supabase.');
        console.error(error);
    } else {
        input.value = '';
        loadPosts();
    }
}

async function deletePost(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) loadPosts();
}

window.admin = function() {
    const pass = prompt("Пароль модератора:");
    if (pass === ADMIN_PASS) {
        document.querySelectorAll('.del-btn').forEach(btn => btn.style.display = 'block');
    } else {
        alert("Неверно!");
    }
};

// Жесткая привязка кнопки к действию при загрузке страницы wall.html
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.onclick = addPost;
    }
    loadPosts();
});
