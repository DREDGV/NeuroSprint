# NeuroSprint MVP Roadmap (RU)

## Scope
### In scope (MVP + v0.4 + v0.4.2 + v0.8 planning)
- Профили пользователей на одном устройстве.
- Активный пользователь в `localStorage` (`ns.activeUserId`).
- Шульте: `Classic+`, `Timed+`, `Reverse`.
- Цветовые темы Шульте и advanced-настройка цветов.
- Детские визуальные темы Шульте (цвет + типографика).
- Квадратное поле и квадратные клетки Шульте для сеток `3x3..6x6`.
- Единый поток запуска: `Home/TrainingHub -> Pre-Session -> Setup -> Session`.
- Старт сессии по первому клику по клетке (кнопка старта не обязательна).
- Экран «Перед тренировкой»: цель дня + рекомендованный режим + быстрый переход в setup.
- Мягкая мотивация: streak badges и мини-цели дня на `Home` и `Pre-session`.
- Адаптивная сложность с ручным override (уровни 1..10, старт с 3x3).
- Ручное управление классами и учениками (включая массовое добавление списком).
- Сессии и статистика в IndexedDB (Dexie), сравнения `user/group/global`.
- Простая статистика на `/stats` + расширенная аналитика на `/stats/individual`.
- Звук (start/end по умолчанию + опциональные click/correct/error).
- Sprint Math: игровой цикл `setup -> session`, расчет метрик, сохранение сессии в Dexie.
- Sprint Math в простой статистике `/stats` + e2e smoke сценарий нового цикла.
- Sprint Math в `TrainingHub` (активная карточка и пользовательский вход без прямого URL).
- Sprint Math в расширенной статистике `/stats/individual` (режимы, тренды и блок последних сессий).
- N-Back Lite: `1-back/2-back`, setup + session, сохранение в Dexie, интеграция в статистику, рекомендации и daily challenge.
- Decision Rush: rules-based `ДА/НЕТ` (warmup/core/boss), адаптивный темп, combo, лидерборд и аналитика.
- Memory Grid Rush: последовательности на сетке (Classic/Rush), прогресс span, лидерборд и аналитика памяти.
- Встроенная страница `Справка` с историей версий внутри приложения (`/help`).
- Проектный `CHANGELOG` с версионированием и датами (`docs/CHANGELOG_RU.md`).
- Явная индикация активного пользователя в UI (header + home + session pages).
- Роли интерфейса: `Учитель`, `Ученик`, `Домашний` с ролевой навигацией и назначением роли на уровне профиля пользователя.
- PWA (installable/offline) и тестовый контур `unit + integration + e2e`.

### Out of scope
- Backend/облако/аккаунты.
- Синхронизация между устройствами.
- APK-native сборка.
- Новые тренировочные модули вне Шульте / Sprint Math / Reaction / N-Back / Decision Rush / Memory Grid (перенос на следующий этап).

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
| v0.5.D | Sprint Math group analytics | Done | В `StatsGroup` добавлен фильтр модуля (`Шульте`/`Sprint Math`), mode-aware режимы и проверки сравнения group/global |
| v0.5.E | App roles (`teacher/student/home`) | Done | Добавлены роли интерфейса, ролевой `MainNav`, ограничение teacher-only экранов и переключатель роли в `Settings` |
| v0.5.E.1 | Profile-level role management | Done | Роль вынесена в профиль пользователя: выбор при создании, отображение и редактирование в `/profiles`, синхронизация активного профиля с интерфейсной ролью |
| v0.5.E.2 | Role hardening + permissions matrix | Done | Введена централизованная матрица прав, защита от удаления/понижения последнего учителя, role-badge на `Profiles/Classes/Stats` |
| v0.5.F | Pre-session flow (`/training/pre-session`) | Done | Добавлен экран «Перед тренировкой», связка с `Home/TrainingHub`, quick-start в setup, поддержка `?mode=` для Sprint Math |
| v0.5.G | Soft motivation (`streak badges + daily mini-goals`) | Done | Добавлены streak-badges и мини-цели дня в `Home` и `Pre-session`, внедрен helper `shared/lib/motivation` и тесты |
| v0.5.H | Sprint Math analytics + recommendation engine | Done | `/stats`: фильтр Sprint Math по подрежимам (`Все/Add-Sub/Mixed`), `/stats/individual`: 7-дневный тренд, единый recommendation engine для pre-session и stats |
| v0.5.I | Fine role-policy + encoding guard | Done | Детализирована матрица прав (`profiles/settings/stats`), добавлены role-specific ограничения в UI, покрытие integration/e2e и `check:encoding` в CI |
| v0.5.J | Route-level permission guard + role-aware hints | Done | Добавлен единый `RequirePermission` на маршрутах `/classes*` и `/stats/group`, внедрены подсказки доступа по роли и расширено покрытие tests/e2e |
| v0.5.K | Action-level role-check unification | Done | Добавлены `useRoleAccess` + `buildRoleAccess/guardAccess`, страницы `Profiles/Settings/StatsIndividual` переведены на единый слой прав |
| v0.5.L | Sprint Math stats readability | Done | В `/stats` добавлены mode-aware сравнения `Add/Sub` vs `Mixed` и улучшена читаемость секции Sprint Math |
| v0.5.M | Encoding + regression hardening | Done | Исправлены русские тексты/кодировка в ключевых экранах, добавлен блок прогресса периода, подтвержден полный регресс |
| v0.5.N | Unified result screen | Done | Вынесен общий `SessionResultSummary` и унифицированы пост-сессионные экраны Schulte/Sprint Math |
| v0.5.O | Interactive hints + Reaction beta | Done | Добавлен `InfoHint`, внедрены подсказки в setup/preview потоки, добавлен новый модуль `Reaction` и e2e smoke |
| v0.5.P | Reaction persistence + analytics + recommendation | Done | Reaction сохранение/статистика/групповые сравнения, pre-session интеграция, mode-aware рекомендации |
| v0.7.A | Reaction number-match | Done | Добавлен `reaction_number` и интеграция по pre-session/recommendation/stats |
| v0.7.B | N-Back Lite module | Done | Новый модуль `N-Back Lite` (`nback_1/nback_2`) с setup/session/save/stats/recommendation/daily challenge |
| v0.7.C | Decision Rush module | In progress | Новый модуль принятия решений (Warmup/Core/Boss, адаптивный темп, score по P90, leaderboard) |
| v0.8.A | Memory Grid Rush module | Planned | Модуль памяти последовательностей (Classic/Rush, рост span, leaderboard, статистика прогресса) |

