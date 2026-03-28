# NeuroSprint: вывод в онлайн

## Что уже можно сделать сейчас

1. Выложить основной сайт на `нейроспринт.рф` через Vercel.
2. Поднять backend на VPS для API и WebSocket.
3. Разнести сервисы по поддоменам, чтобы не конфликтовать с другим проектом на том же VPS.

Для первого публичного запуска можно оставить только индивидуальные тренировки:

- `VITE_FEATURE_CLASSES_UI=false`
- `VITE_FEATURE_COMPETITIONS_UI=false`
- `VITE_FEATURE_GROUP_STATS_UI=false`
- `VITE_FEATURE_ONLINE_COMPETITIONS=false`
- разделы классов, соревнований и групповой статистики будут скрыты

## Рекомендуемая схема

- `нейроспринт.рф` и `www.нейроспринт.рф` -> фронтенд на Vercel
- `api.нейроспринт.рф` -> VPS, reverse proxy на `127.0.0.1:3211`
- `ws.нейроспринт.рф` -> VPS, reverse proxy на `127.0.0.1:3212`

Такая схема не мешает второму проекту на VPS, потому что:

- у NeuroSprint свои `server_name` в `nginx`
- у NeuroSprint свои внутренние порты `3211/3212`
- backend и Redis можно запускать отдельным `docker compose` стеком
- наружу можно не открывать порты `3211/3212`, только `80/443` через `nginx`

## Что подготовлено в репозитории

- [vercel.json](/c:/Users/dr-ed/NeuroSprint/vercel.json)
- [docs/DEPLOY_VERCEL_RU.md](/c:/Users/dr-ed/NeuroSprint/docs/DEPLOY_VERCEL_RU.md)
- [backend/.env.example](/c:/Users/dr-ed/NeuroSprint/backend/.env.example)
- [backend/Dockerfile](/c:/Users/dr-ed/NeuroSprint/backend/Dockerfile)
- [backend/ecosystem.config.cjs](/c:/Users/dr-ed/NeuroSprint/backend/ecosystem.config.cjs)
- [deploy/docker-compose.backend.yml](/c:/Users/dr-ed/NeuroSprint/deploy/docker-compose.backend.yml)
- [deploy/nginx/neurosprint-online.conf.example](/c:/Users/dr-ed/NeuroSprint/deploy/nginx/neurosprint-online.conf.example)
- [src/shared/lib/online/runtimeConfig.ts](/c:/Users/dr-ed/NeuroSprint/src/shared/lib/online/runtimeConfig.ts)

## Важное ограничение текущей версии

Индивидуальные тренировки уже нормально переводятся в онлайн как обычный сайт.

Но для настоящих сетевых соревнований ещё нужен один слой, которого пока нет в продукте:

- централизованная идентификация пользователей между устройствами

Сейчас профили пользователей живут локально в браузере через IndexedDB/localStorage. Это значит:

- один и тот же ученик на двух устройствах пока не является одним серверным пользователем
- backend можно поднять уже сейчас
- но полноценные соревнования между разными устройствами потребуют следующего шага: серверные аккаунты или хотя бы упрощённый online-login

## Практический порядок запуска

1. Опубликовать фронтенд на Vercel.
2. Создать DNS-записи:
   - корень домена -> Vercel
   - `www` -> Vercel
   - `api` -> IP VPS
   - `ws` -> IP VPS
3. На VPS поднять backend как отдельный стек.
4. Подключить `nginx`-конфиг только для `api.*` и `ws.*`.
5. Выпустить HTTPS через Certbot.
6. После этого перевести фронтенд на production env:
   - `VITE_API_BASE_URL=https://api.нейроспринт.рф`
   - `VITE_WS_URL=wss://ws.нейроспринт.рф`
7. Следующим этапом добавить серверные профили/авторизацию.

## Минимальный MVP для соревнований

Если нужен самый быстрый путь до первой живой сетевой версии, следующий шаг в коде должен быть таким:

1. серверная регистрация/логин по имени или коду класса
2. выдача server-side `userId`
3. перевод `competitionRepository` и `challengeRepository` с IndexedDB на HTTP API + WebSocket

Именно это превращает текущий локальный прототип в настоящий онлайн-сервис.
