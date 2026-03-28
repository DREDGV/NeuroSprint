# 🚀 Развертывание NeuroSprint Backend на VPS (Hoster.ru)

## 📋 Требования к VPS

### Минимальная конфигурация:
- **CPU:** 2 ядра
- **RAM:** 2 GB
- **Disk:** 20 GB SSD
- **OS:** Ubuntu 20.04/22.04 LTS

### Рекомендуемая конфигурация:
- **CPU:** 4 ядра
- **RAM:** 4 GB
- **Disk:** 40 GB SSD
- **OS:** Ubuntu 22.04 LTS

---

## 📝 Шаг 1: Подготовка сервера

### 1.1. Подключение к серверу

```bash
# Подключение по SSH
ssh root@ваш-ip-адрес

# Или через панель hoster.ru
# Панель управления → VPS → Консоль
```

### 1.2. Обновление системы

```bash
apt update && apt upgrade -y
```

### 1.3. Создание пользователя для приложения

```bash
# Создать пользователя
adduser neurosprint

# Добавить в sudo (опционально)
usermod -aG sudo neurosprint

# Переключиться на пользователя
su - neurosprint
```

---

## 🔧 Шаг 2: Установка зависимостей

### 2.1. Node.js (версия 18+)

```bash
# Через NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Проверка версии
node -v  # Должно быть >= 18.0.0
npm -v
```

### 2.2. PostgreSQL

```bash
# Установка
sudo apt install -y postgresql postgresql-contrib

# Запуск
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверка статуса
sudo systemctl status postgresql
```

### 2.3. Redis

```bash
# Установка
sudo apt install -y redis-server

# Запуск
sudo systemctl start redis
sudo systemctl enable redis

# Проверка
redis-cli ping  # Должно вернуть: PONG
```

### 2.4. Nginx (Reverse Proxy)

```bash
# Установка
sudo apt install -y nginx

# Запуск
sudo systemctl start nginx
sudo systemctl enable nginx

# Проверка
systemctl status nginx
```

### 2.5. PM2 (Process Manager)

```bash
# Установка глобально
sudo npm install -g pm2

# Проверка
pm2 -v
```

---

## 🗄️ Шаг 3: Настройка баз данных

### 3.1. PostgreSQL

```bash
# Войти в PostgreSQL
sudo -u postgres psql

# Создать базу данных
CREATE DATABASE neurosprint;

# Создать пользователя
CREATE USER neurosprint_user WITH PASSWORD 'ваш-сложный-пароль';

# Дать права
GRANT ALL PRIVILEGES ON DATABASE neurosprint TO neurosprint_user;

# Выйти
\q
```

### 3.2. Redis

```bash
# Проверка подключения
redis-cli ping

# Опционально: настроить пароль
sudo nano /etc/redis/redis.conf

# Найти строку:
# requirepass foobared

# Заменить на:
requirepass ваш-сложный-пароль-redis

# Перезапустить Redis
sudo systemctl restart redis
```

---

## 📦 Шаг 4: Деплой приложения

### 4.1. Клонирование репозитория

```bash
cd /home/neurosprint
git clone https://github.com/ваш-username/NeuroSprint.git
cd NeuroSprint/backend
```

### 4.2. Установка зависимостей

```bash
npm install --production
```

### 4.3. Создание .env файла

```bash
nano .env
```

**Содержимое .env:**
```env
# Server
PORT=3001
WS_PORT=3002
NODE_ENV=production

# JWT Secret (сгенерируйте случайную строку!)
JWT_SECRET=ваш-очень-сложный-secret-ключ-минимум-32-символа

# PostgreSQL
DATABASE_URL=postgresql://neurosprint_user:ваш-пароль-postgres@localhost:5432/neurosprint

# Redis
REDIS_URL=redis://:ваш-пароль-redis@localhost:6379

# CORS (разрешить ваш домен)
ALLOWED_ORIGINS=https://neurosprint.ru,https://www.neurosprint.ru
```

### 4.4. Настройка Nginx

```bash
sudo nano /etc/nginx/sites-available/neurosprint
```

**Конфигурация Nginx:**
```nginx
server {
    listen 80;
    server_name neurosprint.ru www.neurosprint.ru;

    # Frontend (статические файлы)
    location / {
        root /home/neurosprint/NeuroSprint/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Важно для WebSocket!
        proxy_read_timeout 86400;
    }
}
```

**Активация сайта:**
```bash
# Создать симлинк
sudo ln -s /etc/nginx/sites-available/neurosprint /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

### 4.5. Настройка SSL (HTTPS)

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d neurosprint.ru -d www.neurosprint.ru

# Автоматическое обновление
sudo certbot renew --dry-run
```

---

## 🚀 Шаг 5: Запуск приложения

### 5.1. Сборка backend

```bash
cd /home/neurosprint/NeuroSprint/backend
npm run build
```

### 5.2. Запуск через PM2

```bash
# Запуск приложения
pm2 start dist/index.js --name neurosprint-backend

# Сохранить список процессов
pm2 save

# Автозапуск при загрузке
pm2 startup

# Выполнить команду из вывода (для автозапуска)
# Например: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u neurosprint
```

### 5.3. Мониторинг