## Interfaces & Contracts
### Routes
- `/`
- `/training`
- `/training/pre-session`
- `/training/schulte`
- `/training/schulte/:mode`
- `/training/sprint-math`
- `/training/sprint-math/session`
- `/training/reaction`
- `/training/nback`
- `/training/nback/session`
- `/training/decision-rush`
- `/training/decision-rush/session`
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
- `ns.appRole`

### Domain contracts (актуально)
- `Mode = "classic" | "timed" | "reverse" | "sprint_math" | "reaction" | "n_back" | "decision_rush"`
- `GridSize = 3 | 4 | 5 | 6`
- `Session` расширен полями `moduleId`, `modeId`, `level`, `presetId`, `adaptiveSource`, `visualThemeId`, `audioEnabledSnapshot`.
- `TrainingModeId` расширен режимами `reaction_number`, `nback_1`, `nback_2`.
- Добавлены `UserModeProfile`, `AdaptiveDecision`, `ClassGroup`, `GroupMember`, `UserPreference`, `SchulteThemeConfig`, `AudioSettings`.
- Добавлены контракты `SprintMath` и `N-Back Lite` (`setup`, `task`, `metrics`, `session contract`).

### Repository contracts
- `userRepository.create(name, role)/list/getById/rename/updateRole/remove`
- `sessionRepository.save/listByUser/listByUserMode/aggregateDailyClassic/aggregateDailyTimed/aggregateDailyNBack/getModeMetricSnapshot`
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
- motivation helpers (streak badges + daily mini-goals).
- N-Back engine/scoring (`1-back/2-back`, hit/miss/falseAlarm/correctReject).

### Integration
- training hub.
- pre-session page (goal + recommendation + quick-start route).
- motivation block rendering in pre-session/home flows.
- permissions/roles matrix on nav and pages.
- classes page (class + student flows).
- settings dev-mode visibility.
- stats comparison blocks (individual/group).
- schulte grid behavior.
- nback setup/session/save flow.

