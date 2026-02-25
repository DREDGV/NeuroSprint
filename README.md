# NeuroSprint MVP

Когнитивный тренажер скорости мышления для детей (offline-first PWA).

## Документы проекта
- Спецификация: `NeuroSprint_PROJECT_FULL_SPEC_RU.md`
- Дорожная карта: `docs/NeuroSprint_MVP_Roadmap_RU.md`
- Текущий статус исполнения: `docs/NeuroSprint_Execution_Status_RU.md`
- История изменений: `docs/CHANGELOG_RU.md`
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
