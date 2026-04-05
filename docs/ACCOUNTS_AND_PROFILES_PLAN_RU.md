# NeuroSprint: Accounts & Profiles v1 Plan

## Summary
- Строим профессиональную систему аккаунтов не вместо текущих локальных профилей, а поверх них.
- Первый релиз решает публичный user flow для индивидуального пользователя: `регистрация`, `вход`, `выход`, `восстановление пароля`, `страница аккаунта`, `синхронизация локального прогресса`.
- Текущая local-first архитектура на `Dexie` сохраняется как основа UX: безлогинный режим остаётся, но становится осознанным `гостевым режимом`.
- Для auth и облачной синхронизации используем `Supabase Auth + Postgres`, без самодельного JWT-backend в v1.
- `Классы`, `Соревнования`, `Школы`, `OAuth`, публичные teacher/admin-флоу и compliance для детей не входят в первый релиз.

## Product Model
- Разделить две сущности:
  - `Account` — интернет-аккаунт пользователя сайта.
  - `TrainingProfile` — текущий тренировочный профиль внутри NeuroSprint.
- Один `Account` владеет несколькими `TrainingProfile`.
- Публичный пользователь после регистрации получает обычный аккаунт и может:
  - продолжить с локальными профилями,
  - импортировать их в аккаунт,
  - создать новые профили уже внутри аккаунта.
- Текущие роли `teacher`, `student`, `home`, `admin` сохраняются как внутренние роли тренировочного профиля, а не как роли auth-системы.
- В self-service сценарии новые профили не могут получать `teacher` или `admin`; публичный дефолт — `home`.
- `guest mode` остаётся доступным: пользователь может тренироваться без регистрации, но его данные живут только локально, пока он не привяжет их к аккаунту.

## Implementation Changes
### 1. Auth and Cloud Foundation
- Добавить Supabase client и env-конфигурацию для `Vite`.
- Ввести `AuthContext` c `session`, `account`, `isAuthenticated`, `isLoading`, `login`, `register`, `logout`, `requestPasswordReset`.
- Добавить публичные маршруты:
  - `/auth/login`
  - `/auth/register`
  - `/auth/forgot-password`
- Регистрация по `email + password` без блокирующего подтверждения email в v1.
- Password reset обязателен уже в первом релизе.
- Перед продом подключить рабочий SMTP для писем восстановления и подтверждения.

### 2. Account/Profile Data Model
- Текущий локальный `User` трактовать как `TrainingProfile`.
- В локальную доменную модель профиля добавить поля:
  - `accountId?`
  - `remoteId?`
  - `ownershipKind: "guest" | "linked"`
  - `syncState: "local" | "pending" | "synced" | "error"`
  - `lastSyncedAt?`
  - `avatarEmoji`
- В облачной БД завести таблицы:
  - `accounts` или профиль аккаунта поверх `auth.users`
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
- Все cloud-таблицы строить вокруг `account_id` и `training_profile_id`.
- Доступ ограничить через `RLS` по владельцу аккаунта.

### 3. Profiles UX
- Страница `/profiles` становится объединённым центром:
  - сверху блок `Аккаунт и синхронизация`,
  - ниже текущий менеджер тренировочных профилей.
- В account-блоке показать:
  - signed in / signed out state,
  - email аккаунта,
  - sync status,
  - CTA `Войти`, `Зарегистрироваться`, `Выйти`,
  - CTA `Импортировать локальные профили`, если импорт ещё не сделан.
- Текущая логика `RequireActiveUser` остаётся, но означает только наличие активного тренировочного профиля, а не наличие интернет-аккаунта.
- Если пользователь вышел из аккаунта:
  - guest-профили остаются доступны;
  - linked-профили показываются в списке, но открываются как locked и требуют входа.
- Внутри `ProfilesPage` скрыть self-service редактирование ролей `teacher/admin` для публичного релиза.

### 4. Local Import and Sync
- После первой регистрации или входа показывать import wizard, если в Dexie есть локальные guest-профили.
- Дефолтный сценарий мастера:
  - найти все локальные профили,
  - предложить `Импортировать все`,
  - показать краткое объяснение, что будет перенесено.
- Импорт переносит:
  - профили,
  - историю сессий,
  - mode profiles,
  - user preferences,
  - progress/achievements/xp,
  - daily training / daily challenges.
- После успешного импорта локальные записи помечаются как `linked + synced`, а не удаляются.
- Для linked-профилей сохраняется offline-first работа:
  - новые локальные изменения пишутся в Dexie,
  - получают `pending`,
  - потом доотправляются в облако.
- Cloud становится источником истины для linked-профилей; v1 не делает сложный ручной merge-конфликтов.

### 5. Public Entry Flow
- На главной странице добавить два явных сценария:
  - `Продолжить локально`
  - `Создать аккаунт / Войти`
- После регистрации пользователь попадает не сразу в тренажёры, а в `/profiles`, где:
  - видит статус аккаунта,
  - видит найденные локальные профили,
  - импортирует их или создаёт новый профиль.
- После входа на новом устройстве приложение:
  - подтягивает облачные профили,
  - предлагает выбрать активный профиль,
  - затем открывает тренировочные разделы.

### 6. Analytics and Product Signals
- Добавить analytics-события:
  - `account_registered`
  - `login_succeeded`
  - `logout_succeeded`
  - `password_reset_requested`
  - `local_profiles_imported`
  - `sync_completed`
  - `sync_failed`
- Сохранить текущие product events по профилям и тренировкам.
- Отдельно отслеживать воронку:
  - `guest_started`
  - `account_created`
  - `import_started`
  - `import_completed`
  - `first_training_after_signup`

## Delivery Sequence
1. Подготовить архитектурную базу auth:
   - Supabase client,
   - env variables,
   - `AuthContext`,
   - public auth routes.
2. Перестроить `/profiles` в combined page:
   - account status,
   - sync section,
   - текущий список профилей.
3. Ввести account-linked profile model в локальных типах и Dexie.
4. Реализовать import wizard для локальных профилей после входа/регистрации.
5. Реализовать cloud sync для linked-профилей.
6. Довести logout / locked profile behavior.
7. Подключить password reset и production email flow.
8. Добавить analytics и release hardening.

## Test Plan
- Пользователь без аккаунта может создать guest-профиль и пройти тренировку.
- Регистрация создаёт аккаунт и сразу авторизует пользователя.
- После регистрации приложение находит локальные guest-профили и предлагает импорт.
- Импорт всех локальных профилей переносит профили, историю и прогресс без дублей.
- После logout guest-профили остаются доступны, linked-профили блокируются до входа.
- Login на новом устройстве восстанавливает облачные профили и позволяет выбрать активный.
- Password reset работает без утечки информации о наличии email.
- Self-service пользователь не может публично назначить профиль `teacher/admin`.
- Offline тренировка linked-профиля создаёт `pending`-данные, которые синхронизируются после возврата сети.
- Existing routes `/training`, `/stats`, `/settings` продолжают работать через активный профиль.
- Feature-flag разделы `classes` и `competitions` не ломаются и не раскрываются наружу новым auth-flow.

## Assumptions
- В v1 целевая аудитория — индивидуальные пользователи; школьные и детские compliance-сценарии откладываются.
- Подтверждение email не блокирует первый вход.
- `Supabase` утверждён как managed auth/database stack.
- Публичный релиз не включает `OAuth`, `Schools`, `Admin Panel`, публичный teacher onboarding и cloud-классы.
- Документ для реализации хранится как `docs/ACCOUNTS_AND_PROFILES_PLAN_RU.md`.
