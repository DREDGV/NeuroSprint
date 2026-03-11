# NeuroSprint Changelog (RU)

Формат: фиксируем версии, даты и ключевые изменения для быстрого восстановления контекста.

## [0.7.0-dev.1] - 2026-03-12
### Изменено
- `Spatial Memory` переведён из experimental-блока в основной каталог тренажёров.
- В `Training Hub` модуль закреплён в группе памяти как отдельный сценарий на пространственную память и работу с позициями.
- В `Pre-session` добавлен основной маршрут `Spatial Memory Classic`, чтобы модуль участвовал в обычном стартовом потоке.

### Доработано
- Завершён product-pass `Spatial Memory`: крупные сетки `4x4/5x5/6x6`, более сложные spatial-паттерны, авто-завершение раунда, сохранение неверных кликов до конца попытки и стабильный переход между фазами без визуального сдвига поля.
- Обновлены справка и рабочие документы под новый статус модуля: `Spatial Memory` больше не числится как `hold / redesign`.

## [0.7.0-dev.0] - 2026-03-10
### Добавлено
- **Progress System Phase 3C: Skill Map + Achievements + Percentiles** — завершение системы карты навыков:

  - **10 Skill Achievements:**
    - По 2 достижения на каждый навык (50 и 80 очков)
    - Навыки: Внимание, Память, Скорость, Счёт, Логика
    - Награды: 35 XP (50 очков), 50 XP (80 очков)
    - Компонент: `SkillAchievementGrid`

  - **Система процентилей:**
    - Сравнение с "виртуальными игроками"
    - 6 рангов: top_1%, top_5%, top_10%, top_25%, top_50%, bottom_50%
    - Цветовая кодировка для каждого ранга
    - Компонент: `SkillPercentileBar`

  - **Radar Chart навыков:**
    - Визуализация профиля 5 навыков
    - Использует Recharts RadarChart
    - Компонент: `SkillRadarChart`

  - **Рекомендации по тренировкам:**
    - ТОП-3 рекомендации на основе слабых навыков
    - Персонализированные программы для каждого уровня (weak/medium/strong)
    - Частота тренировок в неделю
    - Компонент: `SkillRecommendations`

  - **Вкладка "🎯 Навыки" в StatsPage:**
    - Объединяет все компоненты Phase 3C
    - SkillRadarChart + SkillPercentileBar + SkillRecommendations + SkillAchievementGrid
    - Компонент: `SkillStatsTab`

  - **PvP Foundation (подготовка для Phase 4):**
    - Типы: `LeagueType`, `UserPvPProfile`, `LeaderboardSeason`, `LeaderboardEntry`
    - Зарезервированные поля в БД для лиг и рейтингов
    - Абстракция `IBenchmarkService` для будущей миграции на сервер

  - **База данных:**
    - Version 13 migration (таблицы `userSkillAchievements`, `userPvPProfiles`, `leaderboardSeasons`, `leaderboardEntries`)

  - **Тесты:**
    - `tests/unit/skill-percentile.test.ts` — 15 тестов
    - `tests/unit/skill-recommendation.test.ts` — 18 тестов
    - `tests/unit/skill-achievement.test.ts` — 15 тестов
    - Итого: 48 новых тестов

### Изменено
- `StatsPage.tsx` — добавлена вкладка "🎯 Навыки" между "📊 Статистика" и "🏆 Достижения"
- `domain.ts` — добавлены типы `SkillAchievement`, `UserSkillAchievement`, `SkillSummary`, `SkillMapSummary`, `LeagueType`, `UserPvPProfile`, `LeaderboardSeason`, `LeaderboardEntry`
- `database.ts` — version 13 migration

### Новые файлы
- `src/features/skills/` — новый feature-модуль:
  - `components/SkillRadarChart.tsx`
  - `components/SkillPercentileBar.tsx`
  - `components/SkillAchievementGrid.tsx`
  - `components/SkillRecommendations.tsx`
  - `components/SkillStatsTab.tsx`
  - `index.ts`
- `src/shared/lib/progress/skillAchievementList.ts` — каталог из 10 skill достижений
- `src/shared/lib/progress/skillPercentileService.ts` — сервис процентилей
- `src/shared/lib/progress/skillRecommendationService.ts` — сервис рекомендаций
- `src/entities/achievement/skillAchievementRepository.ts` — репозиторий skill достижений

### Проверки
- `npm run build` — passed
- `npm test` — 48 новых тестов добавлено

