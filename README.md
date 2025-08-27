## Bitrix Integrations Platform

Веб‑приложение на **Next.js (App Router)** для управления проектами и интеграциями c **Bitrix24** через вебхуки. Поддерживает создание подключений (connections) с маппингом входящего JSON в поля сделки или лида Bitrix, централизованное управление пользователями (только через администратора) и безопасную обработку входящих webhook запросов.

## Основные возможности

- Аутентификация через JWT (cookie `auth-token`)
- Роли пользователей: `ADMIN`, `USER`
- Админ‑панель `/admin`:
	- Создание пользователей (email, пароль, роль)
	- Редактирование (имя, роль, смена пароля)
	- Удаление пользователей (с защитой от удаления последнего админа)
- Личный дашборд пользователя `/dashboard`
- Управление проектами (CRUD) — каждый видит только свои
- Управление связями (connections) Bitrix для проекта (генерация уникального inbound webhook URL)
- Категории интеграций: `CREATE_DEAL`, `CREATE_LEAD`
- Маппинг входящих полей (JSON -> поля сущности Bitrix) с гибкой конфигурацией
- Прокси‑вызов в Bitrix API (`crm.deal.add`, `crm.lead.add`)
- Защита API через middleware
- Systemd unit пример для production запуска

## Технологии

| Компонент | Используется |
|-----------|--------------|
| Framework | Next.js 15 (App Router, Turbopack dev) |
| Язык | TypeScript |
| UI | shadcn/ui (Radix + Tailwind) |
| ORM | Prisma |
| БД | PostgreSQL |
| Auth | JWT (jsonwebtoken, bcryptjs) |

## Быстрый старт (Dev)

Требования: Node 20+ (рекомендуется LTS), PostgreSQL.

1. Клонировать репозиторий
2. Установить зависимости:
```bash
npm install
```
3. Настроить переменные окружения в `.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/bitrix"
JWT_SECRET="замените-на-уникальную-строку"
```
4. Применить миграции:
```bash
npx prisma migrate deploy
```
5. (Опционально) Сгенерировать Prisma Client:
```bash
npx prisma generate
```
6. Запустить dev сервер:
```bash
npm run dev
```
7. Открыть: http://localhost:3000 (или реальный порт если задан `-p`).

## Production сборка

```bash
npm run build
npm run start   # next start (используются HOST/PORT из скрипта)
```

Systemd unit пример: `deploy/bitrixintegrations.service.example`. Копируйте в `/etc/systemd/system/bitrixintegrations.service`, отредактируйте пользователя, переменные, затем:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bitrixintegrations.service
sudo systemctl status bitrixintegrations.service
```

## Роли и доступ

| Действие | USER | ADMIN |
|----------|------|-------|
| Просмотр своих проектов | ✅ | ✅ |
| CRUD своих проектов | ✅ | ✅ |
| Просмотр чужих проектов | ❌ | (через /admin проекты) ✅ |
| Управление пользователями | ❌ | ✅ |
| Создание connections | ✅ (в своем проекте) | ✅ |
| Изменение роли других | ❌ | ✅ |

Админка доступна только авторизованным с role=ADMIN. Неавторизованный или не‑админ перенаправляется на `/login` (API получает 403).

## Создание первого администратора

Если админа нет — вручную обновите роль любого пользователя через SQL:
```bash
psql postgresql://USER:PASSWORD@localhost:5432/bitrix -c "UPDATE \"User\" SET role='ADMIN' WHERE email='you@example.com';"
```
После этого войдите и зайдите `/admin` для управления пользователями.

### Текущий тестовый админ (смените пароль!)
Email: `admin@example.com`
Пароль: `VVWfLQAHPI6gBmFs`

Рекомендуется сразу:
1. Войти.
2. Сменить пароль через форму редактирования пользователя.
3. Поменять `JWT_SECRET` и перезапустить сервис.

## Архитектура

```
src/
	app/
		api/        # REST endpoints (Next.js route handlers)
		admin/      # Админ UI
		dashboard/  # Пользовательский дашборд
		project/[id]# Просмотр проекта и связей
	lib/
		auth.ts     # JWT + bcrypt
		db.ts       # Prisma клиент
