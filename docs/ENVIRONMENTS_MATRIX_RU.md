# NeuroSprint: матрица окружений

## 1. Local development

Использование:

```powershell
npm run dev
```

Цель:

- обычная разработка
- можно включать скрытые функции через `Настройки -> Режим разработчика`

Базовый env:

```env
VITE_FEATURE_CLASSES_UI=false
VITE_FEATURE_COMPETITIONS_UI=false
VITE_FEATURE_GROUP_STATS_UI=false
VITE_FEATURE_ONLINE_COMPETITIONS=false
```

Если нужно локально проверить скрытую функцию, лучше включать её через local override в браузере, а не через постоянное изменение env.

## 2. Preview deployment

Цель:

- проверить новую функцию в интернете до публикации
- дать ссылку тестерам
- открыть скрытую функцию только в preview

Пример для теста классов:

```env
VITE_FEATURE_CLASSES_UI=true
VITE_FEATURE_COMPETITIONS_UI=false
VITE_FEATURE_GROUP_STATS_UI=true
VITE_FEATURE_ONLINE_COMPETITIONS=false
```

Пример для теста будущих соревнований UI:

```env
VITE_FEATURE_CLASSES_UI=true
VITE_FEATURE_COMPETITIONS_UI=true
VITE_FEATURE_GROUP_STATS_UI=true
VITE_FEATURE_ONLINE_COMPETITIONS=false
```

## 3. Production

Цель:

- только стабильные функции
- ничего полуготового

Для первого публичного запуска:

```env
VITE_FEATURE_CLASSES_UI=false
VITE_FEATURE_COMPETITIONS_UI=false
VITE_FEATURE_GROUP_STATS_UI=false
VITE_FEATURE_ONLINE_COMPETITIONS=false
```

Когда классы будут готовы:

```env
VITE_FEATURE_CLASSES_UI=true
VITE_FEATURE_COMPETITIONS_UI=false
VITE_FEATURE_GROUP_STATS_UI=true
VITE_FEATURE_ONLINE_COMPETITIONS=false
```

Когда соревнования будут готовы вместе с backend:

```env
VITE_FEATURE_CLASSES_UI=true
VITE_FEATURE_COMPETITIONS_UI=true
VITE_FEATURE_GROUP_STATS_UI=true
VITE_FEATURE_ONLINE_COMPETITIONS=true
VITE_API_BASE_URL=https://api.нейроспринт.рф
VITE_WS_URL=wss://ws.нейроспринт.рф
```

## Главное правило

Если функция ещё не готова для пользователей:

- код можно писать
- тестировать можно
- в preview включать можно
- в production флаг должен оставаться выключенным
