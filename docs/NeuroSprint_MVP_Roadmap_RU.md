# NeuroSprint MVP Roadmap (RU)

## Scope
### In scope (MVP)
- Профили пользователей на одном устройстве.
- Активный пользователь в `localStorage` (`ns.activeUserId`).
- Таблица Шульте: `Classic`, `Timed`, `Reverse`.
- Сохранение сессий в IndexedDB (Dexie).
- Статистика по дням (`localDate` в формате `YYYY-MM-DD`).
- PWA (installable/offline).
- Детский, понятный интерфейс с крупными интерактивными элементами.

### Out of scope
- Backend/облако/аккаунты.
- Синхронизация между устройствами.
- Именной публичный leaderboard.

## Architecture Baseline
- Frontend: `React + TypeScript + Vite`.
- Routing: `react-router-dom`.
- Data layer: `Dexie` (`users`, `sessions`, `userModeProfiles`, `classGroups`, `groupMembers`).
- Charts: `Recharts`.
- PWA: `vite-plugin-pwa`.
- Tests: `Vitest`, `Testing Library`, `Playwright`.

## Milestones
| Milestone | Содержание | Статус | Факт |
|---|---|---|---|
| M0 | Bootstrap + базовый shell | Done | Завершено |
| M1 | Data layer + профили | Done | Завершено |
| M2 | Schulte Classic | Done | Завершено |
| M3 | Schulte Timed | Done | Завершено |
| M4 | Stats (daily) | Done | Завершено |
| M5 | UX hardening | Done | Завершено |
| M6 | PWA hardening | Done | Завершено на уровне desktop/PWA smoke |
| v0.2.A | IA/маршруты/TrainingHub + setup | Done | Завершено |
| v0.2.B | 3 режима Шульте + unified start | Done | Завершено |
| v0.2.C | Адаптация + индивидуальная статистика v2 | Done | Завершено |
| v0.3.A | Группы + групповая аналитика | Done | Добавлены fixture-данные 30+, сравнения `user/group/global`, integration/e2e контур и регрессионная проверка |
| v0.3.B | Hardening + performance | In progress | Оптимизация выборок групповой аналитики через compound-index и фильтрацию по `localDate` |

## Interfaces & Contracts
### Routes
- `/`
- `/training`
- `/training/schulte`
- `/training/schulte/:mode`
- `/stats/individual`
- `/stats/group`
- `/profiles`
- `/settings`

### localStorage keys
- `ns.activeUserId`
- `ns.settings`
- `ns.trainingSetups`

### Domain contracts (актуально)
- `Mode = "classic" | "timed" | "reverse"`
- `Session` расширен полями `moduleId`, `modeId`, `level`, `presetId`, `adaptiveSource`.
- Добавлены `UserModeProfile`, `AdaptiveDecision`, `ClassGroup`, `GroupMember`.

### Repository contracts
- `userRepository.create/list/rename/remove`
- `sessionRepository.save/listByUser/listByUserMode/aggregateDailyClassic/aggregateDailyTimed`
- `sessionRepository.getModeMetricSnapshot(modeId, metric, period)`
- `trainingRepository.getUserModeProfile/saveUserModeProfile/listRecentSessionsByMode/evaluateAdaptiveLevel`
- `groupRepository.createGroup/listGroups/listGroupsForUser/addMember/removeMember/aggregateGroupStats/getUserPercentileInGroup`

## Test Matrix
### Unit
- scoring, grid generation, session aggregation
- presets, adaptive rules, percentile

### Integration
- training hub
- pwa status bar
- schulte grid behavior
- stats individual comparison block
- stats group comparison block

### E2E smoke
- first run: profile -> classic -> stats
- timed mode finish and metrics
- fixture generation -> individual/group comparison blocks

## Execution Log
- 2026-02-23: Реализован MVP с профилями, Classic/Timed, статистикой, PWA и тестами.
- 2026-02-24: Реализованы v0.2 изменения: новая IA, TrainingHub, setup-панель, `Classic+`, `Timed+`, `Reverse`, адаптивные профили, расширенная статистика, миграции Dexie v2/v3, новые unit/integration/e2e проверки.
- 2026-02-24: Улучшена групповая аналитика v0.3.A: расширенные фильтры периода (7/14/30/90/all), гистограмма распределения уровней, исправлен расчет перцентиля с учетом `modeId`, добавлены unit-тесты на распределение уровней.
- 2026-02-24: Добавлено отображение версии в шапке приложения и расширены сравнения статистики: на индивидуальном экране `пользователь/группа/все`, на групповом экране `группа/другая группа/все`.
- 2026-02-24: Добавлен fixture-генератор `30+` в `Настройки` (2 группы, 30 учеников, 14 дней сессий), обновлен тестовый контур (integration + e2e) и подтвержден полный регресс (`npm test`, `npm run build`, `npm run test:e2e`).
- 2026-02-24: Старт `v0.3.B`: ускорены агрегации групповой аналитики (загрузка сессий по `[userId+moduleId+modeId]` вместо общего сканирования по режиму, фильтрация периода по `localDate`), подтверждены `build` и `test`.

## Risks & Decisions
### Decisions
- Данные остаются локальными (offline-first), без backend.
- Legacy-маршруты сохраняются через редиректы.
- Legacy-сессии мигрируются с дефолтными значениями полей v0.2.

### Risks
- Большие локальные выборки (класс 30+) требуют контроля производительности агрегаций.
- Необходима ручная проверка Android install/offline на реальных устройствах.

## Next Session Start
1. Провести UX-polish для экранов статистики на мобильной ширине и длинных списках групп.
2. Подготовить release-notes и зафиксировать `alpha-v0.3.0`.
3. Продолжить `v0.3.B`: замеры и дополнительная оптимизация агрегаций на длинных периодах.