## [0.6.0-dev.0] - 2026-03-09
### Добавлено
- **Progress System Phase 2: Levels + Achievements** — система уровней и достижений:
  - **XP система:**
    - Базовое XP за сессию: 10 XP
    - Streak множитель: +10% за каждый день подряд (до 2x = 20 XP)
    - Формула уровня: `XP = 100 + (level-1) * 50`
    - Автоматическое начисление при сохранении сессии
  
  - **24 достижения:**
    - Серии дней: 3, 7, 14, 30 дней
    - Количество сессий: 10, 50, 100, 500
    - Дневные цели: perfect day (5+ сессий)
    - Навыки: по 10 сессий в каждом модуле (6 шт.)
    - Специальные: all modules, level 5/10/20
  
  - **UI компоненты:**
    - `LevelProgressWidget` — виджет уровня на HomePage
    - `AchievementList` — список достижений с фильтрами
    - `LevelUpModal` — celebration при повышении уровня
    - `AchievementUnlockedToast` — уведомление о достижении
  
  - **Интеграция:**
    - HomePage: LevelProgressWidget + LevelUp modal
    - StatsPage: вкладка "🏆 Достижения"
    - SessionResultSummary: отображение "+X XP", Level Up, достижений

- **База данных:**
  - Version 11 migration (таблицы `userLevels`, `userAchievements`, `xpLogs`)
  - Автоматическая инициализация уровня 1 для новых пользователей

- **Тесты:**
  - `tests/unit/xp-calculator.test.ts` — 20+ тестов для XP системы

### Изменено
- `sessionRepository.save()` — возвращает `SessionSaveResult` с XP и достижениями
- `HomePage.tsx` — интеграция LevelProgressWidget и LevelUpModal
- `StatsPage.tsx` — добавлена вкладка "Достижения"
- `SessionResultSummary.tsx` — props для XP/Level Up/Achievements
- `SprintMathSessionPage.tsx` — передача XP данных в SessionResultSummary
- `package.json` — версия обновлена до `0.6.0-dev.0`
- `changelog.ts` — добавлены записи о Phase 1 и Phase 2

### Проверки
- `npm run lint` — passed
- `npm run build` — passed
- `npm test` — 200/201 тестов (99.5%)

## [0.5.0-dev.6] - 2026-03-09
### Добавлено
- **Daily Training System (Phase 1 — Progress System)** — новая система дневного прогресса:
  - Сущность `DailyTraining` для отслеживания дневной цели (сессии в день).
  - Репозиторий `dailyTrainingRepository` с методами:
    - `getOrCreateForToday()` — получить или создать прогресс на сегодня.
    - `registerSession()` — автоматически регистрирует сессию в daily training.
    - `getCompletionSummary()` — сводка выполнения за период.
    - `getStreakSummary()` — подсчёт серии подряд идущих завершённых дней.
    - `listHistory()` — история дней с деталями.
    - `listCompletionTrend()` — тренд выполнения для визуализации.
    - `getHeatmapData()` — данные для календаря с heatmap.
  - База данных обновлена до версии 10 (таблицы `dailyTrainings`, `dailyTrainingSessions`).
  - Интеграция с `sessionRepository.save()` — автоматическая регистрация сессий.

- **UI компоненты Daily Training:**
  - `DailyTrainingWidget` — виджет с прогрессом за сегодня, серией дней, сводкой за 30 дней и heatmap календарём.
  - `HeatmapCalendar` — календарь с визуализацией активности (как на GitHub).
  - `ConfettiCelebration` — анимация конфетти при достижении дневной цели.
  - `CelebrationModal` — модальное окно с поздравлением при completion дня.

- **Обновление HomePage:**
  - Интегрирован `DailyTrainingWidget`.
  - Добавлено celebration modal при достижении дневной цели.
  - Исправлено: celebration modal показывается только 1 раз в день.

- **Тесты:**
  - `tests/unit/daily-training.test.ts` — 24 unit теста для `dailyTrainingRepository`.
  - Все тесты проходят (100% coverage основных функций).

- **Зависимости:**
  - Добавлен `fake-indexeddb` для unit тестирования.

### Изменено
- `vitest.setup.ts` — добавлена инициализация `fake-indexeddb/auto`.
- `HomePage.tsx` — рефакторинг с разделением Daily Training и legacy motivation блоков.

### Проверки
- `npm run check:encoding` — passed.
- `npm test -- tests/unit/daily-training.test.ts` — 24 теста passed.
- `npm run lint` — passed.
- `npm run build` — passed.
- `npm run test:e2e` — passed.

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