### E2E smoke
- profile -> home -> pre-session -> classic -> stats.
- timed mode finish and metrics.
- classes: create class + bulk students.
- rainbow 3x3 session flow.
- settings: fixture generation + benchmark + comparison views.
- profile -> training -> nback -> result -> stats.

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
- 2026-02-25: Закрыт `v0.5.D`: групповая аналитика расширена для Sprint Math в `StatsGroup` (фильтр модуля и mode-aware список режимов), добавлены integration-проверки `stats-group-comparison`, подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.E`: внедрены роли интерфейса `teacher/student/home`, добавлены `appRole` storage + hook, ролевой `MainNav`, role-pill в `AppShell`, teacher-only доступ к `Classes` и `StatsGroup`, переключатель роли в `Settings`; подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.E.1`: роль добавлена в профиль пользователя (`users.role`, Dexie migration v7), выбор роли при создании профиля, редактирование роли в списке профилей, роль видна у активного профиля; `Settings` управляет ролью активного профиля; синхронизирован `appRole` с активным пользователем; подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.E.2`: добавлена централизованная матрица прав (`permissions`), роли-ограничения на страницах переведены на единый слой, добавлена защита от удаления/понижения последнего учителя, добавлены role-badge и role-label в `Profiles/Classes/Stats`; подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.F`: добавлен экран `/training/pre-session` (цель дня, рекомендация, выбор режима), Home/TrainingHub переведены на pre-session поток, Sprint Math setup поддерживает `?mode=...`; добавлены integration/e2e проверки, подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.G`: реализован мягкий мотивационный слой без соревновательного давления (streak badges + daily mini-goals) на `Home` и `/training/pre-session`; добавлен helper `src/shared/lib/motivation/motivation.ts`, обновлены integration-тесты pre-session и добавлены unit-тесты мотивации; подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.H`: расширена Sprint Math аналитика: на `/stats` добавлен фильтр подрежимов (`Все/Add-Sub/Mixed`) и mode-aware сводка, на `/stats/individual` добавлен блок `7 дней vs предыдущие 7 дней`; recommendation логика вынесена в единый helper `shared/lib/training/recommendation.ts` и синхронизирована между `trainingRepository` и `sessionRepository`; добавлены тесты `tests/unit/recommendation.test.ts` и `tests/integration/stats-page-sprint.test.tsx`; подтвержден регресс `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.I`: внедрена тонкая role-policy по действиям (`profiles/settings/stats`) с разделением teacher/student/home, студентам оставлен безопасный профильный поток (создание только `student`, без role-edit), в `Settings` введены role-aware ограничения (export/dev-tools/role change), в `StatsIndividual` comparison блок ограничен по роли; добавлены tests `profiles-role`, `settings-devmode`, `stats-individual-comparison`, e2e `role-policy.spec.ts`; demo fixture обновлена (`[DEMO] Учитель` как активный профиль) для стабильного admin-потока; добавлен `scripts/check-encoding.mjs` + `npm run check:encoding` в CI; подтвержден регресс `npm run check:encoding`, `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-25: Закрыт `v0.5.J`: реализован route-level guard `src/app/RequirePermission.tsx`; маршруты `/classes`/`/classes/:classId` и `/stats/group` переведены на централизованную проверку прав через `App.tsx`; добавлены role-aware подсказки доступа (текущая роль + требуемая роль + быстрые ссылки на `Профили/Настройки`); добавлены tests `tests/integration/require-permission.test.tsx`, e2e `tests/e2e/role-policy.spec.ts` расширен direct URL проверками; подтвержден регресс `npm run check:encoding`, `npm test`, `npm run build`, `npm run test:e2e`.
- 2026-02-26: Зафиксирован dev-release `0.5.0-dev.1`: обновлены версия в `package.json`, встроенная история релизов (`src/shared/constants/changelog.ts`) и `docs/CHANGELOG_RU.md`; next step закреплён на `v0.5.K`.
- 2026-02-26: Закрыт `v0.5.K`: унифицированы action-level проверки ролей через общий хук `src/app/useRoleAccess.ts` и helper-контракты `buildRoleAccess/guardAccess` в `src/shared/lib/auth/permissions.ts`; страницы `Profiles/Settings/StatsIndividual` переведены на единый слой прав; добавлены unit-тесты контрактов прав (`tests/unit/permissions.test.ts`); подтвержден регресс `npm run check:encoding`, `npm test`, `npm run build`.

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
- На `v0.5.D` в `StatsGroup` закреплен модульный фильтр (`schulte` / `sprint_math`) и mode-aware поток сравнения group/global.
- На `v0.5.E` роли интерфейса разделены на `teacher/student/home` с teacher-only доступом к классам и групповой аналитике.
- На `v0.5.E.1` источник роли перенесен в профиль пользователя (а не только в global setting), и активный профиль синхронизирует интерфейсную роль.
- На `v0.5.E.2` зафиксирована инварианта: в системе всегда должен оставаться минимум один учитель.
- На `v0.5.E.2` ролевые проверки централизованы через `shared/lib/auth/permissions.ts`.
- На `v0.5.F` предтренировочный экран (`pre-session`) зафиксирован как единая точка входа перед setup для Home и TrainingHub.
- На `v0.5.G` закреплен мягкий мотивационный подход: только личные streak-бейджи и мини-цели дня без лидерборда и социального давления.
- На `v0.5.H` recommendation-сигнал унифицирован: один и тот же движок рекомендаций используется в pre-session и в индивидуальных insights.
- На `v0.5.H` Sprint Math аналитика в simple stats переведена в mode-aware формат (`all/add-sub/mixed`) для явного сравнения подрежимов.
- На `v0.5.I` зафиксирована action-level матрица прав: отдельно `profiles`, `settings`, `stats comparison`, `classes`, `dev-tools/export`.
- На `v0.5.I` для роли `student` сохранён безопасный профильный сценарий: создание новых профилей разрешено только с ролью `student`, редактирование ролей/имен/удаление запрещено.
- На `v0.5.I` добавлен автоматический контроль кодировки (`check:encoding`) как обязательный шаг CI до тестов.
- На `v0.5.J` route-level доступ централизован через `RequirePermission`, чтобы прямые переходы по URL были защищены единообразно.
- На `v0.5.J` UX ограничений сделан явным: показывается текущая роль, требуемая роль и быстрый переход к смене роли.
- На `v0.5.K` action-level проверки прав централизованы: страницы используют единый `useRoleAccess`, а проверки отказа стандартизированы через `guardAccess`.

### Risks
- Рост локальных данных класса (30+) требует контроля производительности агрегаций.
- Риск перегруза UI цветовыми настройками: сохраняем ограниченный набор параметров.
- Риск шума в классе: быстрый mute и консервативные audio-default.
- Риск регрессий e2e при смене UX старта: поддерживаем обратную совместимость кнопки старта на сессии до полной миграции тестов.

### Backlog notes (v0.5 candidates)
- Расширение мотивации: недельные персональные мини-планы и мягкие награды за стабильность.
- Полноценная аналитика Sprint Math на экране статистики.
- Доприменить `useRoleAccess` на оставшихся экранах, где еще есть локальные вычисления role-флагов.

## Next Session Start
1. Перейти к `v0.5.L`: расширить Sprint Math аналитику на `/stats` (mode-aware сводки и более читаемые сравнения подрежимов).

## Incremental Update: v0.5.L (2026-02-26)
### Status
- Done.

### Delivered
- `/stats`: Sprint Math mode получил отдельный блок сравнения `Add/Sub` vs `Mixed`.
- Добавлены mode-aware карточки подрежимов: `sessions`, `throughput`, `accuracy`, `score`.
- Добавлены дельты `Add/Sub - Mixed` и явный индикатор «сильнее сейчас».
- Исправлены текстовые строки и читаемость Sprint Math секции на простом экране статистики.
- Расширены integration-tests: `tests/integration/stats-page-sprint.test.tsx`.

### Validation
- `npm run check:encoding` — passed.
- `npm test -- tests/integration/stats-page-sprint.test.tsx` — passed.
- `npm run build` — passed.

### Next Session Start
1. Перейти к `v0.5.M`: завершить унификацию role-access на оставшихся страницах и провести полный регрессионный прогон (`check:encoding`, `test`, `build`, `test:e2e`).

## Incremental Update: v0.5.M (2026-02-27)
### Status
- Done.

### Delivered in this session
- Исправлена кодировка и русские тексты в ключевых экранах: `Home`, `TrainingHub`, `SprintMathSetup`, `SprintMathSession`, `Stats`, `App` fallback.
- Исправлено отображение деления в Sprint Math (`/` вместо поврежденного символа).
- В `/stats` добавлен верхний блок прогресса по выбранному режиму:
  - сравнение двух периодов,
  - изменение в процентах,
  - личный рекорд и дата.
- Обновлены интеграционные тесты под новый блок прогресса и исправленные тексты.

### Validation
- `npm run check:encoding` — passed.
- `npm test` — passed.
- `npm run build` — passed.
- `npm run test:e2e` — passed.

### Next Session Start
1. Перейти к `v0.5.N`: реализовать единый пост-сессионный экран результата с короткими рекомендациями для Schulte и Sprint Math (этап 4 из `NeuroSprint_AGENT_PLAN_RU.md`).

### Additional progress (2026-02-27)
- `ClassesPage` переведен на `useRoleAccess` и полностью очищен от битой кодировки.
- `StatsPage` и `StatsGroupPage` переведены на единый источник прав через `useRoleAccess` (без локальных `useAppRole + can*` комбинаций).
- Подтвержден регресс после унификации прав: `check:encoding`, `build`, integration и e2e (classes/smoke/sprint) — passed.
- Выпущен технический срез `v0.5.0-dev.2`: обновлены встроенная справка, changelog и версия приложения.
- Завершена унификация role-access в виджетах shell-навигации:
  - `MainNav` переведен на `useRoleAccess` вместо пропса роли.
  - `AppShell` обновлен под новый контракт `MainNav`.
- Обновлены тесты role-policy:
  - `tests/integration/main-nav-role.test.tsx` адаптирован под чтение роли из `localStorage`.
  - `tests/e2e/role-policy.spec.ts` выровнен с текущей моделью recovery mode + student restrictions.
- Подтвержден полный регрессионный прогон перед фиксацией:
  - `npm run check:encoding`, `npm test`, `npm run build`, `npm run test:e2e` — passed.

## Incremental Update: v0.5.N (2026-02-27)
### Status
- Done.

### Delivered in this session
- Добавлен общий компонент пост-сессионного результата:
  - `src/shared/ui/SessionResultSummary.tsx`
- Унифицирован блок результата в Schulte:
  - `src/pages/SchulteSessionPage.tsx`
  - сохранены текущие метрики/подсказки/адаптивное сообщение,
  - добавлены стандартные CTA «Новая попытка» и «К статистике».
- Унифицирован блок результата в Sprint Math:
  - `src/pages/SprintMathSessionPage.tsx`
  - сохранены текущие метрики/сравнения/состояние сохранения,
  - сохранен `data-testid="sprint-math-save-status"` для e2e-контракта.
- Добавлен integration-тест на единый контракт result-flow:
  - `tests/integration/session-result-summary.test.tsx`

### Validation
- `npm run check:encoding` — passed.
- `npm test` — passed.
- `npm run test:e2e` — passed.
- `npm run build` — passed.

### Next Session Start
1. Перейти к `v0.5.O`: добавить в setup единый блок «Как играть» (короткие правила + подсказки на метрики score/accuracy) для Schulte и Sprint Math.

## Incremental Update: v0.5.O (2026-02-27)
### Status
- Done.

### Delivered in this session
- Добавлен единый интерактивный компонент подсказок:
  - `src/shared/ui/InfoHint.tsx`
- Подсказки интегрированы в ключевые точки старта:
  - `src/pages/TrainingHubPage.tsx`
  - `src/pages/SchulteSetupPage.tsx`
  - `src/pages/SprintMathSetupPage.tsx`
  - `src/pages/PreSessionPage.tsx`
- Добавлен новый модуль тренировки `Reaction` (beta):
  - `src/pages/ReactionPage.tsx`
  - маршрут: `/training/reaction`
  - карточка запуска в `TrainingHub`.
- Исправлена кодировка новых строк и тестов (убраны кракозябры после интеграции).
- Обновлено покрытие:
  - integration: `tests/integration/training-hub.test.tsx`
  - e2e: `tests/e2e/reaction.spec.ts`.

### Validation
- `npm run check:encoding` — passed.
- `npm test` — passed.
- `npm run build` — passed.
- `npm run test:e2e` — passed.

### Next Session Start
1. Перейти к `v0.5.P`: сохранить сессии `Reaction` в IndexedDB и вывести базовую статистику Reaction в `/stats` и `/stats/individual`.

## Incremental Update: v0.5.P.0 (2026-02-27)
### Status
- Done.

### Delivered in this session
- `Reaction` модернизирован до вариативного тренажера:
  - `signal` — классический клик по сигналу,
  - `stroop_match` — поиск совпадения цвета и надписи,
  - `pair_match` — поиск целевой пары по подсказке.
- Добавлен генератор заданий Reaction:
  - `src/features/reaction/challenges.ts`
- Добавлены новые элементы интерфейса в `ReactionPage`:
  - выбор вариации,
  - карточки выбора для режимов `Цвет и слово` и `Пара`,
  - расширенные метрики (прогресс, точность, ошибки выбора, ранние нажатия).
- Добавлены тесты:
  - unit: `tests/unit/reaction-challenges.test.ts`
  - e2e: `tests/e2e/reaction.spec.ts` (проверка вариации `Цвет и слово`).

### Validation
- `npm run check:encoding` — passed.
- `npm test -- tests/unit/reaction-challenges.test.ts tests/integration/training-hub.test.tsx` — passed.
- `npm run build` — passed.
- `npm run test:e2e -- tests/e2e/reaction.spec.ts` — passed.

### Next Session Start
1. Перейти к `v0.5.P`: сохранить сессии `Reaction` в IndexedDB и вывести базовую статистику Reaction в `/stats` и `/stats/individual`.

## Incremental Update: v0.5.P.1 (2026-02-27)
### Status
- Done.

### Delivered in this session
- Реализовано сохранение сессий `Reaction` в IndexedDB с новыми modeId:
  - `reaction_signal`
  - `reaction_stroop`
  - `reaction_pair`
- Расширены доменные контракты:
  - `Mode += reaction`
  - `TrainingModuleId += reaction`
  - `TrainingModeId += reaction_*`
  - `Session.taskId += reaction`
  - добавлен `ReactionDailyPoint`.
- Расширен `sessionRepository`:
  - `buildReactionDailyPoints(...)`
  - `aggregateDailyReaction(userId)`
  - поддержка Reaction в `aggregateDailyByModeId(...)`.
- Обновлены экраны статистики:
  - `/stats`: новый переключатель режима `Reaction`, отдельный график и сводка.
  - `/stats/individual`: добавлены подрежимы Reaction и график динамики.
- Обновлен `/stats/group`: добавлен модуль `Reaction` и mode-aware фильтр `reaction_signal / reaction_stroop / reaction_pair`.
- Обновлены тесты:
  - unit: `session-aggregation.test.ts`
  - integration: `stats-page-sprint.test.tsx`
  - e2e: `reaction.spec.ts`.

### Validation
- `npm run check:encoding` - passed.
- `npm test -- tests/unit/session-aggregation.test.ts tests/integration/stats-page-sprint.test.tsx tests/integration/stats-individual-comparison.test.tsx` - passed.
- `npm run build` - passed.
- `npm run test:e2e -- tests/e2e/reaction.spec.ts` - passed.

### Next Session Start
1. Перейти к `v0.5.P.2`: включить Reaction в сравнительную аналитику `/stats/group` и уточнить рекомендации на базе новых сессий.

## Incremental Update: v0.5.P.2 (2026-02-28)
### Status
- Done.

### Delivered in this session
- Recommendation engine расширен для Reaction:
  - добавлен recommendation-mode `reaction_signal`,
  - `reaction_stroop` и `reaction_pair` агрегируются в recommendation-бакет `reaction_signal`,
  - снижен приоритет «untrained Reaction», чтобы не ломать существующий баланс рекомендаций.
- `PreSessionPage` расширен под Reaction:
  - поддержка `module=reaction`,
  - поддержка mode query: `reaction_signal|reaction_stroop|reaction_pair`,
  - корректный quick-start роут на `/training/reaction?mode=...`.
- `ReactionPage` поддерживает входной query `mode` и переключает вариант тренировки при старте.
- Пресеты и режимы:
  - добавлен экспорт `REACTION_MODES`,
  - `TRAINING_MODES` теперь включает Reaction.
- Добавлен/обновлен тестовый контур:
  - unit: `tests/unit/recommendation.test.ts`
  - integration: `tests/integration/pre-session-page.test.tsx`, `tests/integration/training-hub.test.tsx`
  - integration stats: `tests/integration/stats-individual-comparison.test.tsx`, `tests/integration/stats-group-comparison.test.tsx`, `tests/integration/stats-page-sprint.test.tsx`
  - e2e: `tests/e2e/reaction.spec.ts`.

### Validation
- `npm test -- tests/unit/recommendation.test.ts tests/integration/pre-session-page.test.tsx tests/integration/training-hub.test.tsx` - passed.
- `npm test -- tests/integration/stats-individual-comparison.test.tsx tests/integration/stats-group-comparison.test.tsx tests/integration/stats-page-sprint.test.tsx` - passed.
- `npm run test:e2e -- tests/e2e/reaction.spec.ts` - passed.
- `npm run check:encoding` - passed.
- `npm run build` - passed.

### Next Session Start
1. Перейти к `v0.5.P.3`: уточнить тексты рекомендаций Reaction по подрежимам и зафиксировать dev-срез версии.

## Incremental Update: v0.5.P.3 (2026-02-28)
### Status
- Done.

### Delivered in this session
- Recommendation engine обновлен до mode-aware Reaction-рекомендаций:
  - поддержаны отдельные кандидаты `reaction_signal`, `reaction_stroop`, `reaction_pair`,
  - добавлены причины рекомендации по конкретному подрежиму Reaction,
  - для Reaction учитывается среднее время реакции в расчете приоритета,
  - если у пользователя уже есть история Reaction, неигранные подрежимы имеют сниженный приоритет и не перебивают слабый тренируемый подрежим.
- `PreSessionPage` получил контекстные подсказки по подрежимам Reaction:
  - подсказка для выбранного режима старта,
  - подсказка в блоке рекомендации, если рекомендован Reaction-режим.
- Обновлены тесты:
  - unit: `tests/unit/recommendation.test.ts`,
  - integration: `tests/integration/pre-session-page.test.tsx`.

### Validation
- `npm test -- tests/unit/recommendation.test.ts tests/integration/pre-session-page.test.tsx` - passed.
- `npm run test:e2e -- tests/e2e/reaction.spec.ts` - passed.
- `npm run check:encoding` - passed.
- `npm run build` - passed.

### Next Session Start
1. Подготовить dev-срез версии после `v0.5.P.3`: синхронизировать `/help` + changelog + версию и выполнить полный регресс (`npm test`, `npm run build`, `npm run test:e2e`).

## Incremental Update: v0.5.P.4 (2026-02-28)
### Status
- Done.

### Delivered in this session
- Подготовлен и зафиксирован dev-срез `0.5.0-dev.3`:
  - обновлены `package.json` и `package-lock.json`,
  - синхронизирована встроенная история релизов `src/shared/constants/changelog.ts`,
  - обновлен `docs/CHANGELOG_RU.md`.
- Дорожная карта синхронизирована:
  - milestone `v0.5.P` зафиксирован как полностью закрытый (`Done`).
- Подтвержден полный регресс перед срезом:
  - `npm run check:encoding`,
  - `npm test`,
  - `npm run build`,
  - `npm run test:e2e`.

### Validation
- `npm run check:encoding` - passed.
- `npm test` - passed (27 test files, 86 tests).
- `npm run build` - passed.
- `npm run test:e2e` - passed (11/11).

### Next Session Start
1. Перейти к следующему этапу `NeuroSprint_AGENT_PLAN_RU.md` (Этап 6): локальный лидерборд (Top-10, фильтры период/режим, подсветка активного пользователя).

## Incremental Update: v0.6.A (2026-02-28)
### Status
- Done.

### Delivered in this session
- Реализован dual-entry старт-флоу на Home:
  - `Быстрый старт`: прямой запуск в активные модули (`Classic`, `Sprint Math`, `Reaction`),
  - `План дня`: отдельный вход в `Pre-session`.
- Обновлен `HomePage` под явное разделение двух сценариев запуска.
- Обновлены тесты:
  - integration: `tests/integration/training-hub.test.tsx` (контракт pre-session кнопок на активных модулях),
  - e2e: `tests/e2e/smoke.spec.ts` (добавлен сценарий `home -> pre-session -> setup`).

### Validation
- `npm run check:encoding` - passed.
- `npm run build` - passed.
- `npm test -- tests/integration/training-hub.test.tsx` - passed.
- `npm run test:e2e -- tests/e2e/smoke.spec.ts` - passed.

### Next Session Start
1. Перейти к `v0.6.B`: реализовать compare mode (`median/p25/p75`) на `/stats` и покрыть тестами.

## Incremental Update: v0.6.B (2026-02-28)
### Status
- Done.

### Delivered in this session
- В `sessionRepository` добавлена агрегация compare-band по дням:
  - новый контракт `aggregateDailyCompareBand(modeIds, metric, period)`,
  - расчет `P25 / median / P75` по локальной выборке пользователей устройства,
  - новые доменные контракты `CompareBandMetric`, `DailyCompareBandPoint`.
- В `StatsPage` реализован compare-mode:
  - отдельный блок `Сравнение с пользователями (median / p25 / p75)`,
  - toggle включения/скрытия compare-mode,
  - выбор периода `7/30/90/all`,
  - summary-карточки последнего дня (`Вы`, `P25`, `Медиана`, `P75`),
  - отдельный график линий `Вы / P25 / Медиана / P75`.
- Обновлены тесты:
  - unit: `tests/unit/session-aggregation.test.ts`,
  - integration: `tests/integration/stats-page-sprint.test.tsx`.

### Validation
- `npm test -- tests/unit/session-aggregation.test.ts tests/integration/stats-page-sprint.test.tsx` - passed.
- `npm run build` - passed.
- `npm run check:encoding` - passed.
- `npm run test:e2e -- tests/e2e/smoke.spec.ts` - passed.

### Next Session Start
1. Перейти к `v0.6.C`: расширить CSV-экспорт в `Settings` файлами `userPreferences` и `userModeProfiles`.

## Incremental Update: v0.6.C (2026-02-28)
### Status
- Done.

### Delivered in this session
- В `SettingsPage` расширен экспорт CSV:
  - добавлен файл `neurosprint_user_preferences_<date>.csv`,
  - добавлен файл `neurosprint_user_mode_profiles_<date>.csv`.
- Обновлен текст контракта блока экспорта на странице `Настройки`.
- Обновлен integration-тест:
  - `tests/integration/settings-devmode.test.tsx` проверяет наличие новых экспортируемых файлов.

### Validation
- `npm test -- tests/integration/settings-devmode.test.tsx tests/integration/stats-page-sprint.test.tsx tests/unit/session-aggregation.test.ts` - passed.
- `npm run build` - passed.
- `npm run check:encoding` - passed.
- `npm run test:e2e -- tests/e2e/smoke.spec.ts` - passed.

### Next Session Start
1. Перейти к `v0.6.D`: реализовать локальный leaderboard Top-10 (режим/период, подсветка активного пользователя).

## Incremental Update: v0.6.D (2026-02-28)
### Status
- Done.

### Delivered in this session
- В `StatsIndividualPage` добавлен блок `Лидерборд Top-10`.
- Реализованы фильтры leaderboard:
  - период (`7/30/90/all`),
  - режим берется из текущего выбранного режима индивидуальной статистики.
- Добавлена подсветка строки активного пользователя в рейтинге.
- Обновлены стили leaderboard в `src/app/styles.css`.
- Обновлены integration-тесты:
  - `tests/integration/stats-individual-comparison.test.tsx`.

### Validation
- `npm test -- tests/integration/stats-individual-comparison.test.tsx tests/integration/stats-page-sprint.test.tsx tests/integration/settings-devmode.test.tsx tests/unit/session-aggregation.test.ts` - passed.
- `npm run build` - passed.
- `npm run check:encoding` - passed.
- `npm run test:e2e -- tests/e2e/smoke.spec.ts` - passed.

### Next Session Start
1. Перейти к `v0.6.E`: реализовать Daily Challenge MVP (локально, без backend).

## Incremental Update: v0.6.E (2026-03-01)
### Status
- Done.

### Delivered in this session
- Добавлена локальная модель `Daily Challenge` в Dexie:
  - `dailyChallenges` (челлендж дня на пользователя),
  - `dailyChallengeAttempts` (попытки выполнения через сохранённые сессии).
- Добавлены доменные контракты:
  - `DailyChallenge`,
  - `DailyChallengeAttempt`,
  - `DailyChallengeProgress`,
  - `DailyChallengeStatus`.
- Реализован `dailyChallengeRepository`:
  - детерминированный режим challenge по дате,
  - `getOrCreateForToday(userId)`,
  - backfill попыток по уже сохранённым сессиям за день,
  - автоматический перевод challenge в `completed` при выполнении.
- Интеграция с игровыми сессиями:
  - `sessionRepository.save(...)` регистрирует попытку challenge после сохранения сессии.
- UI на `Home`:
  - виджет `Challenge дня`,
  - статус (`В процессе/Выполнено`),
  - прогресс (`0 / 1`, `1 / 1`),
  - кнопка запуска тренировки в целевой режим challenge.
- Обновлён cleanup при удалении пользователя:
  - удаляются `dailyChallenges` и `dailyChallengeAttempts` пользователя.
- Добавлены тесты:
  - unit: `tests/unit/daily-challenge.test.ts`,
  - integration: `tests/integration/home-daily-challenge.test.tsx`.

### Validation
- `npm test -- tests/unit/daily-challenge.test.ts tests/integration/home-daily-challenge.test.tsx` - passed.

### Next Session Start
1. Перейти к `v0.6.F`: добавить историю `Daily Challenge` и блок в статистике с `% выполненных challenge` по периоду.

## Incremental Update: v0.6.F (2026-03-01)
### Status
- Done.

### Delivered in this session
- Expanded `dailyChallengeRepository`:
  - `getCompletionSummary(userId, period)` for completion KPI by period.
  - `listHistory(userId, period, limit)` for per-day challenge history.
- Added domain contracts:
  - `DailyChallengeHistoryItem`
  - `DailyChallengeCompletionSummary`
- Added new `/stats` block `Daily Challenge: completion`:
  - period filter (`7/30/90/all`)
  - summary cards (total/completed/pending/completion %)
  - recent challenge history list with mode/status/attempt progress
- Updated Home to use unified challenge rotation helpers from repository.
- Updated tests:
  - `tests/integration/stats-page-sprint.test.tsx`,
  - `tests/unit/daily-challenge.test.ts`,
  - `tests/integration/home-daily-challenge.test.tsx`.

### Validation
- `npm test -- tests/integration/stats-page-sprint.test.tsx tests/unit/daily-challenge.test.ts tests/integration/home-daily-challenge.test.tsx` - passed.
- `npm run build` - passed.

### Next Session Start
1. Move to post-`v0.6.F` polish: improve challenge UX copy and add extended analytics (challenge streak / long-term trend).

## Incremental Update: v0.6.G (2026-03-01)
### Status
- Done.

### Delivered in this session
- Выпущен dev-срез `0.5.0-dev.4`.
- Синхронизированы артефакты релиза:
  - `package.json` и `package-lock.json` (версия),
  - встроенная история релизов в `src/shared/constants/changelog.ts`,
  - `docs/CHANGELOG_RU.md`,
  - `docs/NeuroSprint_Execution_Status_RU.md`.
- Исправлены проблемы читаемости истории релизов в приложении (`/help`) за счет актуализации контента changelog.

### Validation
- `npm run check:encoding` - passed.
- `npm run build` - passed.
- `npm test -- tests/integration/stats-page-sprint.test.tsx tests/unit/daily-challenge.test.ts tests/integration/home-daily-challenge.test.tsx` - passed.
- `npm test -- tests/unit/reaction-challenges.test.ts tests/integration/reaction-challenge-modes.test.tsx` - passed.
- `npm run test:e2e -- tests/e2e/reaction.spec.ts` - passed.

### Next Session Start
1. Перейти к следующему инкременту плана: challenge streak + долгосрочный тренд и подготовка блока новых игр.

## Incremental Update: v0.6.H (2026-03-01)
### Status
- Done.

### Delivered in this session
- Расширена challenge-аналитика в `/stats`:
  - добавлен блок `Серия challenge`:
    - текущая серия (`current streak`),
    - лучшая серия (`best streak`),
    - количество выполненных challenge-дней в выбранном периоде;
  - добавлен долгосрочный тренд выполнения challenge (линия `0/100%` по дням).
- Расширен `dailyChallengeRepository`:
  - `getStreakSummary(userId, period)`,
  - `listCompletionTrend(userId, period, limit)`,
  - `buildDailyChallengeStreak(...)` как чистый helper-контракт.
- Исправлены битые строки в `dailyChallengeRepository` (режимы Reaction и тексты challenge) для стабильной UTF-8 локализации.
- Обновлены тесты:
  - `tests/unit/daily-challenge.test.ts` (проверка streak-логики),
  - `tests/integration/stats-page-sprint.test.tsx` (проверка streak/trend на `/stats` и reload по периоду).

### Validation
- `npm run check:encoding` - passed.
- `npm test -- tests/unit/daily-challenge.test.ts tests/integration/stats-page-sprint.test.tsx tests/integration/home-daily-challenge.test.tsx` - passed.
- `npm run build` - passed.

### Next Session Start
1. Перейти к следующему блоку плана: новый игровой модуль (первая версия) + дружелюбный интерактивный onboarding для новичка.

## Incremental Update: v0.7.A (2026-03-01)
### Status
- Done.

### Delivered in this session
- Добавлена новая игровая вариация в модуле `Reaction`:
  - `Reaction: Число-цель` (`reaction_number`, variant `number_match`),
  - игровой формат: выбор целевого числа в квадратном поле `2x2`.
- Новый режим подключен по всей цепочке:
  - `TRAINING_MODES` и pre-session выбор режима,
  - запуск по маршруту `/training/reaction?mode=reaction_number`,
  - сохранение сессий в IndexedDB c `modeId="reaction_number"`,
  - реакционная аналитика и compare-band учитывают новый режим.
- Обновлен recommendation-engine:
  - новый bucket `reaction_number`,
  - mode-aware приоритет и причина рекомендации для режима.
- Проведена cleanup-правка кодировки:
  - `PreSessionPage`, `presets`, `recommendation`, `reaction challenges` переведены в читаемый UTF-8 текст.

### Validation
- `npm run check:encoding` - passed.
- `npm test -- tests/unit/reaction-challenges.test.ts tests/integration/reaction-challenge-modes.test.tsx tests/integration/pre-session-page.test.tsx tests/unit/recommendation.test.ts tests/integration/training-hub.test.tsx tests/integration/stats-page-sprint.test.tsx` - passed.
- `npm run build` - passed.
- `npm run test:e2e -- tests/e2e/reaction.spec.ts` - passed.

### Next Session Start
1. Перейти к следующему блоку новых игр: определить и реализовать отдельный модуль (не вариацию) с setup + session + сохранением результатов.

## Incremental Update: v0.7.B (2026-03-01)
### Status
- Done.

### Delivered in this session
- Реализован новый модуль `N-Back Lite`:
  - setup-экран `/training/nback` с выбором `1-back/2-back` и `60/90 сек`,
  - session-экран `/training/nback/session` с сеткой `3x3`, ответами `Совпало/Не совпало`, таймером и прогрессом.
- Добавлен движок `src/features/nback/engine.ts`:
  - генерация последовательности,
  - оценка шагов (`hit/miss/falseAlarm/correctReject`),
  - расчет итоговых метрик (`accuracy/speed/errors/score/effectiveCorrect`).
- Добавлено сохранение результатов в `sessions`:
  - `taskId="n_back"`,
  - `moduleId="n_back"`,
  - `modeId="nback_1" | "nback_2"`,
  - `mode="n_back"`.
- Расширены контракты и маппинг режимов:
  - `Mode/TrainingModuleId/TrainingModeId/Session.taskId`,
  - `modeMapping` (`nback_1/nback_2 -> n_back`),
  - `TRAINING_MODULES` и `TRAINING_MODES`.
- Интегрировано в пользовательские потоки:
  - `TrainingHub` (модуль активен),
  - `Pre-session` (запуск и подсказки),
  - `Daily Challenge` (ротация и launch path),
  - recommendation engine (`nback_1/nback_2`),
  - `/stats`, `/stats/individual`, `/stats/group`.
- Расширен `sessionRepository`:
  - `aggregateDailyNBack(userId)`,
  - поддержка `nback_1/nback_2` в `aggregateDailyByModeId`.

### Validation
- `npm run check:encoding` - passed.
- `npm test -- tests/unit/nback-engine.test.ts tests/unit/recommendation.test.ts tests/unit/daily-challenge.test.ts tests/unit/session-aggregation.test.ts` - passed.
- `npm test -- tests/integration/training-hub.test.tsx tests/integration/pre-session-page.test.tsx tests/integration/stats-page-sprint.test.tsx tests/integration/nback-setup-session.test.tsx` - passed.
- `npm run test:e2e -- tests/e2e/nback.spec.ts` - passed.
- `npm run build` - passed.

### Next Session Start
1. Перейти к следующему этапу плана: улучшение качества новых игровых модулей (`Reaction/N-Back`) и подготовка отдельного нового модуля памяти v0.7.C.

## Planning Update: v0.7.C + v0.8.A (2026-03-01)
### Status
- In progress.

### Accepted direction
- Следующий основной модуль: `Decision Rush` (rules-based `ДА/НЕТ`, warmup/core/boss, адаптивный темп).
- Следующий после него: `Memory Grid Rush` (последовательности на сетке, Classic/Rush, рост span).

### Integration order
1. `v0.7.C Decision Rush`
- Контракты (`taskId=decision_rush`, `modeId=decision_kids|decision_standard|decision_pro`).
- Setup + Session + Result + save в `sessions`.
- Интеграция в `TrainingHub`, `Pre-session`, `Daily Challenge`, `Stats`.
- Базовый локальный leaderboard (best-of-period).

2. `v0.8.A Memory Grid Rush`
- Контракты (`taskId=memory_grid_rush`, `modeId=memory_grid_classic|memory_grid_rush`).
- Setup + Session + Result + save в `sessions`.
- Интеграция в `TrainingHub`, `Pre-session`, `Daily Challenge`, `Stats`.
- Локальный leaderboard:
  - `classic`: сортировка по `spanMax`, tie-break по `avgRecallTimeMs`;
  - `rush`: сортировка по `score`.

### Visual direction (based on reference)
- Для обоих модулей использовать полноэкранную “игровую арену” внутри страницы с крупными CTA.
- Цветовая схема: насыщенный градиентный фон + контрастные карточки задания.
- Кнопки действий: крупные (`ДА/НЕТ`, `Назад`, `Готово`) с явным состоянием.
- Отдельный приоритет: не перегружать анимациями, сохранить стабильность на Android.

### Next Session Start
1. Продолжить `v0.7.C` с шага `C2`: завершить UX-polish `Decision Rush` (экран setup/session), добить интеграцию в stats/recommendation и добавить e2e.

## Incremental Update: v0.7.C.1 (2026-03-03)
### Status
- In progress.

### Delivered in this session
- Выполнена стабилизация после параллельных изменений:
  - синхронизированы mode mappings в `modeMapping` для `nback_*`, `memory_grid_*`, `pattern_*`;
  - `PreSessionPage` переведен на динамическую валидацию доступных `moduleId/modeId` из каталогов режимов;
  - исправлены launch-path в `dailyChallengeRepository` для `memory_grid` и `pattern_recognition`;
  - исправлен цикл `PatternRecognitionSessionPage`:
    - корректная инициализация `pattern_multi`,
    - корректное завершение фиксированных режимов,
    - сохранение корректной длительности non-timed сессий;
  - в `StatsIndividualPage` введен защитный фильтр неподдержанных режимов (`memory_grid`, `pattern_recognition`) до полного завершения mode-aware аналитики.
- Синхронизированы release-артефакты:
  - `package.json`/`package-lock.json` -> `0.5.0-dev.5`,
  - `docs/CHANGELOG_RU.md`,
  - `src/shared/constants/changelog.ts`,
  - `docs/NeuroSprint_Execution_Status_RU.md`.

### Validation
- `npm run check:encoding` - passed.
- `npm test -- tests/integration/pre-session-page.test.tsx tests/unit/daily-challenge.test.ts tests/unit/recommendation.test.ts tests/integration/stats-individual-comparison.test.tsx` - passed.
- `npm test` - passed.
- `npm run build` - passed.
- `npm run test:e2e -- tests/e2e/smoke.spec.ts` - passed.

### Next Session Start
1. Закрыть `v0.7.C` (C3-C4): e2e Decision Rush + финальный UX-polish игрового экрана.

## Incremental Update: v0.7.C.2 (2026-03-03)
### Status
- In progress.

### Delivered in this session
- Закрыт основной UX-polish `Decision Rush`:
  - setup-уровни переведены в user-friendly формат (`Легко/Стандарт/Эксперт`),
  - добавлен явный live-status в сессии (`старт/пауза/ответ принят/можно отвечать/завершено`),
  - уточнены тексты обратной связи на разминке и после нажатий (`Ответ принят: ДА/НЕТ`).
- Добавлены стабильные e2e-селекторы в `TrainingHub`:
  - `training-open-*`,
  - `training-plan-*`.
- Добавлен e2e сценарий `tests/e2e/decision-rush.spec.ts`:
  - путь `profiles -> training -> decision-rush -> session -> result -> stats`,
  - путь `pre-session -> decision_pro -> decision setup`.

### Validation
- `npm run check:encoding` - passed.
- `npm test -- tests/integration/training-hub.test.tsx tests/integration/pre-session-page.test.tsx tests/unit/decision-rush-engine.test.ts` - passed.
- `npm run test:e2e -- tests/e2e/decision-rush.spec.ts` - passed.
- `npm run build` - passed.

### Next Session Start
1. Допрогнать полный `npm run test:e2e` и закрыть `v0.7.C` итоговым статусом + фиксацией следующего шага `v0.8.A`.


