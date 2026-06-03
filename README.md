# WallPrint CMS

SEO-платформа для автоматической публикации статей о **печати на стенах** по всем городам России.

- **AI агент** — анализирует шаблон и адаптирует его под каждый из ~1100 городов
- **Визуальный редактор** — drag & drop конструктор блоков (заголовок, текст, CTA, прайс, отзыв и др.)
- **Собственная аналитика** — трекинг-пиксель, уникальные посетители, время на странице, CTA-клики
- **SEO из коробки** — sitemap.xml, robots.txt, OpenGraph, JSON-LD, мета-теги на каждую статью
- **Next.js 15** + TypeScript + PostgreSQL + Drizzle ORM + Anthropic Claude API

---

## Быстрый старт (локально)

### 1. Требования

- Node.js 20+
- PostgreSQL 15+ (или Docker)

### 2. Установка

```bash
git clone <repo>
cd wallprint-cms
npm install
```

### 3. Переменные окружения

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/wallprint_cms
ANTHROPIC_API_KEY=sk-ant-...        # ключ с platform.anthropic.com
NEXTAUTH_SECRET=<случайная строка>  # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=yourpassword
```

### 4. База данных

```bash
# Запустить PostgreSQL через Docker (если нет локального)
docker run -d --name wallprint-pg \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=wallprint_cms \
  -p 5432:5432 postgres:16-alpine

# Применить схему
npm run db:push

# Заполнить: создать admin-пользователя + загрузить ~50 городов
npm run db:seed
```

### 5. Запуск

```bash
npm run dev
```

Открыть: http://localhost:3000

- **Публичный сайт**: http://localhost:3000
- **CMS**: http://localhost:3000/admin  
- **БД studio**: `npm run db:studio`

---

## Запуск через Docker Compose

```bash
cp .env.example .env
# заполнить ANTHROPIC_API_KEY и NEXTAUTH_SECRET в .env

docker compose up -d

# После запуска — применить схему и seed
docker compose exec app npm run db:push
docker compose exec app npm run db:seed
```

---

## Деплой на VPS / Coolify

### Coolify (рекомендуется)

1. Создать новый сервис → Docker Compose
2. Вставить содержимое `docker-compose.yml`
3. Добавить переменные окружения в интерфейсе Coolify
4. После деплоя выполнить через консоль:
   ```bash
   npm run db:push && npm run db:seed
   ```

### Ручной деплой

```bash
npm run build
npm start
```

---

## Использование

### Создание первой статьи

1. Войдите в `/admin` под учётными данными из `.env`
2. Перейдите в **Редактор** → добавьте блоки
3. Используйте переменные `{{город}}`, `{{регион}}` в тексте — агент их подставит
4. Нажмите **Размножить на города** → выберите режим и округ

### Режимы AI агента

| Режим | Описание | Скорость |
|-------|----------|----------|
| `adapt` | Переписывает текст под специфику города | Средняя |
| `variables_only` | Только подставляет `{{город}}` и т.д. | Быстро |
| `full_rewrite` | Пишет уникальную статью с нуля | Медленно |

### Аналитика

Трекинг работает автоматически — пиксель встроен в каждую публичную страницу. Данные доступны в `/admin/analytics`.

---

## Структура проекта

```
src/
├── app/
│   ├── admin/          # CMS панель
│   │   ├── page.tsx         обзор
│   │   ├── articles/        список статей
│   │   ├── editor/          визуальный редактор
│   │   ├── agent/           управление AI агентом
│   │   └── analytics/       аналитика трафика
│   ├── api/            # REST API
│   │   ├── articles/        CRUD статей
│   │   ├── templates/       шаблоны
│   │   ├── agent/           запуск/пауза агента
│   │   ├── analytics/       данные аналитики
│   │   └── track/           пиксель трекинга
│   ├── goroda/         # Публичные страницы
│   │   ├── page.tsx         список городов
│   │   └── [slug]/          страница статьи
│   ├── login/          # Страница входа
│   ├── sitemap.ts      # Авто-sitemap
│   └── robots.ts       # robots.txt
├── components/
│   ├── TrackPixel.tsx   клиентский трекер
│   ├── Providers.tsx    NextAuth провайдер
│   └── cms/
│       └── AdminSidebar.tsx
├── db/
│   ├── schema.ts        Drizzle схема (8 таблиц)
│   ├── index.ts         подключение к БД
│   └── seed.ts          начальные данные
└── lib/
    ├── agent.ts         AI агент (Anthropic)
    └── auth.ts          NextAuth конфиг
```

---

## Добавление городов

В `src/db/seed.ts` есть ~50 крупных городов. Чтобы добавить все ~1100:

1. Скачайте полный список: https://ru.wikipedia.org/wiki/Список_городов_России
2. Добавьте в массив `CITIES` в `seed.ts` в формате `{ name, slug, region, fd, pop }`
3. Запустите `npm run db:seed` повторно (конфликты игнорируются)

---

## Технологии

- **Next.js 15** (App Router, SSG для статей)
- **TypeScript**
- **PostgreSQL** + **Drizzle ORM**
- **Anthropic Claude API** (claude-opus-4-6)
- **NextAuth.js** (аутентификация)
- **@dnd-kit** (drag & drop в редакторе)
- **Docker / Coolify** совместим

---

## Лицензия

MIT
