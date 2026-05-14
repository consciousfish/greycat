const SUPABASE_URL = 'https://uyjykjualjybzfckmgdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QADVddyaye_VV4M3JIEQDQ_iE0YF0lH';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = "781"; // Твой пароль для удаления (можно поменять)

// Загрузка постов
async function loadPosts() {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error('Ошибка базы:', error);
        return;
    }

    const container = document.getElementById('postsContainer');
    container.innerHTML = '';
    data.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = `
            <span>${post.text}</span>
            <button class="del-btn" id="del-${post.id}" style="display:none;" onclick="deletePost(${post.id})">удалить</button>
        `;
        container.appendChild(div);
    });
}

// Отправка поста
async function addPost() {
    const input = document.getElementById('postInput');
    const text = input.value.trim();
    
    if (!text) return;

    const { error } = await supabase.from('posts').insert([{ text: text }]);
    
    if (error) {
        alert('Ошибка при отправке');
    } else {
        input.value = '';
        loadPosts();
    }
}

// Удаление (модерация)
async function deletePost(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) loadPosts();
}

// Вход в админку через консоль (F12 -> admin())
window.admin = function() {
    const pass = prompt("Пароль модератора:");
    if (pass === ADMIN_PASS) {
        document.querySelectorAll('.del-btn').forEach(btn => btn.style.display = 'block');
        console.log("Режим модератора активирован");
    } else {
        alert("Неверно!");
    }
}

// Запуск при загрузке
loadPosts();
