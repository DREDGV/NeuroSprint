# NeuroSprint Changelog (RU)

Формат: фиксируем версии, даты и ключевые изменения для быстрого восстановления контекста.

## [Unreleased]
### План
- Локальный лидерборд и соревновательный слой без backend (по этапу 6 `NeuroSprint_AGENT_PLAN_RU.md`).

### Изменено
- Стартовый UX приведен к двум явным сценариям:
  - `Быстрый старт` с `Home` напрямую в активные тренировки,
  - отдельный путь `План дня` через `Pre-session`.
- На `Home` добавлены быстрые входы для `Classic`, `Sprint Math`, `Reaction`.
- Обновлен smoke-сценарий `home -> pre-session -> setup` для защиты нового контракта запуска.
- На `/stats` добавлен compare-mode `median/p25/p75`:
  - toggle включения сравнения,
  - выбор периода (`7/30/90/all`),
  - отдельный график `Вы / P25 / Медиана / P75`,
  - summary-карточки по последнему дню.
- В `Настройках` расширен CSV-экспорт:
  - добавлены файлы `user_preferences` и `user_mode_profiles`,
  - экспортный набор теперь включает users/sessions/classes/preferences/mode-profiles.
- В `Индивидуальной статистике` добавлен локальный `Лидерборд Top-10`:
  - фильтр периода (`7/30/90/all`),
  - mode-aware рейтинг по текущему выбранному режиму,
  - подсветка активного пользователя в списке.
- В `/stats` расширен блок `Daily Challenge`:
  - добавлена `текущая серия` и `лучшая серия` выполнения,
  - добавлен долгосрочный тренд по дням (`0/100%`),
  - добавлено количество выполненных challenge-дней в выбранном периоде.
- Расширен `dailyChallengeRepository`:
  - `getStreakSummary(...)`,
  - `listCompletionTrend(...)`,
  - чистый helper `buildDailyChallengeStreak(...)`.
- Исправлены битые строки в challenge-локализации (`Reaction` titles, тексты challenge).
- Добавлен новый режим в `Reaction`: `Число-цель` (`reaction_number`):
  - выбор целевого числа в сетке `2x2`,
  - запуск из pre-session и через query `?mode=reaction_number`,
  - сохранение сессий и участие в статистике/recommendation.
- Улучшена дружелюбность pre-session:
  - обновлены тексты и подсказки по режимам `Reaction`,
  - очищена кодировка `PreSessionPage` до корректного UTF-8.
- Реализован новый модуль `N-Back Lite`:
  - setup `/training/nback` (выбор `1-back/2-back`, `60/90 сек`),
  - session `/training/nback/session` (сетка `3x3`, ответы `Совпало/Не совпало`, таймер и прогресс),
  - сохранение сессий в IndexedDB (`taskId/moduleId="n_back"`, `modeId="nback_1|nback_2"`).
- `N-Back Lite` интегрирован в:
  - `TrainingHub` и `Pre-session`,
  - simple/individual/group статистику,
  - recommendation engine,
  - daily challenge ротацию и launch-path.

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

### Обновлено (v0.5.P.1)
- Reaction теперь сохраняет завершенные сессии в IndexedDB (`taskId=reaction`, modeId: `reaction_signal|reaction_stroop|reaction_pair`).
- В `sessionRepository` добавлена дневная агрегация Reaction (`ReactionDailyPoint`) и поддержка `aggregateDailyByModeId`.
- В `/stats` добавлен режим `Reaction` с графиком (лучшее/среднее время реакции, точность) и сводными карточками.
- В `/stats/individual` добавлены подрежимы Reaction и их динамика в графиках.
- В `/stats/group` добавлен модуль `Reaction` и выбор подрежимов для group/global-сравнений.
- Обновлен e2e-сценарий Reaction для устойчивого старта после создания профиля.

### Проверки (v0.5.P.1)
- `npm run check:encoding` - passed.
- `npm test -- tests/unit/session-aggregation.test.ts tests/integration/stats-page-sprint.test.tsx tests/integration/stats-individual-comparison.test.tsx` - passed.
- `npm run build` - passed.
- `npm run test:e2e -- tests/e2e/reaction.spec.ts` - passed.

### Обновлено (v0.5.P.2)
- Recommendation engine учитывает `Reaction`:
  - добавлен mode-рекомендатор `reaction_signal`,
  - `reaction_stroop`/`reaction_pair` нормализуются в единый recommendation-bucket,
  - для «untrained Reaction» снижен приоритет, чтобы не перебивать базовые режимы без причины.
- `Pre-session` теперь поддерживает модуль `Reaction` и быстрый запуск в конкретный режим:
  - `/training/pre-session?module=reaction`
  - переход на `/training/reaction?mode=reaction_signal|reaction_stroop|reaction_pair`.
- `ReactionPage` читает query `mode` и открывает соответствующий вариант тренировки.
- `TRAINING_MODES` расширен до Schulte + Sprint Math + Reaction.
- Добавлены тесты на reaction-flow в pre-session и рекомендации.

### Проверки (v0.5.P.2)
- `npm test -- tests/unit/recommendation.test.ts tests/integration/pre-session-page.test.tsx tests/integration/training-hub.test.tsx` - passed.
- `npm test -- tests/integration/stats-individual-comparison.test.tsx tests/integration/stats-group-comparison.test.tsx tests/integration/stats-page-sprint.test.tsx` - passed.
- `npm run test:e2e -- tests/e2e/reaction.spec.ts` - passed.
- `npm run check:encoding` - passed.
- `npm run build` - passed.



