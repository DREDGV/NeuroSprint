# NeuroSprint Changelog (RU)

Формат: фиксируем версии, даты и ключевые изменения для быстрого восстановления контекста.

## [Unreleased]
### План
- Следующий основной шаг: production-доведение `Memory Match` как первого нового memory-модуля.
- `Block Pattern Recall` остаётся в alpha-статусе.
- `Spatial Memory` удерживается в `hold / redesign` до отдельной переработки концепции.

### Изменено
- Выполнена стабилизация пользовательской поверхности:
  - исправлены user-facing тексты в каталогах модулей и режимов,
  - убрана заметная языковая мешанина в ключевых местах.
- `TrainingHub` приведён в честное состояние:
  - `Memory Match`, `Spatial Memory`, `Block Pattern Recall` явно помечены как `Alpha / Прототип`,
  - добавлено пояснение, что эти тренажёры пока не входят в официальную статистику, рекомендации и челлендж дня.
- Улучшен основной пользовательский сценарий вкладки `Статистика`:
  - сверху добавлен короткий полезный итог,
  - затем идёт тренд по периодам,
  - сложные блоки сравнения и челленджа переведены в дополнительные секции.
- `Stats`, `StatsIndividual`, `StatsGroup` теперь явно сообщают, что работают только с официально поддерживаемыми модулями.
- Синхронизированы документы состояния проекта:
  - `docs/NeuroSprint_MVP_Roadmap_RU.md`,
  - `docs/NeuroSprint_Execution_Status_RU.md`,
  - `docs/NeuroSprint_UNIFIED_PLAN_RU.md`,
  - `NeuroSprint_AGENT_PLAN_RU.md`.

## [0.5.0-dev.5] - 2026-03-03
### Изменено
- Синхронизированы mode-контракты и маппинг:
  - N-Back расширен режимами `nback_1_4x4`, `nback_2_4x4`, `nback_3`,
  - добавлены маппинги `memory_grid_* -> memory_grid`,
  - добавлены mode-id для Pattern (`pattern_learning`, `pattern_multi`) в единый список режимов.
- Укреплен pre-session поток:
  - валидация module/mode переведена на динамический каталог `TRAINING_MODULES/TRAINING_MODES`,
  - добавлен launch-path для Memory Grid,
  - добавлены подсказки для расширенных N-Back и Memory Grid режимов.
- Исправлены маршруты Daily Challenge:
  - Memory Grid и Pattern Recognition запускаются в корректные setup-экраны.
- Исправлен `Pattern Recognition` session-flow:
  - корректная инициализация `pattern_multi`,
  - корректное завершение фиксированных серий,
  - исправлено сохранение длительности не-timed сессий.
- В `StatsIndividual` добавлен защитный фильтр неподдержанных режимов (`memory_grid`, `pattern_recognition`) до полной аналитической интеграции.

### Проверки
- `npm run check:encoding` — passed.
- `npm test -- tests/integration/pre-session-page.test.tsx tests/unit/daily-challenge.test.ts tests/unit/recommendation.test.ts tests/integration/stats-individual-comparison.test.tsx` — passed.
- `npm test` — passed.
- `npm run build` — passed.
- `npm run test:e2e -- tests/e2e/smoke.spec.ts` — passed.

## [0.5.0-dev.4] - 2026-03-01
### Добавлено
- Закрыт этап `v0.6.F`:
  - в `/stats` добавлен блок `Daily Challenge: выполнение`,
  - добавлен фильтр периода (`7/30/90/all`) для challenge-аналитики,
  - добавлен список последних challenge с режимом, статусом и прогрессом попыток.
- Расширен `dailyChallengeRepository`:
  - `getCompletionSummary(userId, period)`,
  - `listHistory(userId, period, limit)`.
- Добавлены контракты домена:
  - `DailyChallengeHistoryItem`,
  - `DailyChallengeCompletionSummary`.

### Изменено
- Обновлена встроенная справка (`/help`) и история релизов внутри приложения.
- Обновлена версия приложения до `0.5.0-dev.4`.

### Проверки
- `npm run check:encoding` — passed.
- `npm test -- tests/integration/stats-page-sprint.test.tsx tests/unit/daily-challenge.test.ts tests/integration/home-daily-challenge.test.tsx` — passed.
- `npm test -- tests/unit/reaction-challenges.test.ts tests/integration/reaction-challenge-modes.test.tsx` — passed.
- `npm run test:e2e -- tests/e2e/reaction.spec.ts` — passed.
- `npm run build` — passed.

## [0.5.0-dev.3] - 2026-02-28
### Добавлено
- Новый активный модуль `Reaction` (beta) с быстрым запуском из `Тренировки`.
- В `Reaction` добавлены вариации тренировки:
  - `Сигнал` (классический клик),
  - `Цвет и слово` (поиск соответствия цвета и надписи),
  - `Пара` (поиск целевой пары по подсказке).