```

## Поток обработки входящего вебхука Bitrix
1. Запрос приходит на: `/api/webhook/bitrix/[token]`
2. По `token` находится запись `Connection` (через `webhookUrl`)
3. Проверяется статус связи (`ACTIVE`)
4. Применяется JSON‑маппинг `fieldMapping` к payload
5. Формируется объект `deal` или `lead` и отправляется в Bitrix (или возвращается mock если тестовый URL)
6. Возвращается `{ success: true, result: ... }`

Пример POST payload:
```json
{
	"name": "arman",
	"comment": "aaaa"
}
```

Маппинг хранится в `connection.fieldMapping` (JSON массив правил `{ sourceField, targetField }`).

## Основные API (кратко)

| Метод | Endpoint | Описание | Требует роль |
|-------|----------|----------|-------------|
| POST | /api/auth/login | Логин | - |
| POST | /api/auth/logout | Выход | Авторизация |
| GET  | /api/projects | Список проектов пользователя | USER/ADMIN |
| POST | /api/projects | Создать проект | USER/ADMIN |
| GET  | /api/projects/:id | Получить свой проект | USER/ADMIN |
| PUT  | /api/projects/:id | Обновить свой проект | USER/ADMIN |
| DELETE | /api/projects/:id | Удалить свой проект | USER/ADMIN |
| GET  | /api/projects/:id/connections | Список connections | Владелец/ADMIN |
| POST | /api/projects/:id/connections | Создать connection | Владелец/ADMIN |
| GET  | /api/projects/:id/connections/:connectionId | Получить connection | Владелец/ADMIN |
| PUT  | /api/projects/:id/connections/:connectionId | Обновить connection | Владелец/ADMIN |
| DELETE | /api/projects/:id/connections/:connectionId | Удалить connection | Владелец/ADMIN |
| GET  | /api/admin/users | Список пользователей | ADMIN |
| POST | /api/admin/users | Создать пользователя | ADMIN |
| PATCH | /api/admin/users/:id | Обновить (роль/пароль/имя) | ADMIN |
| DELETE | /api/admin/users/:id | Удалить | ADMIN |
| POST | /api/webhook/bitrix/:token | Входящий вебхук | По токену |

## Миграции БД

Миграции лежат в `prisma/migrations`. Для применения:
```bash
npx prisma migrate deploy
```
Для локальной разработки (создать новую):
```bash
npx prisma migrate dev --name add_something
```

## Безопасность

- ОБЯЗАТЕЛЬНО замените `JWT_SECRET` в `.env`
- Ограничьте доступ к `/admin` на уровне reverse‑proxy (доп. слой)
- Логи вебхуков могут содержать данные — не оставляйте `console.log` в продакшене при необходимости
- Регистрацию публичную мы отключили — пользователи только через админа
- Защита от потери всех админов: нельзя удалить/понизить последнего

## Отладка

Просмотр структуры таблиц:
```bash
psql $DATABASE_URL -c "\\d \"User\""
```
Prisma Studio (локально):
```bash
npx prisma studio
```

## Деплой с systemd (пример)

1. `cp deploy/bitrixintegrations.service.example /etc/systemd/system/bitrixintegrations.service`
2. Правим пути/пользователя/Environment
3. `sudo systemctl daemon-reload`
4. `npm run build`
5. `sudo systemctl restart bitrixintegrations.service`

## Roadmap / Возможные улучшения

- Логирование действий админа (аудит)
- Rate limiting для вебхуков
- UI для просмотра логов/результатов отправки в Bitrix
- Перегенерация webhook токена
- Импорт/экспорт маппингов

## Лицензия

Проект приватный (лицензия не указана). Добавьте LICENSE при необходимости.

---
Если нужна помощь с доработкой — создайте issue или опишите задачу.
