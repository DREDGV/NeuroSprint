# NeuroSprint MVP Roadmap (RU)

## Scope
### In scope (MVP + v0.4 + v0.4.2 + v0.5.C+)
- Профили пользователей на одном устройстве.
- Активный пользователь в `localStorage` (`ns.activeUserId`).
- Шульте: `Classic+`, `Timed+`, `Reverse`.
- Цветовые темы Шульте и advanced-настройка цветов.
- Детские визуальные темы Шульте (цвет + типографика).
- Квадратное поле и квадратные клетки Шульте для сеток `3x3..6x6`.
- Единый поток запуска: `Home -> Setup -> Session`.
- Старт сессии по первому клику по клетке (кнопка старта не обязательна).
- Адаптивная сложность с ручным override (уровни 1..10, старт с 3x3).
- Ручное управление классами и учениками (включая массовое добавление списком).
- Сессии и статистика в IndexedDB (Dexie), сравнения `user/group/global`.
- Простая статистика на `/stats` + расширенная аналитика на `/stats/individual`.
- Звук (start/end по умолчанию + опциональные click/correct/error).
- Sprint Math: игровой цикл `setup -> session`, расчет метрик, сохранение сессии в Dexie.
- Sprint Math в простой статистике `/stats` + e2e smoke сценарий нового цикла.
- Sprint Math в `TrainingHub` (активная карточка и пользовательский вход без прямого URL).
- Sprint Math в расширенной статистике `/stats/individual` (режимы, тренды и блок последних сессий).
- Встроенная страница `Справка` с историей версий внутри приложения (`/help`).
- Проектный `CHANGELOG` с версионированием и датами (`docs/CHANGELOG_RU.md`).
- Явная индикация активного пользователя в UI (header + home + session pages).
- PWA (installable/offline) и тестовый контур `unit + integration + e2e`.

### Out of scope
- Backend/облако/аккаунты.
- Синхронизация между устройствами.
- APK-native сборка.
- Новые тренировочные модули вне Шульте и Sprint Math (перенос на v0.5+).

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
| v0.4.2.A | UX Stabilization: квадратная сетка Шульте | Done | Внедрен `aspect-ratio` board, клетки квадратные на `3x3..6x6` |
| v0.4.2.B | Единый запуск `Home -> Setup -> Session` | Done | Home quick-start ведет в setup (`?mode=`), session стартует по первому клику |
| v0.4.2.C | Статистика: `/stats` как простой экран | Done | `/stats` теперь открывает `StatsPage`, advanced вынесен в отдельные маршруты |
| v0.4.2.D | Детские темы (цвет + шрифт/вес/стиль) | Done | Добавлены `kid_*` темы и CSS-типографика для детских пресетов |
| v0.4.2.E | Sprint Math prep | Done | Добавлен контракт `sprint-math`, setup/session skeleton и unit-тесты без активации в основной навигации |
| v0.5.A | Sprint Math runtime | Done | Реализован цикл ответов, таймер, метрики и сохранение сессии в Dexie |
| v0.5.B | Sprint Math stats + smoke | Done | Sprint Math добавлен в `/stats`, добавлен e2e smoke `sprint-math.spec.ts` |
| v0.5.C | Sprint Math activation + advanced individual stats | Done | Модуль активирован в TrainingHub, `/stats/individual` поддерживает Sprint Math режимы и тренды |
| v0.5.C+ | Snapshot + Help + Changelog + Active User UX | Done | Добавлены `/help`, `docs/CHANGELOG_RU.md`, усилена видимость активного пользователя |

## Interfaces & Contracts
### Routes
- `/`
- `/training`
- `/training/schulte`
- `/training/schulte/:mode`
- `/training/sprint-math`
- `/training/sprint-math/session`
- `/stats`
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
- `ns.sprintMathSetup`
- `ns.audioSettings`
- `ns.devMode`

