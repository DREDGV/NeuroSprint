# NeuroSprint MVP Roadmap (RU)

## Scope
### In scope (MVP + v0.4 + v0.4.2 + v0.5.K)
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
- Встроенная страница `Справка` с историей версий внутри приложения (`/help`).
- Проектный `CHANGELOG` с версионированием и датами (`docs/CHANGELOG_RU.md`).
- Явная индикация активного пользователя в UI (header + home + session pages).
- Роли интерфейса: `Учитель`, `Ученик`, `Домашний` с ролевой навигацией и назначением роли на уровне профиля пользователя.
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

## Interfaces & Contracts
### Routes
- `/`
- `/training`
- `/training/pre-session`
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
- `ns.appRole`

### Domain contracts (актуально)
- `Mode = "classic" | "timed" | "reverse" | "sprint_math"`
- `GridSize = 3 | 4 | 5 | 6`
- `Session` расширен полями `moduleId`, `modeId`, `level`, `presetId`, `adaptiveSource`, `visualThemeId`, `audioEnabledSnapshot`.
- Добавлены `UserModeProfile`, `AdaptiveDecision`, `ClassGroup`, `GroupMember`, `UserPreference`, `SchulteThemeConfig`, `AudioSettings`.
- Добавлен контракт `SprintMath` (`setup`, `task`, `metrics`, `session contract`) как отдельный слой подготовки v0.5.

### Repository contracts
- `userRepository.create(name, role)/list/getById/rename/updateRole/remove`
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
- motivation helpers (streak badges + daily mini-goals).

### Integration
- training hub.
- pre-session page (goal + recommendation + quick-start route).
- motivation block rendering in pre-session/home flows.
- permissions/roles matrix on nav and pages.
- classes page (class + student flows).
- settings dev-mode visibility.
- stats comparison blocks (individual/group).
- schulte grid behavior.

### E2E smoke
- profile -> home -> pre-session -> classic -> stats.
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
