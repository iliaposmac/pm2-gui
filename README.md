### Инструкция по развертыванию PM2 WebUI

Проект представляет собой open-source панель управления процессами PM2, заменяющую платный сервис PM2 Plus.

#### 1. Установка и запуск панели

Выполните следующие команды на целевом сервере для клонирования, настройки и запуска интерфейса:

```bash
# Клонирование репозитория панели
git clone https://github.com/iliaposmac/pm2-gui
cd pm2-gui

# Установка зависимостей проекта
npm install

# Создание конфигурационного файла
cp env.example .env

# Обязательная генерация учетной записи администратора для входа в UI
npm run setup-admin-user

# Запуск панели (по умолчанию приложение слушает порт 3000)
npm start

```

*Примечание: Чтобы панель мониторинга работала постоянно в бэкграунде, рекомендуется запустить её через сам PM2:*

```bash
pm2 start npm --name "pm2-webui" -- start

```

---

#### 2. Настройка Nginx Proxy (Порт 4343)

Для того чтобы разработчики могли безопасно заходить в интерфейс через порт **4343**, добавьте следующую конфигурацию в ваш Nginx (`/etc/nginx/sites-available/pm2-webui`):

```nginx

server {
    listen 80 443;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:4343;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

```
