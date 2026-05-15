const SUPABASE_URL = 'https://uyjyjkualjybzfckmgdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QADVddyaye_VV4M3JIEQDQ_iE0YF0lH';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CHAT_PREFIX = '[greycat-chat]';
let isSending = false;
let currentParentId = null;
let attachedMediaBase64 = null;

function escapeHTML(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJSString(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function isChatMessage(post) {
    return !!post.text && post.text.startsWith(CHAT_PREFIX);
}

function stripChatPrefix(text) {
    return String(text || '').startsWith(CHAT_PREFIX)
        ? String(text || '').slice(CHAT_PREFIX.length).replace(/^\n/, '')
        : String(text || '');
}

window.loginUser = function() {
    const name = prompt("Введите ваш никнейм для чата:");
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

    const maxOriginalSize = 15 * 1024 * 1024;
    if (file.size > maxOriginalSize) {
        alert("Файл слишком большой! Выберите картинку до 15 МБ.");
        event.target.value = "";
        return;
    }

    const finishPreview = function(dataUrl) {
        attachedMediaBase64 = dataUrl;
        const container = document.getElementById('previewMediaContainer');
        const img = document.getElementById('previewMediaImg');
        if (container && img) {
            img.src = attachedMediaBase64;
            container.style.display = 'block';
        }
    };

    if (file.type.startsWith('image/') && file.type !== 'image/gif' && file.size > 2621440) {
        compressImageFile(file)
            .then(finishPreview)
            .catch(() => {
                alert("Не получилось сжать изображение. Попробуйте другую картинку.");
                event.target.value = "";
            });
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        finishPreview(e.target.result);
    };
    reader.readAsDataURL(file);
};

function compressImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = function(e) {
            const img = new Image();
            img.onerror = reject;
            img.onload = function() {
                const maxSide = 1600;
                const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                let quality = 0.82;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                while (dataUrl.length > 2600000 && quality > 0.45) {
                    quality -= 0.08;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

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
    const input = document.getElementById('chatInput');
    if (input) {
        input.placeholder = `Ваш ответ для ${username}...`;
        input.focus();
    }
};

window.cancelReply = function() {
    currentParentId = null;
    const indicator = document.getElementById('replyIndicator');
    if (indicator) indicator.style.display = 'none';
    const input = document.getElementById('chatInput');
    if (input) input.placeholder = "Напиши сообщение в чат...";
};

function hasUserReacted(postId) {
    const reactedPosts = JSON.parse(localStorage.getItem('chat_reacted_posts') || '{}');
    return reactedPosts[postId] || null;
}

function saveUserReaction(postId, type) {
    const reactedPosts = JSON.parse(localStorage.getItem('chat_reacted_posts') || '{}');
    if (type === null) {
        delete reactedPosts[postId];
    } else {
        reactedPosts[postId] = type;
    }
    localStorage.setItem('chat_reacted_posts', JSON.stringify(reactedPosts));
}

function createMessageHTML(post) {
    const postDate = post.created_at ? new Date(post.created_at) : new Date();
    const formattedDate = postDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const text = escapeHTML(stripChatPrefix(post.text));
    const userReaction = hasUserReacted(post.id);
    const likeBtnStyle = userReaction === 'likes' ? 'border-color:#ff5500;color:#ff5500;background:#2a1a10;' : '';
    const dislikeBtnStyle = userReaction === 'dislikes' ? 'border-color:#e03c3c;color:#e03c3c;background:#2a1010;' : '';
    const imageHTML = post.image ? `<img src="${post.image}" class="chat-attached-image" alt="Прикрепленное медиа">` : '';
    const safeUsername = escapeJSString(post.username || 'Аноним');

    return `
        <div style="display:flex;align-items:flex-start;gap:14px;">
            <img src="${post.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'}" style="width:72px;height:72px;border-radius:50%;background:#111;object-fit:cover;border:2px solid #ff5500;flex-shrink:0;">
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
                    <strong style="color:#fff;font-size:14px;">${escapeHTML(post.username || 'Аноним')}</strong>
                    <span style="color:#555;font-size:11px;">${formattedDate}</span>
                </div>
                <div style="color:#ccc;word-break:break-word;font-size:14px;line-height:1.5;">${text}</div>
                ${imageHTML}
                <div style="display:flex;gap:8px;align-items:center;margin-top:9px;">
                    <button class="reaction-btn" style="${likeBtnStyle}" onclick="addReaction(${post.id},'likes',${post.likes||0},${post.dislikes||0})">👍 <span>${post.likes||0}</span></button>
                    <button class="reaction-btn" style="${dislikeBtnStyle}" onclick="addReaction(${post.id},'dislikes',${post.likes||0},${post.dislikes||0})">👎 <span>${post.dislikes||0}</span></button>
                    <button class="reply-link-btn" onclick="setReplyTarget(${post.id},'${safeUsername}')">Ответить</button>
                </div>
            </div>
        </div>
    `;
}

function renderRepliesHTML(parentId, repliesMap) {
    const children = repliesMap[parentId];
    if (!children || children.length === 0) return '';
    return children.map(child => {
        const nested = renderRepliesHTML(child.id, repliesMap);
        return `<div class="chat-message reply-message" id="chat-${child.id}">${createMessageHTML(child)}${nested ? `<div class="replies-container">${nested}</div>` : ''}</div>`;
    }).join('');
}

async function loadChat() {
    const container = document.getElementById('chatContainer');
    if (!container) return;

    const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Ошибка загрузки чата:', error.message);
        return;
    }

    const chatPosts = (data || []).filter(isChatMessage);
    const ids = new Set(chatPosts.map(post => post.id));
    const roots = [];
    const repliesMap = {};

    chatPosts.forEach(post => {
        if (!post.parent_id || !ids.has(post.parent_id)) {
            roots.push(post);
        } else {
            if (!repliesMap[post.parent_id]) repliesMap[post.parent_id] = [];
            repliesMap[post.parent_id].push(post);
        }
    });

    container.innerHTML = '';
    roots.reverse().forEach(post => {
        const div = document.createElement('div');
        div.className = 'chat-message';
        div.id = `chat-${post.id}`;
        const repliesHTML = renderRepliesHTML(post.id, repliesMap);
        div.innerHTML = createMessageHTML(post) + (repliesHTML ? `<div class="replies-container">${repliesHTML}</div>` : '');
        container.appendChild(div);
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
        if (clickedType === 'likes') {
            newLikes += 1;
            newDislikes = Math.max(0, newDislikes - 1);
        } else {
            newDislikes += 1;
            newLikes = Math.max(0, newLikes - 1);
        }
    } else {
        if (clickedType === 'likes') newLikes += 1;
        if (clickedType === 'dislikes') newDislikes += 1;
    }

    const { error } = await supabaseClient.from('posts').update({ likes: newLikes, dislikes: newDislikes }).eq('id', id);
    if (!error) {
        saveUserReaction(id, nextSavedReaction);
        loadChat();
    }
};

async function addChatMessage() {
    if (isSending) return;

    let username = localStorage.getItem('chat_username');
    let avatar = localStorage.getItem('chat_avatar');
    if (!username) {
        window.loginUser();
        username = localStorage.getItem('chat_username');
        avatar = localStorage.getItem('chat_avatar');
        if (!username) return;
    }

    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text && !attachedMediaBase64) return;

    isSending = true;
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.disabled = true;

    const { error } = await supabaseClient.from('posts').insert([{
        text: `${CHAT_PREFIX}\n${text}`,
        username,
        avatar,
        parent_id: currentParentId,
        image: attachedMediaBase64
    }]);

    isSending = false;
    if (sendBtn) sendBtn.disabled = false;

    if (error) {
        alert('Ошибка отправки сообщения: ' + error.message);
        return;
    }

    input.value = '';
    clearMediaPreview();
    cancelReply();
    loadChat();
}

document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.onclick = addChatMessage;
    const input = document.getElementById('chatInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addChatMessage();
        });
    }
    updateProfileUI();
    loadChat();
});
