# NeuroSprint Execution Status (RU)

## Дата/время
- 2026-02-26 11:31

## Что завершено
- Закрыт этап `v0.5.J`: route-level permission guard + role-aware подсказки.
  - Добавлен `src/app/RequirePermission.tsx` с единым шаблоном отказа в доступе.
  - Роуты `/classes`, `/classes/:classId`, `/stats/group` защищены централизованно через `App.tsx`.
  - Для пользователя показывается причина ограничения: текущая роль + требуемая роль + ссылки на `Профили`/`Настройки`.
  - Добавлен контракт `rolesWithPermission` в `permissions.ts` для прозрачной подсказки требуемых ролей.
  - Добавлены tests: `tests/integration/require-permission.test.tsx`, расширен e2e `tests/e2e/role-policy.spec.ts` (проверки direct URL guard).
- Подтверждён полный регресс: `npm run check:encoding`, `npm test`, `npm run build`, `npm run test:e2e` (9/9).
- Подготовлен dev-релиз `0.5.0-dev.1`: обновлены `package.json`, встроенная `Справка` (release history) и `docs/CHANGELOG_RU.md`.
- Закрыт этап `v0.5.K`: унификация action-level role-checks (hook/helper).
  - Добавлен общий хук `src/app/useRoleAccess.ts`.
  - Добавлены общие контракты `buildRoleAccess` и `guardAccess` в `src/shared/lib/auth/permissions.ts`.
  - `ProfilesPage`, `SettingsPage`, `StatsIndividualPage` переведены на единый слой прав без изменения ролевой политики.
  - Обновлены unit-проверки `tests/unit/permissions.test.ts` (добавлены тесты `buildRoleAccess` и `guardAccess`).
  - Подтверждён регресс после рефакторинга: `npm run check:encoding`, `npm test`, `npm run build`.

## Что в работе
- Подготовка этапа `v0.5.L`: расширение Sprint Math аналитики на простом экране `/stats` (больше mode-aware сравнений и читаемых сводок).

## Блокеры
- Технических блокеров нет.

## Следующие 3 шага
1. Спроектировать `v0.5.L` метрики/карточки для Sprint Math на `/stats` без перегруза UI.
2. Реализовать mode-aware блоки на `/stats` с акцентом на сравнение подрежимов `Add-Sub` и `Mixed`.
3. Прогнать полный регресс `npm run check:encoding`, `npm test`, `npm run build`, `npm run test:e2e`.

## Команды для быстрого старта
```powershell
npm install
npm run dev
npm run check:encoding
npm test
npm run build
npm run test:e2e
```
