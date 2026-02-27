# NeuroSprint Changelog (RU)

Формат: фиксируем версии, даты и ключевые изменения для быстрого восстановления контекста.

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
