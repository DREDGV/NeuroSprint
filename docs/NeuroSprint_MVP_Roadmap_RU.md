# NeuroSprint MVP Roadmap (RU)

## Scope (In/Out)
### In scope
- Профили пользователей на одном устройстве.
- Активный пользователь в `localStorage` (`ns.activeUserId`).
- Модуль Таблица Шульте: `Classic` и `Timed`.
- Сохранение сессий в `IndexedDB` (Dexie).
- Статистика по дням (`localDate` в формате `YYYY-MM-DD`).
- PWA-конфигурация (manifest + SW auto-update).
- Минималистичный детский UX с крупной сеткой и видимыми метриками.

### Out of scope
- Любая серверная часть, облачная синхронизация, аккаунты.
- Режим класса, CSV, панель учителя.
- Дополнительные когнитивные модули (N-back, Sprint Math и т.д.).

## Architecture Baseline
- Frontend: `React + TypeScript + Vite`.
- Routing: `react-router-dom`.
- Data layer: `Dexie` (IndexedDB), таблицы `users`, `sessions`.
- Charts: `Recharts`.
- PWA: `vite-plugin-pwa`.
- Testing baseline: `Vitest`, `Testing Library`, `Playwright`.
- Структура: `app/pages/entities/features/shared/widgets`.

## Milestones
| Milestone | Scope | Status | Notes |
|---|---|---|---|
| M0 Bootstrap | Vite/React/TS, роутинг, PWA plugin, базовый shell | Done | Каркас и стили готовы |
| M1 Data Layer + Profiles | Dexie schema, репозитории, CRUD профилей, active user | Done | Реализованы user/session repositories |
| M2 Schulte Classic | 5x5 grid, последовательность 1..25, таймер, errors, save session | Done | Сохранение и score включены |
| M3 Schulte Timed | 30/60/90, nextSpawn, метрики timed, save session | Done | Штраф ошибок configurable |
| M4 Stats | Daily aggregation Classic/Timed, графики, empty states | Done | Группировка по `localDate` |
| M5 UX Hardening | Крупные кнопки, видимые метрики, устойчивые empty/error states | Done | Unit/integration/e2e smoke подтверждены |
| M6 PWA Hardening | Проверка install/offline, SW поведение, иконки | In progress | Build/PWA generation подтверждены, нужен Android offline install smoke |

## Interfaces & Contracts
### Routes
- `/`
- `/profiles`
- `/play/schulte/classic`
- `/play/schulte/timed`
- `/stats`
- `/settings`

### localStorage keys
- `ns.activeUserId`
- `ns.settings`

### Domain types
- `Mode = "classic" | "timed"`
- `User`
- `Difficulty`
- `Session`
- `ClassicDailyPoint`
- `TimedDailyPoint`
- `AppSettings`

### Repository contracts
- `userRepository.create(name): Promise<User>`
- `userRepository.list(): Promise<User[]>`
- `userRepository.rename(id, name): Promise<void>`
- `userRepository.remove(id): Promise<void>`
- `sessionRepository.save(session): Promise<void>`
- `sessionRepository.listByUser(userId): Promise<Session[]>`
- `sessionRepository.listByUserMode(userId, mode): Promise<Session[]>`
- `sessionRepository.aggregateDailyClassic(userId): Promise<ClassicDailyPoint[]>`
- `sessionRepository.aggregateDailyTimed(userId): Promise<TimedDailyPoint[]>`

### Scoring contracts
- `clampAccuracy(value): number`
- `calcClassicMetrics(input): ClassicMetrics`
- `calcTimedMetrics(input): TimedMetrics`
- `toLocalDateKey(input): string`

## Test Matrix
### Unit
- `tests/unit/scoring.test.ts`
- `tests/unit/grid.test.ts`
- `tests/unit/session-aggregation.test.ts`

### Integration
- `tests/integration/schulte-grid.test.tsx`

### E2E smoke
- `tests/e2e/smoke.spec.ts`

### Planned additions
- Integration tests для `ProfilesPage` и route guard.
- E2E smoke для offline-проверки после прогрева PWA.

## Execution Log
- 2026-02-23:
  - Инициализирован проектный каркас и конфиги.
  - Добавлены типы, утилиты формул, генератор сетки.
  - Реализованы `Classic` и `Timed` страницы с сохранением результатов.
  - Реализованы профили, выбор активного пользователя, route guard.
  - Реализована статистика с агрегацией по дням и графиками.
  - Добавлены дорожная карта и статусный документ для восстановления контекста.
  - Исправлены ошибки сборки TypeScript (`virtual:pwa-register`, test config typing).
  - Подтверждены `npm run build`, `npm test`, `npm run test:e2e`.
  - E2E переведены на системный `msedge`, чтобы не зависеть от `playwright install`.
  - Добавлен route-based code splitting, предупреждение о большом чанке устранено.

## Risks & Decisions
### Decisions
- `localDate` хранится в `Session` при записи для стабильной дневной агрегации.
- В `Timed` score рассчитывается через `max(0, speed)`.
- Ошибки не блокируют ввод в обоих режимах.

### Risks
- В текущем окружении npm работает в `only-if-cached`, зависимости не устанавливаются.
- Глобальные proxy env-переменные в окружении могут ломать `npm install`.
- Для PWA все еще нужна ручная проверка install/offline на Android.

## Next Session Start
1. Выполнить ручной Android smoke-check: install PWA и запуск офлайн.
2. Зафиксировать результат в `Execution Log` и закрыть M6 при успехе.
3. Опционально разбить главный чанк (route-based code splitting).