```bash
# Статус процессов
pm2 status

# Логи
pm2 logs neurosprint-backend

# Детальная информация
pm2 show neurosprint-backend

# Перезапуск
pm2 restart neurosprint-backend

# Остановка
pm2 stop neurosprint-backend
```

---

## 🔒 Шаг 6: Безопасность

### 6.1. Настройка фаервола (UFW)

```bash
# Установка
sudo apt install -y ufw

# Разрешить SSH
sudo ufw allow OpenSSH

# Разрешить HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# Разрешить только локальный доступ к портам приложения
sudo ufw allow from 127.0.0.1 to any port 3001
sudo ufw allow from 127.0.0.1 to any port 3002

# Включить фаервол
sudo ufw enable

# Статус
sudo ufw status
```

### 6.2. Настройка PostgreSQL для локального доступа

```bash
# Редактировать конфигурацию
sudo nano /etc/postgresql/14/main/postgresql.conf

# Найти listen_addresses и установить:
listen_addresses = 'localhost'

# Перезапустить PostgreSQL
sudo systemctl restart postgresql
```

### 6.3. Rate Limiting в Nginx

```nginx
# Добавить в server блок в /etc/nginx/sites-available/neurosprint

# Ограничение запросов
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://localhost:3001;
    # ... остальные настройки
}
```

---

## 📊 Шаг 7: Мониторинг и логи

### 7.1. Логи приложения

```bash
# PM2 логи
pm2 logs neurosprint-backend --lines 100

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL логи
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 7.2. Мониторинг ресурсов

```bash
# Установка htop
sudo apt install -y htop

# Запуск
htop

# Использование диска
df -h

# Использование памяти
free -h
```

### 7.3. Мониторинг PM2

```bash
# Интерактивный мониторинг
pm2 monit

# Метрики в реальном времени
pm2 monit --no-daemon
```

---

## 🔄 Шаг 8: Обновление приложения

```bash
cd /home/neurosprint/NeuroSprint

# Pull изменений
git pull origin main

# Установка зависимостей
cd backend
npm install --production

# Сборка
npm run build

# Перезапуск
pm2 restart neurosprint-backend
```

---

## 🧪 Шаг 9: Тестирование

### 9.1. Проверка API

```bash
# Health check
curl https://neurosprint.ru/api/health

# Ожидаемый ответ:
# {"status":"ok","timestamp":"2026-03-27T12:00:00.000Z"}
```

### 9.2. Проверка WebSocket

```javascript
// В браузере (консоль)
const ws = new WebSocket('wss://neurosprint.ru/ws?token=ваш-JWT-токен');

ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.onerror = (e) => console.error('Error:', e);
```

### 9.3. Проверка производительности

```bash
# Установка Apache Bench
sudo apt install -y apache2-utils

# Тестирование API (100 запросов, 10 параллельных)
ab -n 100 -c 10 https://neurosprint.ru/api/health
```

---

## ⚠️ Решение проблем

### Проблема: WebSocket не подключается

**Проверьте:**
1. Nginx конфигурацию (proxy_set_header Upgrade)
2. Фаервол (порт 3002 должен быть доступен локально)
3. PM2 статус (pm2 status)

```bash
# Проверка логов
pm2 logs neurosprint-backend
sudo tail -f /var/log/nginx/error.log
```

### Проблема: PostgreSQL не подключается

**Проверьте:**
1. Статус PostgreSQL
2. Пользователя и базу данных
3. CONNECTION_URL в .env

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "\du"
sudo -u postgres psql -c "\l"
```

### Проблема: Redis не работает

```bash
# Проверка статуса
sudo systemctl status redis

# Проверка подключения
redis-cli ping

# Если требует пароль
redis-cli -a ваш-пароль ping
```

---

## 📈 Оптимизация производительности

### 1. Настройка PostgreSQL

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**Рекомендуемые значения:**
```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
max_connections = 100
```

### 2. Настройка Redis

```bash
sudo nano /etc/redis/redis.conf
```

**Рекомендуемые значения:**
```conf
maxmemory 512mb
maxmemory-policy allkeys-lru
```

### 3. Настройка Node.js

```bash
# Увеличить лимит памяти (опционально)
export NODE_OPTIONS="--max-old-space-size=512"
```

---

## 💰 Стоимость на hoster.ru

| Тариф | CPU | RAM | Disk | Цена/мес |
|-------|-----|-----|------|----------|
| VPS 1 | 2 ядра | 2 GB | 20 GB | ~200 руб |
| VPS 2 | 3 ядра | 3 GB | 30 GB | ~300 руб |
| VPS 3 | 4 ядра | 4 GB | 40 GB | ~400 руб |

**Рекомендую:** VPS 2 или VPS 3 для комфортной работы

---

## ✅ Чек-лист после деплоя

- [ ] PostgreSQL работает и база создана
- [ ] Redis работает и подключается
- [ ] Backend запущен через PM2
- [ ] Nginx настроен и раздает frontend
- [ ] WebSocket подключается
- [ ] HTTPS настроен (Certbot)
- [ ] Фаервол настроен (UFW)
- [ ] Логи пишутся
- [ ] Мониторинг работает (pm2 monit)
- [ ] Резервное копирование настроено

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи (`pm2 logs`, `nginx error.log`)
2. Проверьте статус сервисов (`systemctl status`)
3. Проверьте фаервол (`ufw status`)

---

**Готово!** 🎉 Ваш backend сервер готов к работе!
