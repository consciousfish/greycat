const SUPABASE_URL = 'https://uyjyjkualjybzfckmgdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QADVddyaye_VV4M3JIEQDQ_iE0YF0lH';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = "cat781grey";
let isAdminMode = false; 
let isSending = false; 
let currentParentId = null; 
let attachedMediaBase64 = null;

window.loginUser = function() {
    const name = prompt("Введите ваш никнейм для комментирования:");
    if (!name || !name.trim()) return;
    const trimmedName = name.trim();
    localStorage.setItem('chat_username', trimmedName);
    const existingAvatar = localStorage.getItem('chat_avatar');
    if (!existingAvatar || !existingAvatar.startsWith('data:image')) {
        const randomAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedName)}`;
        localStorage.setItem('chat_avatar', randomAvatar);
    }
    updateProfileUI();
};

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
        localStorage.setItem('chat_avatar', e.target.result); 
        updateProfileUI();
        alert("Аватарка успешно сохранена!");
    };
    reader.readAsDataURL(file);
};

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

window.handleMediaSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2621440) {
        alert("Файл слишком большой! Выберите картинку или GIF весом до 2.5 МБ.");
        event.target.value = "";
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        attachedMediaBase64 = e.target.result;
        const container = document.getElementById('previewMediaContainer');
        const img = document.getElementById('previewMediaImg');
        if (container && img) {
            img.src = attachedMediaBase64;
            container.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
};

window.clearMediaPreview = function() {
    attachedMediaBase64 = null;
    const container = document.getElementById('previewMediaContainer');
    const img = document.getElementById('previewMediaImg');
    const uploader = document.getElementById('mediaUploader');
    if (container) container.style.display = 'none';
    if (img) img.src = '';
    if (uploader) uploader.value = '';
};

window.setReplyTarget = function(id, username) {
    currentParentId = id;
    const indicator = document.getElementById('replyIndicator');
    const text = document.getElementById('replyIndicatorText');
    if (indicator && text) {
        text.textContent = `Вы отвечаете пользователю: ${username}`;
        indicator.style.display = 'flex';
    }
    const input = document.getElementById('postInput');
    if (input) {
        input.placeholder = `Ваш ответ для ${username}...`;
        input.focus();
    }
};

window.cancelReply = function() {
    currentParentId = null;
    const indicator = document.getElementById('replyIndicator');
    if (indicator) indicator.style.display = 'none';
    const input = document.getElementById('postInput');
    if (input) input.placeholder = "Напиши что-нибудь на стене...";
};

function hasUserReacted(postId) {
    const reactedPosts = JSON.parse(localStorage.getItem('reacted_posts') || '{}');
    return reactedPosts[postId] || null; 
}

function saveUserReaction(postId, type) {
    const reactedPosts = JSON.parse(localStorage.getItem('reacted_posts') || '{}');
    if (type === null) {
        delete reactedPosts[postId];
    } else {
        reactedPosts[postId] = type;
    }
    localStorage.setItem('reacted_posts', JSON.stringify(reactedPosts));
}

function createPostHTML(post) {
    const postDate = post.created_at ? new Date(post.created_at) : new Date();
    const formattedDate = postDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const checkboxHTML = isAdminMode 
        ? `<input type="checkbox" class="admin-select-checkbox" value="${post.id}" style="margin-right:15px;width:22px;height:22px;cursor:pointer;align-self:center;">` 
        : '';
    const userReaction = hasUserReacted(post.id);
    const likeBtnStyle = userReaction === 'likes' ? 'border-color:#ff5500;color:#ff5500;background:#2a1a10;' : '';
    const dislikeBtnStyle = userReaction === 'dislikes' ? 'border-color:#e03c3c;color:#e03c3c;background:#2a1010;' : '';
    const imageHTML = post.image ? `<img src="${post.image}" class="post-attached-image" alt="Прикрепленное медиа">` : '';
    const safeUsername = (post.username || 'Аноним').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
        <div style="display:flex;align-items:flex-start;gap:14px;">
            ${checkboxHTML}
            <img src="${post.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}" style="width:42px;height:42px;border-radius:50%;background:#111;object-fit:cover;border:2px solid #ff5500;flex-shrink:0;">
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <strong style="color:#fff;font-size:14px;">${post.username || 'Аноним'}</strong>
                    <span style="color:#555;font-size:11px;">${formattedDate}</span>
                </div>
                <div style="color:#ccc;word-break:break-word;font-size:14px;line-height:1.5;">${post.text}</div>
                ${imageHTML}
                <div style="display:flex;gap:8px;align-items:center;margin-top:9px;">
                    <button class="reaction-btn" style="${likeBtnStyle}" onclick="addReaction(${post.id},'likes',${post.likes||0},${post.dislikes||0})">👍 <span>${post.likes||0}</span></button>
                    <button class="reaction-btn" style="${dislikeBtnStyle}" onclick="addReaction(${post.id},'dislikes',${post.likes||0},${post.dislikes||0})">👎 <span>${post.dislikes||0}</span></button>
                    <button class="reply-link-btn" onclick="setReplyTarget(${post.id},'${safeUsername}')">Ответить</button>
                </div>
            </div>
            <button class="del-btn" style="display:${isAdminMode?'block':'none'};" onclick="deletePost(${post.id})">удалить</button>
        </div>
    `;
}

