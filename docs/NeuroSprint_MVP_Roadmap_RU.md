# NeuroSprint MVP Roadmap (RU)

## Scope
### In scope (MVP + v0.4)
- Профили пользователей на одном устройстве.
- Активный пользователь в `localStorage` (`ns.activeUserId`).
- Шульте: `Classic+`, `Timed+`, `Reverse`.
- Цветовые темы Шульте и advanced-настройка цветов.
- Адаптивная сложность с ручным override (уровни 1..10, старт с 3x3).
- Ручное управление классами и учениками (включая массовое добавление списком).
- Сессии и статистика в IndexedDB (Dexie), сравнения `user/group/global`.
- Звук (start/end по умолчанию + опциональные click/correct/error).
- PWA (installable/offline) и тестовый контур `unit + integration + e2e`.

### Out of scope
- Backend/облако/аккаунты.
- Синхронизация между устройствами.
- APK-native сборка.
- Новые тренировочные модули вне Шульте (перенос в v0.5).

## Architecture Baseline
- Frontend: `React + TypeScript + Vite`.
- Routing: `react-router-dom`.
- Data layer: `Dexie` (`users`, `sessions`, `userModeProfiles`, `classGroups`, `groupMembers`, `userPreferences`).
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
| M6 | PWA hardening | Done | Завершено |
| v0.2.A | IA/маршруты/TrainingHub + setup | Done | Завершено |
| v0.2.B | 3 режима Шульте + unified start | Done | Завершено |
| v0.2.C | Адаптация + индивидуальная статистика v2 | Done | Завершено |
| v0.3.A | Группы + групповая аналитика | Done | Завершено |
| v0.3.B | Hardening + performance + benchmark | Done | Завершено |
| v0.4.A | Visual+: темы и advanced-цвета Шульте | Done | Реализованы темы `Ч/Б`, `Контраст`, `Мягкая`, `Радуга` + custom colors |
| v0.4.B | Уровни и прогрессия `3x3 -> 6x6` | Done | Лестница уровней обновлена, адаптация и override сохранены |
| v0.4.C | Классы (ручное управление) | Done | Добавлен раздел `Классы`, CRUD классов, создание/перенос учеников, bulk-add |
| v0.4.D | Звук + dev-mode UX | Done | Start/end default on, click/correct/error toggles, mute/volume, dev-tools скрыты при `devMode=false` |
| v0.4.E | Hardening + регресс | Done | Пройдено: `npm test`, `npm run build`, `npm run test:e2e` |

## Interfaces & Contracts
### Routes
- `/`
- `/training`
- `/training/schulte`
- `/training/schulte/:mode`
- `/stats/individual`
- `/stats/group`
- `/classes`
- `/classes/:classId`
- `/profiles`
- `/settings`

### localStorage keys
- `ns.activeUserId`
- `ns.settings`
- `ns.trainingSetups`
- `ns.audioSettings`
- `ns.devMode`

### Domain contracts (актуально)
- `Mode = "classic" | "timed" | "reverse"`
- `GridSize = 3 | 4 | 5 | 6`
- `Session` расширен полями `moduleId`, `modeId`, `level`, `presetId`, `adaptiveSource`, `visualThemeId`, `audioEnabledSnapshot`.
- Добавлены `UserModeProfile`, `AdaptiveDecision`, `ClassGroup`, `GroupMember`, `UserPreference`, `SchulteThemeConfig`, `AudioSettings`.

### Repository contracts
- `userRepository.create/list/rename/remove`
- `sessionRepository.save/listByUser/listByUserMode/aggregateDailyClassic/aggregateDailyTimed/getModeMetricSnapshot`
- `trainingRepository.getUserModeProfile/saveUserModeProfile/listRecentSessionsByMode/evaluateAdaptiveLevel`
- `groupRepository.createGroup/listGroups/renameGroup/removeGroup/createStudent/assignStudent/listStudents/removeMember/aggregateGroupStats/getUserPercentileInGroup`
- `preferenceRepository.getOrCreate/saveSchulteTheme/saveAudioSettings`

## Test Matrix
### Unit
- scoring formulas (classic/timed) и edge-cases.
- grid generation.
- presets + level ladder (включая 3x3).
- adaptive rules (+1/0/-1).
- percentile/group helpers.
- theme resolver + audio settings merge.

### Integration
- training hub.
- classes page (class + student flows).
- settings dev-mode visibility.
- stats comparison blocks (individual/group).
- schulte grid behavior.

### E2E smoke
- profile -> classic -> stats.
- timed mode finish and metrics.
- classes: create class + bulk students.
- rainbow 3x3 session flow.
- settings: fixture generation + benchmark + comparison views.

## Execution Log
- 2026-02-23: Реализован MVP (M0-M6).
- 2026-02-24: Выполнены v0.2 (IA, 3 режима Шульте, setup, адаптация, расширенная статистика).
- 2026-02-24: Выполнены v0.3 (групповая аналитика, сравнения, fixture, benchmark, оптимизации индексов).
- 2026-02-24: Выполнен v0.4.A: добавлены темы Шульте и advanced-настройка цветов.
- 2026-02-24: Выполнен v0.4.B: прогрессия сложности со стартом 3x3 и актуализированным level ladder.
- 2026-02-24: Выполнен v0.4.C: добавлен раздел `Классы`, ручной поток управления составом, перенос ученика, массовое добавление.
- 2026-02-24: Выполнен v0.4.D: добавлены audio-настройки и аудио-сигналы, dev tools скрыты по умолчанию.
- 2026-02-24: Выполнен v0.4.E: исправлен сбой Dexie migration (`groupMembers` duplicate index), стабилизированы e2e через `data-testid`, подтверждён полный регресс (`test/build/e2e`).
- 2026-02-24: Внедрён пакет рекомендаций из `deep-research-report.md`: clamp `effectiveCorrect` (Timed), авто-применение `withLevelDefaults` в сессии после reload/адаптации, отказ от подмены `mode` для Reverse в дневной агрегации, индекс Dexie `[userId+moduleId+modeId+timestamp]` (db v6), CSV-экспорт (`users/sessions/classGroups/groupMembers`) из `Настроек`, iOS install-hint и `:focus-visible`, добавлен `CI` workflow (`test/build/e2e`).

## Risks & Decisions
### Decisions
- Данные остаются локальными (offline-first), без backend.
- Один ученик одновременно состоит только в одном классе.
- Цветовая тема по умолчанию: `Ч/Б`.
- Звук по умолчанию: только start/end; остальные сигналы опциональны.
- Demo/benchmark инструменты скрыты при `devMode=false`.
- Экспорт данных реализован как локальная операция CSV без сетевой передачи.
- Для ускорения адаптивных выборок добавлен индекс Dexie `[userId+moduleId+modeId+timestamp]`.

### Risks
- Рост локальных данных класса (30+) требует контроля производительности агрегаций.
- Риск перегруза UI цветовыми настройками: сохраняем ограниченный набор параметров.
- Риск шума в классе: быстрый mute и консервативные audio-default.

### Backlog notes (v0.5 candidates)
- Роли интерфейса: `Учительский` / `Домашний` режим.
- Мягкая мотивация: streak badges без жёсткого рейтинга.
- Экран «Перед тренировкой» с целью на день и рекомендацией.
- Новый модуль тренировки (вне Шульте).

## Next Session Start
1. Зафиксировать план деплоя (Netlify или GitHub Pages с SPA fallback) и оформить релиз `alpha-v0.4.1`.
