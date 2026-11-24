# Tosto на компьютере: веб-версия и приложение (Windows, macOS)

Используется тот же код и тот же Supabase, что и в Android-версии. Отдельно ничего переписывать не нужно.
На экране шире 768 px вместо нижней панели появляется боковая (иконки, а от 1024 px и подписи), чаты идут в две колонки.

## 1. Веб-версия (Netlify, постоянный адрес)

1. Залей проект на GitHub.
2. app.netlify.com → Add new site → Import an existing project → выбери репозиторий. Настройки сборки подхватятся из `netlify.toml`.
3. Site configuration → Environment variables, добавь три переменные (значения те же, что в секретах GitHub):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
4. Deploys → Trigger deploy. Адрес будет вида `https://название.netlify.app`.
5. Supabase → Authentication → URL Configuration → Redirect URLs: добавь `https://название.netlify.app/**`.

Дальше сайт обновляется сам при каждом push. Тот же адрес можно открыть на iPhone (см. IPHONE.md).

## 2. Приложение для компьютера (Electron)

Собирается в GitHub Actions: **Actions → Build Desktop (Windows, macOS) → Run workflow**.
Через 10–15 минут внизу страницы запуска появятся артефакты:
- `tosto-desktop-windows`: `Tosto-Setup-1.N.0.exe`
- `tosto-desktop-macos`: `Tosto-1.N.0-arm64.dmg` (Mac с чипом Apple) и `Tosto-1.N.0-x64.dmg` (Intel)

Секреты те же, что для APK (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`).

### Один раз в Supabase

Authentication → URL Configuration → Redirect URLs → добавь `tosto://auth-callback`.
Без этого после входа через Google приложение не откроется.

### Как проходит вход через Google

Кнопка открывает обычный браузер. После входа Supabase отправляет на `tosto://auth-callback`, система открывает Tosto, и вход завершается.

### Первый запуск без подписи

Подписи кода нет (она платная), поэтому система предупредит:
- **Windows:** «Windows защитил ваш компьютер» → Подробнее → Выполнить в любом случае.
- **macOS:** перетащи Tosto в «Программы». Если пишет, что приложение повреждено, выполни в Терминале:
  `xattr -cr /Applications/Tosto.app`. Или правой кнопкой по приложению → Открыть.

### Что умеет

- Системные уведомления о новых сообщениях, пока окно не в фокусе (включены по умолчанию, выключаются в настройках профиля). Работают, пока приложение запущено.
- Число непрочитанных на значке (macOS) и в заголовке окна/вкладки.
- Enter отправляет, Shift+Enter переносит строку, Esc закрывает окна и страницу профиля.
- Одно окно: повторный запуск открывает уже запущенное.

### Локальный запуск для проверки

```sh
npm install
npm run desktop:dev
```
Нужен файл `.env` с ключами Supabase.

### Чего пока нет

- Уведомлений, когда приложение закрыто (для этого нужен сервер пушей, как для Android).
- Автообновления: новую версию нужно скачать и установить поверх.
- Сборки для Linux: добавляется строкой в `desktop/electron-builder.yml` и в матрицу workflow.
