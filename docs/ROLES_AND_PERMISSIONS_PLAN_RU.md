# NeuroSprint: Пошаговый план внедрения системы прав

## Кратко
Сейчас в проекте уже есть локальная модель прав, но она не является полноценной системой доступа: `teacher | student | home | admin` хранятся как `AppRole` у тренировочного профиля, переключаются через клиент и используются для route-level guard'ов и скрытия UI. Для устойчивой системы прав это нужно разделить на три независимых слоя:

- `product role` профиля: `teacher | student | home`
- `site role` аккаунта: `user | moderator | admin`
- `feature flags`: скрытие незавершённых разделов и alpha-функций

Для первой рабочей версии берётся путь `Foundation Only`: сначала вводятся server-backed роли и проверки, не строя сразу полную админку. Учитель получает права только над своими классами и учениками. Скрытые разделы остаются на `hybrid flags`: текущие локальные preview overrides сохраняются, но production-видимость начинает опираться на server-backed rules.

## Ключевые изменения

### 1. Зафиксировать целевую модель прав
- Не удалять текущий `AppRole` сразу. На первом этапе он остаётся ролью тренировочного профиля, потому что на нём уже завязаны `profiles`, `classes`, `stats`, `settings` и alpha-разделы.
- Ввести новый тип `SiteRole = "user" | "moderator" | "admin"` на уровне аккаунта.
- Считать `teacher` не сайто-админом. Учитель — это продуктовая роль активного профиля, а не глобальная роль платформы.
- Убрать из новой модели `admin` как self-service роль профиля. `admin` дальше живёт только как `site role`.
- Зафиксировать правило:
  - `site role` управляет платформой и модерацией
  - `profile role` управляет тем, как пользователь работает внутри продукта
  - `feature flags` управляют видимостью незавершённых функций

### 2. Добавить server-backed слой прав
- В Supabase добавить таблицу `account_access`:
  - `account_id uuid primary key references auth.users(id) on delete cascade`
  - `site_role text not null check (site_role in ('user','moderator','admin')) default 'user'`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Для существующих аккаунтов сделать backfill: всем `site_role = 'user'`.
- Основному аккаунту вручную назначить `site_role = 'admin'` через SQL или dashboard. Никакого self-service UI для этого не делать.
- В `AuthContext` добавить загрузку server claims:
  - `siteRole`
  - `isSiteAdmin`
  - `isModerator`
- На первом этапе не использовать JWT custom claims. Чтение `account_access` делать обычным запросом после аутентификации, чтобы не усложнять rollout.
- Все чувствительные действия, которые не должны зависеть от клиента, переводить на server-side проверки через API/edge path. Клиентское скрытие оставить как UX-слой, но не как единственную защиту.

### 3. Сохранить текущий `AppRole`, но сузить его ответственность
- Не переименовывать `AppRole` на первом этапе, чтобы не сломать текущие страницы.
- Зафиксировать смысл `AppRole`:
  - `teacher`, `student`, `home` — допустимые продуктовые роли профиля
  - `admin` — legacy-роль, больше не используется как целевая для новых сценариев
- Публичный self-service выбора ролей оставить только для `home | student`.
- Переключение в `teacher` разрешать только:
  - через dev/alpha-инструменты
  - или через отдельный админский/внутренний сценарий позже
- Переключение `site role` из клиента полностью запретить. Никаких `Settings -> role` для платформенных прав.

### 4. Ввести teacher scope как управление только своими сущностями
- Учитель должен управлять только своими классами, учениками и связанными назначениями.
- Для текущего локального alpha-контура `classes` расширить модель `ClassGroup`:
  - `ownerProfileId: string`
  - `ownerAccountId?: string`
- Новые классы создавать с `ownerProfileId = activeUserId` и, если есть аккаунт, `ownerAccountId = auth.account.id`.
- Право учителя на действия в классе определяется как:
  - активный профиль имеет `AppRole = 'teacher'`
  - и выбранный класс принадлежит этому профилю или аккаунту
- Сценарии teacher scope:
  - создавать свой класс
  - переименовывать свой класс
  - удалять свой класс
  - добавлять и исключать учеников в своём классе
  - запускать свои teacher-only alpha-сценарии
- Учитель не должен:
  - видеть или редактировать чужие классы
  - модерировать идеи и отзывы
  - управлять платформой
- `moderator` и `admin` могут обходить teacher scope только для служебных разделов, но не через текущие client-only guards, а через отдельные server-backed admin routes в следующих фазах.

### 5. Перестроить permissions-слой без резкого переписывания
- Текущий `src/shared/lib/auth/permissions.ts` оставить, но считать его profile capability map, а не общей системой прав.
- Ввести новый helper-слой поверх него:
  - `canUseTeacherArea(activeProfileRole, teacherScope)`
  - `canUseAdminArea(siteRole)`
  - `canModerateIdeas(siteRole)`
  - `canReviewFeedback(siteRole)`
- `RequirePermission` не удалять сразу. На первом этапе:
  - для текущих разделов он продолжает работать как client-side UX guard
  - для новых чувствительных сценариев использовать новые helper'ы и server-side checks
- `SettingsPage` перестроить так:
  - device/app settings остаются
  - dev mode и local feature overrides остаются только для внутреннего использования
  - переключение product role в публичном UI ограничить
  - переключение `site role` убрать полностью

### 6. Сделать hybrid feature flags
- Не выбрасывать текущий `src/shared/lib/online/featureFlags.ts`. Он нужен для preview/dev overrides.
- В production добавить server-backed таблицу `feature_flags`:
  - `key text primary key`
  - `enabled boolean not null default false`
  - `description text not null`
  - `updated_at timestamptz not null default now()`
