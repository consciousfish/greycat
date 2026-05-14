const SUPABASE_URL = 'https://uyjykjualjybzfckmgdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QADVddyaye_VV4M3JIEQDQ_iE0YF0lH';
// Исправленная инициализация
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = "781";

async function loadPosts() {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error('Ошибка Supabase:', error.message);
        return;
    }

    const container = document.getElementById('postsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    data.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = `
            <span>${post.text}</span>
            <button class="del-btn" style="display:none; color:red; cursor:pointer;" onclick="deletePost(${post.id})">удалить</button>
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
        alert('Ошибка записи. Проверь SQL-политики в Supabase!');
        console.error(error);
    } else {
        input.value = '';
        loadPosts();
    }
}

// Привязываем кнопку отправки через код
document.getElementById('sendBtn').addEventListener('click', addPost);

async function deletePost(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) loadPosts();
}

window.admin = function() {
    const pass = prompt("Пароль?");
    if (pass === ADMIN_PASS) {
        document.querySelectorAll('.del-btn').forEach(btn => btn.style.display = 'block');
    }
};

loadPosts();
