# NeuroSprint Execution Status (RU)

## Дата/время
- 2026-02-24 22:35

## Что завершено
- Реализован и стабилизирован `v0.4` (A-E):
- Шульте Visual+: темы `Ч/Б`, `Контраст`, `Мягкая`, `Радуга` + advanced-настройка цветов.
- Прогрессия уровней со стартом `3x3` и лестницей до `6x6`.
- Новый раздел `Классы`: создание/переименование/удаление класса, создание ученика, перенос между классами, bulk add списком.
- Звук: start/end по умолчанию, optional click/correct/error, `mute` и `volume`.
- Dev-mode в настройках: demo/benchmark скрыты при `devMode=false`.
- Исправлен критичный сбой миграции Dexie v5 (`ConstraintError` из-за duplicate index в `groupMembers`).
- Добавлены/обновлены `data-testid` для устойчивых e2e сценариев.
- Добавлен/обновлён e2e контур: smoke, classes, comparison, benchmark.
- Полный регресс подтверждён:
- `npm test`
- `npm run build`
- `npm run test:e2e`
- Внедрён пакет рекомендаций из deep-research:
- Timed метрики: `effectiveCorrect` больше не уходит в минус (clamp до 0).
- Адаптация сложности в `SchulteSessionPage`: `withLevelDefaults` применяется при прямом входе и после авто-решения.
- Агрегация Reverse без подмены `mode`.
- Dexie upgraded до `version(6)` с индексом `[userId+moduleId+modeId+timestamp]` для быстрых recent-сессий.
- `trainingRepository.listRecentSessionsByMode` переведён на индексный range-query.
- Добавлен CSV-экспорт из `Настроек` (`users`, `sessions`, `classGroups`, `groupMembers`).
- Добавлены a11y/pwa улучшения: `:focus-visible` стили и iOS подсказка по установке PWA.
- Добавлен CI workflow `.github/workflows/ci.yml` (`npm test`, `npm run build`, `npm run test:e2e`).
- После внедрения рекомендаций снова подтверждён полный регресс:
- `npm test`
- `npm run build`
- `npm run test:e2e`

## Что в работе
- Подготовка релизной фиксации `alpha-v0.4.1` и выбор способа деплоя.

## Блокеры
- Технических блокеров нет.

## Следующие 3 шага
1. Зафиксировать релиз `alpha-v0.4.1` (commit + tag + push).
2. Выбрать и настроить деплой: `Netlify` (предпочтительно) или `GitHub Pages` (с SPA fallback).
3. После релиза перейти к roadmap `v0.5` (первый новый модуль).

## Команды для быстрого старта
```powershell
npm install
npm run dev
npm test
npm run build
npm run test:e2e
```