- `Reaction` переработан как полноценный игровой экран:
  - добавлен `arena`-блок,
  - для режимов выбора используется квадратное поле `2x2`,
  - добавлен живой таймер во время игры (`таймер серии`, `до сигнала`, `время реакции`).
- Интерактивный компонент подсказок `InfoHint` для дружелюбной навигации.
- Подсказки «Как играть» в `TrainingHub`, `SchulteSetup`, `SprintMathSetup`, `PreSession`.
- E2E smoke нового потока: `tests/e2e/reaction.spec.ts`.
- Reaction включен в статистику:
  - `/stats` (сводка и график),
  - `/stats/individual` (подрежимы),
  - `/stats/group` (module/mode-aware сравнения).
- `Pre-session` поддерживает `module=reaction` и быстрый старт в подрежим:
  - `/training/reaction?mode=reaction_signal|reaction_stroop|reaction_pair`.
- Recommendation engine для `Reaction` переведен в mode-aware режим:
  - поддержка отдельных рекомендаций `reaction_signal`, `reaction_stroop`, `reaction_pair`,
  - причины рекомендаций теперь показывают конкретный подрежим и метрики (`точность`, `среднее время`, `тренд`).
- В `PreSession` добавлены подсказки по выбранному и рекомендованному подрежиму `Reaction`.
- Обновлена версия приложения до `0.5.0-dev.3`.

### Исправлено
- Устранена битая кодировка в новых строках модуля Reaction и связанных тестах.
- Исправлен потенциальный баг навигации по вкладкам в dev-режиме (включая `Профили`) из-за stale service worker/chunk cache:
  - в `src/main.tsx` регистрация SW оставлена только для `PROD`,
  - в `DEV` добавлено авто-удаление service worker, чтобы исключить конфликт старых чанков.

### Проверки
- `npm run check:encoding` — passed.
- `npm test` — passed.
- `npm run build` — passed.
- `npm run test:e2e` — passed.

## [0.5.0-dev.2] - 2026-02-27
### Добавлено
- В `/stats` добавлен верхний блок «Прогресс за период»:
  - сравнение прошлого и текущего периода,
  - изменение в процентах,
  - личный рекорд и дата.
- Обновлена встроенная справка (`/help`) с отдельным блоком «Что нового в текущей версии».

### Изменено
- Исправлена кодировка и русские тексты в ключевых экранах:
  - `Home`, `TrainingHub`, `SprintMathSetup`, `SprintMathSession`, `Stats`, `Classes`, `AppShell`, `MainNav`.
- Страницы `Stats`, `StatsGroup`, `Classes` переведены на единый role-access слой (`useRoleAccess`).
- Исправлено отображение деления в Sprint Math (`/` вместо поврежденного символа).
- Синхронизирована версия приложения: `package.json` + `package-lock.json` -> `0.5.0-dev.2`.

### Проверки
- `npm run check:encoding` — passed.
- `npm run build` — passed.
- `npm test -- tests/integration/stats-page-sprint.test.tsx tests/integration/pre-session-page.test.tsx tests/integration/schulte-grid.test.tsx` — passed.
- `npm run test:e2e -- tests/e2e/classes.spec.ts tests/e2e/smoke.spec.ts tests/e2e/sprint-math.spec.ts` — passed.

## [0.5.0-dev.1] - 2026-02-26
### Добавлено
- Подготовлен dev-релиз `v0.5.0-dev.1` с отображением версии в приложении.
- Добавлены общие контракты прав `buildRoleAccess` и `guardAccess`, а также хук `useRoleAccess`.

### Изменено
- Страницы `Profiles`, `Settings`, `StatsIndividual` переведены на единый action-level слой прав.
- Синхронизированы roadmap/status/help/changelog под завершенный этап `v0.5.K`.

## [0.5.0-dev.0] - 2026-02-25
### Добавлено
- Sprint Math активирован в `TrainingHub` и в аналитике `/stats` и `/stats/individual`.
- Экран `pre-session` (цель дня, рекомендация, быстрый переход в setup).
- Роли интерфейса `Учитель / Ученик / Домашний` и route-level guard для teacher-only разделов.
- Мягкая мотивация: streak badges и мини-цели дня.
- Автопроверка кодировки `npm run check:encoding`.

## [0.4.1] - 2026-02-24
### Добавлено
- Цветовые темы Шульте и advanced-настройка цветов.
- Ручное управление классами и составом учеников.
- Аудио-сигналы start/end по умолчанию, расширенные audio toggles.

## [0.3.0] - 2026-02-24
### Добавлено
- Групповая аналитика и сравнения user/group/global.
- Перцентиль ученика, распределение уровней, динамика группы.

## [0.2.0] - 2026-02-24
### Добавлено
- Новая IA с выделенным разделом «Тренировки».
- Режимы Шульте: `Classic+`, `Timed+`, `Reverse`.
- Адаптивная сложность и ручной override.

## [0.1.0] - 2026-02-23
### Добавлено
- Базовый MVP: профили, активный пользователь, Schulte classic/timed, дневная статистика, PWA.
