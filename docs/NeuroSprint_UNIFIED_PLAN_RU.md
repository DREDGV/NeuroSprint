# NeuroSprint Unified Plan (RU)
Обновлено: 2026-02-28
Источник: объединение `docs/NeuroSprint_MVP_Roadmap_RU.md` + `NeuroSprint_AGENT_PLAN_RU.md` + `deep-research-report (4).md`.

## 1. Текущее состояние (факт)
- Версия: `0.5.0-dev.3`.
- Закрыто: `v0.5.P` (Reaction: сессии + статистика + рекомендации + pre-session интеграция).
- Стабильность: `check:encoding`, `test`, `build`, `test:e2e` — green.
- Открытый следующий крупный блок: локальная соревновательность (лидерборд) + расширение статистики сравнения.

## 2. Зафиксированные решения
1. Архитектура: offline-first, без backend.
2. Хранилище: Dexie/IndexedDB + localStorage.
3. Dev-origin: использовать один адрес (`http://localhost:5173`), не смешивать с `127.0.0.1`.
4. PWA: SW регистрируется в PROD; в DEV SW очищается.
5. Поток запуска (компромисс):
   - быстрый путь: `Home -> Setup -> Session`;
   - расширенный путь: `Home -> Pre-session -> Setup -> Session`.
6. Сравнения в статистике делаем локально по пользователям устройства.
7. Новые модули (кроме улучшения Reaction/Sprint Math) не добавляем до закрытия `v0.6`.

## 3. Scope v0.6 (единый)
### In scope
- Упрощение стартового UX (без путаницы между быстрым стартом и pre-session).
- Сравнительная статистика на `/stats`: `median`, `p25`, `p75` по дням.
- Расширение CSV-экспорта (`userPreferences`, `userModeProfiles`).
- Локальный лидерборд Top-10 (период/режим + подсветка активного пользователя).
- Daily Challenge MVP (локально, без сервера).
- Полный регресс + релизный dev-срез.

### Out of scope
- Облако, аккаунты, синхронизация между устройствами.
- APK/native-сборка.
- Крупные новые игровые модули до завершения `v0.6`.

## 4. Дорожная карта v0.6
| Milestone | Что делаем | Основные файлы | DoD |
|---|---|---|---|
| v0.6.A | Единый старт-флоу (quick start + отдельный pre-session) | `src/pages/HomePage.tsx`, `src/pages/TrainingHubPage.tsx`, `src/pages/PreSessionPage.tsx`, `tests/e2e/smoke.spec.ts` | Запуск тренировки за 2-3 клика, без дублирующих стартов |
| v0.6.B | `/stats` compare mode: `median/p25/p75` | `src/entities/session/sessionRepository.ts`, `src/pages/StatsPage.tsx`, `tests/integration/stats-page-sprint.test.tsx` | Линии сравнения отображаются корректно при пустых и непустых данных |
| v0.6.C | Расширенный CSV экспорт | `src/pages/SettingsPage.tsx` | Экспортирует users/sessions/groups/members/preferences/modeProfiles |
| v0.6.D | Локальный лидерборд Top-10 | `src/entities/session/sessionRepository.ts`, `src/pages/StatsGroupPage.tsx` (или `src/pages/LeaderboardPage.tsx`), `src/app/App.tsx` | Фильтры период/режим, топ-10, подсветка активного пользователя |
| v0.6.E | Daily Challenge MVP | `src/db/database.ts`, `src/pages/HomePage.tsx`, `src/entities/session/sessionRepository.ts` | Есть челлендж дня, попытки, статус выполнено/не выполнено |
| v0.6.F | Hardening + release | `docs/CHANGELOG_RU.md`, `src/shared/constants/changelog.ts`, `docs/NeuroSprint_Execution_Status_RU.md` | Полный регресс green, версия повышена, документация синхронизирована |

## 5. Приоритетный backlog (без лишнего)
1. `v0.6.A` — убрать дубли запуска, оставить 2 ясных входа (быстрый/план).
2. `v0.6.B` — агрегация compare-band по дням на Dexie индексах.
3. `v0.6.B` — UI toggle сравнения и легенда на графике.
4. `v0.6.C` — добавить 2 CSV файла в экспорт настроек.
5. `v0.6.D` — контракт лидерборда (периоды: today/7d/30d, метрика score).
6. `v0.6.D` — UI таблица Top-10 + выделение активного.
7. `v0.6.D` — e2e smoke для лидерборда.
8. `v0.6.E` — Dexie migration v8 (dailyChallenges/challengeAttempts).
9. `v0.6.E` — виджет челленджа на Home.
10. `v0.6.F` — релизный прогон и фиксация `dev` версии.

## 6. Тестовая матрица v0.6
### Unit
- квантильные функции (`p25/p50/p75`), edge-cases пустых массивов;
- leaderboard aggregation (top-10 + tie handling);
- daily challenge status rules.

### Integration
- Home/TrainingHub start-flow (быстрый vs pre-session);
- Stats compare-mode toggle;
- Settings export расширенного набора CSV;
- Leaderboard filters + active user highlight.

### E2E
- smoke: профиль -> быстрый старт -> сессия -> stats;
- leaderboard: фильтр режима/периода -> top-10;
- challenge: запуск/завершение -> статус выполнен.

## 7. Риски и контроль
- Риск потери контекста: после каждого milestone обновлять `Roadmap + Execution Status + Changelog`.
- Риск регрессии маршрутов: e2e smoke обязателен после `v0.6.A`.
- Риск тормозов на статистике: ограничение периодов + использование compound индексов.
- Риск перегруза UI: новые блоки (compare/leaderboard/challenge) добавлять с feature-toggle в настройках dev при необходимости.

## 8. Правила выполнения
1. Делаем по одному milestone за раз.
2. На каждый milestone: код -> тесты -> docs -> commit.
3. Не добавлять новые игровые модули до завершения `v0.6.F`.
4. Любые изменения маршрутов/прав — только с интеграционным тестом.

## 9. Следующий конкретный шаг
- Стартовать `v0.6.A`: привести запуск тренировок к двум четким сценариям (быстрый и через pre-session), затем обновить smoke e2e.