function renderRepliesHTML(parentId, repliesMap) {
    const children = repliesMap[parentId];
    if (!children || children.length === 0) return '';
    let html = '';
    children.forEach(child => {
        const nested = renderRepliesHTML(child.id, repliesMap);
        html += `<div class="post reply-post" id="post-${child.id}">${createPostHTML(child)}${nested ? `<div class="replies-container" style="display:block;">${nested}</div>` : ''}</div>`;
    });
    return html;
}

function countAllReplies(parentId, repliesMap) {
    const children = repliesMap[parentId];
    if (!children) return 0;
    let count = children.length;
    children.forEach(c => { count += countAllReplies(c.id, repliesMap); });
    return count;
}

window.toggleReplies = function(btn) {
    const container = btn.nextElementSibling;
    const arrow = btn.querySelector('.replies-arrow');
    const isOpen = container.style.display !== 'none';
    container.style.display = isOpen ? 'none' : 'block';
    arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    arrow.style.transition = 'transform 0.2s ease';
};

async function loadPosts() {
    const container = document.getElementById('postsContainer');
    if (!container) return; 

    const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Ошибка загрузки:', error.message);
        return;
    }

    container.innerHTML = '';
    
    if (isAdminMode) {
        const massDelBtn = document.createElement('button');
        massDelBtn.textContent = 'Удалить выбранные сообщения';
        massDelBtn.style = 'background:#da373c;color:white;border:none;padding:12px 15px;border-radius:5px;font-weight:bold;cursor:pointer;margin-bottom:15px;width:100%;font-size:16px;';
        massDelBtn.onclick = deleteSelectedPosts;
        container.appendChild(massDelBtn);
    }

    const roots = [];
    const repliesMap = {};

    data.forEach(post => {
        if (!post.parent_id) {
            roots.push(post);
        } else {
            if (!repliesMap[post.parent_id]) repliesMap[post.parent_id] = [];
            repliesMap[post.parent_id].push(post);
        }
    });

    roots.reverse();

    roots.forEach(rootPost => {
        const rootDiv = document.createElement('div');
        rootDiv.className = 'post';
        rootDiv.id = `post-${rootPost.id}`;

        const childCount = countAllReplies(rootPost.id, repliesMap);
        const repliesHTML = renderRepliesHTML(rootPost.id, repliesMap);

        let repliesBlock = '';
        if (repliesHTML) {
            repliesBlock = `
                <div class="replies-toggle-wrapper">
                    <button class="replies-toggle-btn" onclick="toggleReplies(this)">
                        <span class="replies-count">Ответы (${childCount})</span>
                        <span class="replies-arrow" style="transition:transform 0.2s ease;">▾</span>
                    </button>
                    <div class="replies-container" style="display:none;">${repliesHTML}</div>
                </div>
            `;
        }

        rootDiv.innerHTML = createPostHTML(rootPost) + repliesBlock;
        container.appendChild(rootDiv);
    });
}

