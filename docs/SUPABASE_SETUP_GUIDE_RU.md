# NeuroSprint: Supabase Setup Guide

## Что уже есть в коде
- `Supabase Auth` клиент подключён во фронтенде.
- Есть маршруты:
  - `/auth/login`
  - `/auth/register`
  - `/auth/forgot-password`
- Подготовлен SQL для схемы аккаунтов и синхронизации:
  - [SUPABASE_ACCOUNTS_SCHEMA.sql](./SUPABASE_ACCOUNTS_SCHEMA.sql)

## Что нужно сделать в Supabase

### 1. Создать проект
- Создайте новый проект в `Supabase`.
- Сохраните:
  - `Project URL`
  - `anon public key`

### 2. Применить SQL-схему
- Откройте `SQL Editor`.
- Выполните SQL из файла:
  - [SUPABASE_ACCOUNTS_SCHEMA.sql](./SUPABASE_ACCOUNTS_SCHEMA.sql)

После этого будут созданы:
- `accounts`
- `training_profiles`
- `sessions`
- `user_mode_profiles`
- `user_preferences`
- `daily_trainings`
- `daily_training_sessions`
- `daily_challenges`
- `daily_challenge_attempts`
- `user_levels`
- `user_achievements`
- `user_skill_achievements`
- `xp_logs`

### 3. Настроить Auth
В `Authentication -> URL Configuration` добавьте:

- `Site URL`
  - локально: `http://localhost:5173`
  - production: ваш production URL

- `Redirect URLs`
  - `http://localhost:5173/auth/forgot-password`
  - `https://<production-domain>/auth/forgot-password`
  - preview URL при необходимости

### 4. Включить Email auth
В `Authentication -> Providers -> Email`:
- включите `Email`
- разрешите `Email + Password`

Для v1:
- подтверждение email можно не делать блокирующим;
- reset password должен работать обязательно.

### 5. Настроить SMTP
До production обязательно подключить реальный SMTP в `Authentication -> SMTP Settings`.

Минимум нужно для:
- восстановления пароля
- подтверждения email

Без SMTP:
- auth-флоу будет неполным;
- reset password в production нельзя считать готовым.

## Что нужно прописать в приложении

### Локально
Создайте `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_ALLOW_PRIVILEGED_PROFILE_ROLES=false
```

### В Vercel
Добавьте те же переменные окружения:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ALLOW_PRIVILEGED_PROFILE_ROLES=false`

Рекомендация:
- добавлять как минимум в `Production` и `Preview`

## Проверка после настройки

### Базовый auth flow
1. Открыть сайт без аккаунта.
2. Создать локальный guest-профиль.
3. Перейти в `/auth/register`.
4. Зарегистрироваться.
5. Вернуться в `/profiles`.
6. Увидеть import banner.
7. Импортировать локальные профили.
8. Проверить, что профиль стал `linked`.

### Logout / relogin flow
1. Выйти из аккаунта.
2. Проверить, что linked-профили показываются как locked.
3. Снова войти.
4. Проверить, что linked-профили снова доступны.

### Password reset flow
1. Открыть `/auth/forgot-password`.
2. Отправить reset email.
3. Перейти по ссылке из письма.
4. Установить новый пароль.

### Second device flow
1. Войти в тот же аккаунт на втором устройстве.
2. Открыть `/profiles`.
3. Проверить, что облачные linked-профили подтянулись в Dexie.
4. Выбрать активный профиль.

## На что смотреть в случае проблем

### Если регистрация не работает
- проверьте `VITE_SUPABASE_URL`
- проверьте `VITE_SUPABASE_ANON_KEY`
- проверьте, что `Email` provider включён

### Если import/sync не работает
- проверьте, что схема из SQL применена полностью
- проверьте `RLS` и политики
- проверьте `Browser Console`
- проверьте `Supabase Logs`

### Если reset password не работает
- проверьте `Redirect URLs`
- проверьте SMTP
- проверьте шаблоны email в `Supabase Auth`

## Что считается готовностью v1
- регистрация работает
- вход/выход работает
- reset password работает
- guest profile импортируется в аккаунт
- linked profile синхронизируется
- linked profile блокируется после logout
- linked profile восстанавливается после login
