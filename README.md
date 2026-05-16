# greycat781

## English

greycat781 is a small community website for a private Discord server. It is hosted with GitHub Pages and uses Supabase for the forum data, boards, posts, replies, admin state, home-page particles, and the Spy game rooms.

### Pages

- `index.html` — home page with the main greycat781 screen and the entry point to the lore archive.
- `lore.html` — detailed server lore in Russian with channel history, memes, participants, mutant galleries, builds, and the "Muddy Swamps" storyline.
- `wall.html` — the forum page. Admins can create, rename, and delete boards. Boards work like separate forum branches.
- `spy.html` — the Spy game page with rooms, custom word packs, roles, timer controls, and voting.
- `memes.html` — old placeholder page kept in the repository, but it is no longer linked as a global tab.

### Project Structure

- `style.css` — shared visual style.
- `script.js` — forum, boards, posts, replies, uploads, admin controls, and shared Supabase logic.
- `spy.js` — multiplayer Spy game logic.
- `assets/lore/` — optimized local images used by the lore page.

### Running Locally

This is a static site, so you can open `index.html` directly in a browser. For a more realistic local test, run any static server in the project folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### Notes

The live version is intended for GitHub Pages. Supabase credentials are used by the frontend scripts, so database security should be controlled through Supabase policies and table rules.

---

## Русский

greycat781 — небольшой сайт локального сообщества Discord-сервера. Сайт хостится через GitHub Pages, а данные форума, бордов, постов, ответов, админки, эффектов на главной странице и комнат игры "Шпион" хранятся в Supabase.

### Страницы

- `index.html` — главная страница с экраном greycat781 и переходом в архив лора.
- `lore.html` — подробный лор сервера на русском: история каналов, мемы, участники, галереи мутантов, билды и сюжет "Мутные болота".
- `wall.html` — форум. Админы могут создавать, переименовывать и удалять борды. Каждый борд работает как отдельная ветка форума.
- `spy.html` — игра "Шпион" с комнатами, кастомными паками слов, ролями, настройкой таймера и голосованием.
- `memes.html` — старая страница-заглушка, оставлена в репозитории, но больше не используется как глобальная вкладка.

### Структура проекта

- `style.css` — общий визуальный стиль сайта.
- `script.js` — форум, борды, посты, ответы, загрузки файлов, админские действия и логика Supabase.
- `spy.js` — логика мультиплеерной игры "Шпион".
- `assets/lore/` — сжатые локальные картинки для страницы лора.

### Локальный запуск

Это статический сайт, поэтому можно просто открыть `index.html` в браузере. Для проверки через локальный сервер можно запустить любой static server из папки проекта:

```bash
python -m http.server 8000
```

После этого открыть:

```text
http://localhost:8000
```

### Заметки

Основной вариант публикации — GitHub Pages. Supabase используется прямо из фронтенда, поэтому безопасность базы нужно настраивать через политики и правила таблиц в Supabase.
