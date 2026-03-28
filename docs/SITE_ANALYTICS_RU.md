# Аналитика сайта NeuroSprint

## Что уже подключено

В проект подключены:

- `@vercel/analytics/react`
- `@vercel/speed-insights/react`

Это даёт:

- page views по сайту
- посещаемость основных разделов
- посещаемость конкретных тренажёров по маршрутам
- базовые performance-метрики страницы

## Где смотреть в Vercel

В проекте `neurosprint`:

1. `Analytics` — посещаемость и страницы
2. `Speed Insights` — производительность и Web Vitals

## Какие маршруты будут полезны в аналитике

Из-за нормализации маршрутов в аналитике будут аккуратные пути:

- `/`
- `/profiles`
- `/training`
- `/training/schulte`
- `/training/schulte/:mode`
- `/training/sprint-math`
- `/training/sprint-math/session`
- `/training/reaction`
- `/training/nback`
- `/training/nback/session`
- `/training/memory-grid`
- `/training/memory-grid/session`
- `/training/decision-rush`
- `/training/decision-rush/session`
- `/training/pattern-recognition`
- `/training/pattern-recognition/session`
- `/training/pattern-recognition/result`
- `/training/memory-match`
- `/training/spatial-memory`
- `/training/block-pattern`
- `/stats`
- `/settings`
- `/help`

Это позволяет видеть:

- сколько людей открывает главную
- сколько доходит до вкладки тренировок
- какие тренажёры открывают чаще всего
- где люди чаще обрывают путь

## Какие custom events уже отправляются кодом

Подготовлены события:

- `profile_created`
- `profile_activated`
- `training_session_completed`

Событие завершения тренировки отправляет только технические и безопасные поля:

- `module_id`
- `mode_id`
- `duration_sec`
- `score`
- `accuracy_pct`
- `speed`
- `leveled_up`
- `daily_training_completed`

Личные данные пользователя не отправляются.

## Важное ограничение

По документации Vercel:

- page views доступны на `Hobby`
- расширенные custom events могут требовать `Pro` для полноценного использования и расширенного окна отчётов

То есть уже сейчас вы получите полезную аналитику по страницам и разделам, а для более глубокой продуктовой аналитики по событиям может понадобиться апгрейд тарифа.

## Что я рекомендую следующим шагом

1. Посмотреть первые page views в `Analytics`
2. Проверить `Speed Insights` на мобильных устройствах
3. Через несколько дней оценить:
   - какие страницы открывают чаще всего
   - какие тренажёры реально используют
   - где пользователи чаще всего останавливаются
4. Если захочется воронок и событий глубже — добавить отдельную продуктовую аналитику или включить расширенные возможности Vercel