- Не делать audience rules в БД на первом этапе. Аудиторию зафиксировать в коде, чтобы не плодить лишнюю систему.
- Жёстко зафиксировать правила видимости:
  - `classes_ui` виден только если flag enabled и активный профиль — `teacher` или `siteRole in ('moderator','admin')`
  - `competitions_ui` — те же правила
  - `group_stats_ui` — те же правила
  - `online_competitions` — только если flag enabled и `siteRole = 'admin'`
- Локальные overrides через `localStorage` и dev mode оставить, но:
  - использовать только в preview/dev
  - не считать источником production-прав
- Все скрытые разделы в разработке должны открываться по формуле:
  - `server flag enabled`
  - `audience rule passed`
  - `optional local preview override` только для внутреннего теста

## Пошаговая реализация

### Этап 1. Подготовка и стабилизация текущей модели
- Зафиксировать в документации, что `AppRole` = продуктовая роль профиля, а не права сайта.
- Убрать из планов и UI формулировки, которые трактуют `teacher/admin` как роли auth-системы.
- В `SettingsPage` выключить любую видимость глобального управления правами сайта.
- Проверить все места, где `admin` участвует как профильная роль, и перевести их в статус legacy/внутреннего режима.

### Этап 2. Добавить `site role` в Supabase
- Создать миграцию `account_access`.
- Написать SQL для backfill существующих аккаунтов.
- Назначить основному аккаунту `admin`.
- Добавить загрузку `site role` в auth-layer и общий runtime state.
- При ошибке чтения `account_access` использовать безопасный fallback: `siteRole = 'user'`.

### Этап 3. Ввести новый слой проверок
- Добавить server/client helpers:
  - проверка `site role`
  - проверка teacher scope
  - проверка доступа к alpha-функциям
- Оставить текущий `permissions.ts` только для product-profile capabilities.
- Все новые права в коде строить уже на комбинации:
  - `activeProfileRole`
  - `siteRole`
  - `featureFlag`
  - `teacherScope`

### Этап 4. Ограничить teacher scope
- Расширить `ClassGroup` ownership-полями.
- При создании класса записывать владельца.
- В `ClassesPage` и связанных репозиториях фильтровать список классов по владению.
- Все destructive/manage actions в teacher UI привязать к ownership-check.
- Поведение администратора на этом этапе:
  - не вмешиваться в текущий teacher UI
  - отдельные admin-страницы пока не строить
  - foundation only значит сначала права и проверки, а не панель

### Этап 5. Свести feature flags и роли
- Перевести production feature visibility на server-backed `feature_flags`.
- Оставить local overrides только как preview/dev инструмент.
- Убедиться, что скрытые alpha-разделы не открываются обычному `user` даже если он знает URL.
- Для route-level guards использовать комбинацию:
  - `flag`
  - `siteRole`
  - `activeProfileRole`
  - `teacherScope`

### Этап 6. Подготовить следующий этап, но не реализовывать его в том же PR
- Следующий этап после foundation:
  - `/admin/ideas`
  - `/admin/feedback`
  - moderator workflow
- В этот же этап не включать:
  - полную админку сайта
  - data-driven permission matrix на все сущности
  - перенос всех feature flags в сложную БД-аудиторию
  - JWT custom claims refresh pipeline

## Изменения в интерфейсах, типах и данных
- Новый тип: `SiteRole = "user" | "moderator" | "admin"`
- Текущий `AppRole` остаётся как продуктовая роль профиля
- Новый server-backed runtime state в auth-layer:
  - `siteRole`
  - `isModerator`
  - `isAdmin`
- Расширение `ClassGroup`:
  - `ownerProfileId`
  - `ownerAccountId?`
- Новая таблица Supabase:
  - `account_access`
- Новая таблица Supabase:
  - `feature_flags`
- Новые helper-интерфейсы:
  - `canUseTeacherArea(...)`
  - `canUseAdminArea(...)`
  - `canModerateIdeas(...)`
  - `canReviewFeedback(...)`
  - `canAccessFeature(flag, context)`

## Тестовые сценарии
- Обычный вошедший пользователь:
  - не видит admin-only и teacher-only разделы
  - не может открыть скрытые alpha routes только знанием URL
- Учитель:
  - видит только свои классы
  - может управлять только своими учениками
  - не может открыть модерацию идей и отзывов
- Админ:
  - получает `siteRole = admin`
  - может видеть admin-only разделы после их появления
  - не зависит от `AppRole = admin`
- Feature flags:
  - выключенный flag скрывает раздел даже при подходящей роли
  - включённый flag без подходящей роли не открывает раздел
  - local preview override влияет только на preview/dev и не заменяет server rule
- Backward compatibility:
  - текущие `profiles`, `training`, `stats`, `settings` не ломаются
  - auth/profile flow не зависит от новой role system
  - старые локальные профили продолжают работать
- Security/consistency:
  - `site role` нельзя сменить из клиента
  - teacher не получает прав moderation/admin
  - обычный `user` не может эмулировать `teacher/admin` только через `localStorage`

## Допущения и выбранные решения
- Первая версия прав = `Foundation Only`, без полноценной админки.
- Учитель управляет только своими классами и учениками.
- Текущие local feature overrides сохраняются, но production visibility опирается на server-backed flags и кодовые audience rules.
- `AppRole` на первом этапе не переименовывается и не удаляется, чтобы не сломать проект.
- `moderator` закладывается в модель сразу, но UI для него можно отложить до второй фазы.
- `admin` становится только `site role`; self-service profile admin остаётся legacy и выводится из публичного сценария.