window.addReaction = async function(id, clickedType, currentLikes, currentDislikes) {
    const previousReaction = hasUserReacted(id);
    let newLikes = currentLikes;
    let newDislikes = currentDislikes;
    let nextSavedReaction = clickedType;

    if (previousReaction === clickedType) {
        if (clickedType === 'likes') newLikes = Math.max(0, newLikes - 1);
        if (clickedType === 'dislikes') newDislikes = Math.max(0, newDislikes - 1);
        nextSavedReaction = null; 
    } else if (previousReaction && previousReaction !== clickedType) {
        if (clickedType === 'likes') { newLikes += 1; newDislikes = Math.max(0, newDislikes - 1); }
        else { newDislikes += 1; newLikes = Math.max(0, newLikes - 1); }
    } else {
        if (clickedType === 'likes') newLikes += 1;
        if (clickedType === 'dislikes') newDislikes += 1;
    }

    const { error } = await supabaseClient.from('posts').update({ likes: newLikes, dislikes: newDislikes }).eq('id', id);
    if (error) {
        console.error("Ошибка при обновлении реакции:", error.message);
    } else {
        saveUserReaction(id, nextSavedReaction); 
        loadPosts(); 
    }
};

async function addPost() {
    if (isSending) return; 

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
    if (!text && !attachedMediaBase64) return;

    // FIX: проверяем что родительский пост существует перед вставкой
    if (currentParentId !== null) {
        const { data: parentCheck, error: parentError } = await supabaseClient
            .from('posts')
            .select('id')
            .eq('id', currentParentId)
            .maybeSingle();

        if (parentError || !parentCheck) {
            console.warn('Родительский пост не найден, сбрасываем parent_id');
            cancelReply();
        }
    }

    isSending = true;
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.disabled = true;

    const { error } = await supabaseClient.from('posts').insert([{ 
        text: text,
        username: username,
        avatar: avatar,
        parent_id: currentParentId,
        image: attachedMediaBase64
    }]);

    isSending = false;
    if (sendBtn) sendBtn.disabled = false;

    if (error) {
        // Fallback: если всё равно foreign key error — шлём без parent_id
        if (error.message && error.message.includes('foreign key')) {
            const { error: error2 } = await supabaseClient.from('posts').insert([{ 
                text: text, username: username, avatar: avatar, parent_id: null, image: attachedMediaBase64
            }]);
            if (error2) { alert('Ошибка добавления: ' + error2.message); return; }
        } else {
            alert('Ошибка добавления: ' + error.message);
            return;
        }
    }

    input.value = '';
    clearMediaPreview();
    cancelReply();
    loadPosts();
}

async function deletePostAndReplies(id) {
    const { data: children } = await supabaseClient.from('posts').select('id').eq('parent_id', id);
    if (children && children.length > 0) {
        for (const child of children) {
            await deletePostAndReplies(child.id);
        }
    }
    await supabaseClient.from('posts').delete().eq('id', id);
}

async function deletePost(id) {
    await deletePostAndReplies(id);
    loadPosts();
}

async function deleteSelectedPosts() {
    const checkboxes = document.querySelectorAll('.admin-select-checkbox:checked');
    if (checkboxes.length === 0) { alert("Вы не выбрали сообщения!"); return; }
    if (!confirm(`Удалить выбранные посты и их ветки ответов (${checkboxes.length} шт.)?`)) return;
    const idsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.value));
    for (const id of idsToDelete) {
        await deletePostAndReplies(id);
    }
    loadPosts(); 
}

window.admin = function() {
    const pass = prompt("Пароль модератора:");
    if (pass === ADMIN_PASS) {
        isAdminMode = true; 
        loadPosts(); 
        alert("Режим модератора активирован!");
    } else {
        alert("Неверный пароль!");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.onclick = addPost;
    const postInput = document.getElementById('postInput');
    if (postInput) {
        postInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addPost(); });
    }
    updateProfileUI();
    loadPosts();
});
