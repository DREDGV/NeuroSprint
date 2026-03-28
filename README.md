# NeuroSprint

Когнитивный тренажер скорости мышления для детей (offline-first PWA).

## 🎯 Возможности

### Когнитивные тренажёры

- 📊 **Таблица Шульте** — классический, таймер, обратный
- 🧩 **Pattern Recognition** — 5 режимов, выживание
- 🧠 **Memory Grid** — запоминание ячеек
- ⚡ **Reaction** — 4 типа реакции
- ➗ **Sprint Math** — устный счёт
- 🎯 **N-Back** — рабочая память
- 🗺️ **Spatial Memory** — пространственная память
- 🧠 **Decision Rush** — скорость принятия решений
- 🎴 **Memory Match** — поиск пар

### Система прогресса

- ⭐ Уровни и XP
- 🏆 Достижения
- 📈 Статистика и бенчмарки
- 🎯 Карта навыков (внимание, память, реакция, математика, логика)

### Классы и соревнования

- 📚 Управление классами
- 👥 Ученики и группы
- ⚔️ PvP вызовы
- 🏆 Соревнования (асинхронные/синхронные)
- 📊 Лидерборды
- 🔔 Уведомления
- 📅 Тепловая карта активности

## Документы проекта

- Спецификация: `NeuroSprint_PROJECT_FULL_SPEC_RU.md`
- Дорожная карта: `docs/NeuroSprint_MVP_Roadmap_RU.md`
- Текущий статус: `docs/NeuroSprint_Execution_Status_RU.md`
- История изменений: `docs/CHANGELOG_RU.md`
- **Соревнования и уведомления:** `docs/COMPETITIONS_AND_NOTIFICATIONS.md`
- Встроенная справка в приложении: `/help`

## Быстрый старт

```powershell
npm install --ignore-scripts
npm run dev
```

Если в окружении задан proxy на `127.0.0.1:9`, перед установкой временно очистите переменные:

```powershell
Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:ALL_PROXY,Env:GIT_HTTP_PROXY,Env:GIT_HTTPS_PROXY -ErrorAction SilentlyContinue
$env:npm_config_offline='false'
```

## Проверки

```powershell
npm run build
npm test
npm run test:e2e
```

## Структура проекта

```
src/
├── app/                    # Приложение (App.tsx, стили)
├── db/                     # База данных (IndexedDB/Dexie)
├── entities/               # Бизнес-сущности
│   ├── challenge/          # Вызовы (PvP)
│   ├── competition/        # Соревнования
│   ├── group/              # Классы/группы
│   ├── notification/       # Уведомления
│   ├── session/            # Сессии тренировок
│   ├── skill/              # Навыки
│   └── user/               # Пользователи
├── features/               # Фичи
│   ├── competitions/       # Соревнования (компоненты, хуки)
│   ├── notifications/      # Уведомления
│   └── [trainer]*/         # Тренажёры
├── pages/                  # Страницы
│   ├── ClassesPage.tsx     # Классы
│   ├── CompetitionsPage.tsx # Соревнования
│   └── ...
├── shared/                 # Общие утилиты
│   ├── lib/                # Библиотеки
│   ├── types/              # Типы
│   └── constants/          # Константы
└── widgets/                # Виджеты
    ├── ClassDashboardWidget.tsx
    ├── LeaderboardWidget.tsx
    ├── ClassSkillRadar.tsx
    └── ...
```

## Технологический стек

- **Frontend:** React 18, TypeScript, Vite
- **State:** React Hooks (useState, useEffect, useContext)
- **DB:** IndexedDB (Dexie.js)
- **Routing:** React Router DOM
- **Charts:** Recharts
- **PWA:** vite-plugin-pwa
- **Testing:** Vitest, Playwright

## Лицензия

MIT