### Domain contracts (актуально)
- `Mode = "classic" | "timed" | "reverse" | "sprint_math"`
- `GridSize = 3 | 4 | 5 | 6`
- `Session` расширен полями `moduleId`, `modeId`, `level`, `presetId`, `adaptiveSource`, `visualThemeId`, `audioEnabledSnapshot`.
- Добавлены `UserModeProfile`, `AdaptiveDecision`, `ClassGroup`, `GroupMember`, `UserPreference`, `SchulteThemeConfig`, `AudioSettings`.
- Добавлен контракт `SprintMath` (`setup`, `task`, `metrics`, `session contract`) как отдельный слой подготовки v0.5.

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
- 2026-02-25: Стартован этап `v0.4.2` по материалам `deep-research-report (1).md` и `deep-research-report (2).md`: фокус на квадратной сетке, детских темах, едином запуске сессии и упрощении статистики по умолчанию.
- 2026-02-25: Закрыты `v0.4.2.A-D`: квадратная сетка, новый стартовый поток (`Home -> Setup -> Session`), простой `/stats` по умолчанию, детские темы `kid_*`; подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.4.2.E`: реализован Sprint Math contract (`src/features/sprint-math/contract.ts`), local setup storage, setup/session skeleton pages и маршруты без вывода в main nav; пройден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.A`: Sprint Math session page переведена в рабочий цикл (таймер, ответы, streak, метрики), добавлено сохранение `taskId="sprint_math"` в Dexie `sessions`; подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.B`: Sprint Math интегрирован в simple stats (`/stats`, режим `Sprint Math`), добавлен e2e smoke `tests/e2e/sprint-math.spec.ts`; подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.C`: Sprint Math переведен в активный модуль TrainingHub, индивидуальная статистика расширена под `sprint_add_sub/sprint_mixed` (режимный переключатель, графики throughput/accuracy/score, блок последних сессий), e2e обновлен на пользовательский путь через `/training`; подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Выполнена фиксация состояния проекта: обновлены roadmap/status, добавлен `docs/CHANGELOG_RU.md`, создана встроенная страница `/help` с историей версий, усилена видимость активного пользователя (header + home + session); подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.

## Risks & Decisions
### Decisions
- Данные остаются локальными (offline-first), без backend.
- Один ученик одновременно состоит только в одном классе.
- Цветовая тема по умолчанию: `Ч/Б`.
- Звук по умолчанию: только start/end; остальные сигналы опциональны.
- Demo/benchmark инструменты скрыты при `devMode=false`.
- Экспорт данных реализован как локальная операция CSV без сетевой передачи.
- Для ускорения адаптивных выборок добавлен индекс Dexie `[userId+moduleId+modeId+timestamp]`.
- В навигации `/stats` закреплён как простой экран прогресса; сравнения и детальная аналитика вынесены в `/stats/individual` и `/stats/group`.
- Быстрый старт с главной не запускает сессию напрямую и ведёт в setup с предвыбранным режимом.
- Для Шульте закреплён визуальный инвариант: board и клетки всегда квадратные.
- Sprint Math на этапе `v0.4.2.E` реализуется как контракт и скрытые технические маршруты; публичный запуск через TrainingHub переносится в `v0.5`.
- На `v0.5.A` Sprint Math сохраняет сессии в общую таблицу `sessions` с `mode="sprint_math"` и собственным `modeId`.
- На `v0.5.B` Sprint Math отображается в simple stats наравне с Schulte режимами.
- На `v0.5.C` Sprint Math активирован в TrainingHub и включен в расширенный индивидуальный экран статистики.
- Введен единый процесс фиксации изменений через `docs/CHANGELOG_RU.md` и отображение истории версий в `/help`.

### Risks
- Рост локальных данных класса (30+) требует контроля производительности агрегаций.
- Риск перегруза UI цветовыми настройками: сохраняем ограниченный набор параметров.
- Риск шума в классе: быстрый mute и консервативные audio-default.
- Риск регрессий e2e при смене UX старта: поддерживаем обратную совместимость кнопки старта на сессии до полной миграции тестов.

### Backlog notes (v0.5 candidates)
- Роли интерфейса: `Учительский` / `Домашний` режим.
- Мягкая мотивация: streak badges без жёсткого рейтинга.
- Экран «Перед тренировкой» с целью на день и рекомендацией.
- Полноценная аналитика Sprint Math на экране статистики.

## Next Session Start
1. Перейти к `v0.5.D`: расширить групповую аналитику для Sprint Math (фильтры режимов и корректный module-aware поток в `StatsGroup`/сравнениях).
