# NeuroSprint Execution Status (RU)

## Дата/время
- 2026-02-26 00:11

## Что завершено
- Закрыт этап `v0.5.J`: route-level permission guard + role-aware подсказки.
  - Добавлен `src/app/RequirePermission.tsx` с единым шаблоном отказа в доступе.
  - Роуты `/classes`, `/classes/:classId`, `/stats/group` защищены централизованно через `App.tsx`.
  - Для пользователя показывается причина ограничения: текущая роль + требуемая роль + ссылки на `Профили`/`Настройки`.
  - Добавлен контракт `rolesWithPermission` в `permissions.ts` для прозрачной подсказки требуемых ролей.
  - Добавлены tests: `tests/integration/require-permission.test.tsx`, расширен e2e `tests/e2e/role-policy.spec.ts` (проверки direct URL guard).
- Подтверждён полный регресс: `npm run check:encoding`, `npm test`, `npm run build`, `npm run test:e2e` (9/9).
- Подготовлен dev-релиз `0.5.0-dev.1`: обновлены `package.json`, встроенная `Справка` (release history) и `docs/CHANGELOG_RU.md`.

## Что в работе
- Этап `v0.5.K`: унификация action-level role-checks (hook/helper) и сокращение дублирования в страницах.

## Блокеры
- Технических блокеров нет.

## Следующие 3 шага
1. Вынести повторяющиеся action-level проверки ролей (`Profiles/Settings/StatsIndividual`) в общий хук/утилиту.
2. Заменить локальные `if (!can...)` в страницах на единый helper и сократить дубли сообщений.
3. Прогнать целевой регресс `encoding + unit/integration + e2e` после рефакторинга `v0.5.K`.

## Команды для быстрого старта
```powershell
npm install
npm run dev
npm run check:encoding
npm test
npm run build
npm run test:e2e
```
