# Аудит перед миграцией: Vercel + Supabase → домашний сервер

Дата: 2026-11-25 · ветка `main`, коммит `0e65057` · только чтение кода и документов.
Не запускались: сборка, lint, приложение, Docker. К Supabase и Vercel запросов не было. Значения секретов не выводились.

## 0. Главное

- **Браузер не обращается к базе напрямую.** Все запросы идут с сервера. Это сильно упрощает переезд.
- **Всю защиту данных даёт RLS Supabase.** В запросах нет фильтра по `user_id`, у большинства Server Actions нет проверки входа. На обычном Postgres это надо переписать, иначе приложение будет открыто.
- **Сложность: средняя.** Основная работа: слой данных, вход, хранение фото.
- **Рекомендация:** переходить на обычный PostgreSQL (вариант C, раздел 11).
- Только перенос приложения на дом с оставшимся облачным Supabase, скорее всего, **замедлит** его.

## 1. Стек

| Что | Факт |
|---|---|
| Фреймворк | Next.js `16.4.2`, App Router, Turbopack; React `19.3.0`; TypeScript 5 |
| Стили | Tailwind 4 через `@tailwindcss/turbopack` |
| Node | в проекте не зафиксирован (нет `engines`, `.nvmrc`). Next требует `>=20.9.0`, локально `22.23.2`, `@types/node ^20`. Версия на Vercel: нужно проверить в панели |
| Пакеты | npm, `package-lock.json` (v3) |
| Команды | `npm run build` (`next build`), `npm run start` (`next start`), `npm run lint`. Скрипта `typecheck` нет, хотя он упомянут в `docs/STATE.md` |
| Режим вывода | `output` не задан, обычный SSR. Layout читает cookies (`src/app/layout.tsx:37`), поэтому страницы динамические |
| Зависимости | `@supabase/ssr 0.12.7`, `@supabase/supabase-js 2.118.0`, `@dnd-kit/*`, `next`, `react`, `react-dom` |

## 2. Привязка к Vercel

| Пункт | Результат |
|---|---|
| `vercel.json`, `.vercel/` | не найдено |
| `@vercel/*` в зависимостях | не найдено |
| Edge Runtime | не найдено. `src/app/api/notes/ocr/route.ts:7` задаёт `nodejs` |
| Middleware | `src/proxy.ts` (Proxy в Next 16, работает на Node.js, при self-hosting настройки не требует) |
| ISR, `revalidate`, `unstable_cache` | не найдено. Есть только `revalidatePath` в Server Actions |
| Cron, `maxDuration` | не найдено |
| `next/image` | `Cover.tsx:57` (обложки, через оптимизатор), `PhotoThumbnail.tsx:34` (`unoptimized`) |
| `images.remotePatterns` | books.google.com, books.googleusercontent.com, covers.openlibrary.org, `*.supabase.co` |
| Переменные Vercel (`VERCEL_*`) | не используются |
| Косвенная зависимость | `src/lib/request-origin.ts:6-7` берёт адрес из `x-forwarded-proto` и `x-forwarded-host` |

**Route Handlers:**

| Маршрут | Метод | Проверка входа внутри |
|---|---|---|
| `/auth/callback` | GET | не нужна (OAuth) |
| `/api/books/search` | GET | да |
| `/api/notes/ocr` | POST | да |
| `/api/export/json` | GET | да |
| `/api/export/books.csv` | GET | да |
| `/api/export/sessions.csv` | GET | да |
| `/api/export/photos` | GET | да |
| `/notes/export` | GET | **нет**, только proxy + RLS |

**Server Actions:** 33 функции в 10 файлах `actions.ts`. Проверка пользователя есть только в трёх действиях с загрузкой фото (`src/app/notes/actions.ts:90,115,144`).

## 3. Как используется Supabase

### База
- Только `supabase-js` (PostgREST). Прямого `pg`, Prisma, Drizzle нет.
- **123 вызова `.from(...)`** в 9 файлах `src/lib/db/`: readings 33, books 30, sessions 23, notes 22, goals 10, ocr_usage 4, settings 1.
- `.rpc()` не найдено.

### Браузер → Supabase
- **Прямых вызовов SDK из браузера: 0.** `src/lib/supabase/client.ts` нигде не импортируется (мёртвый код). Клиентские компоненты берут из `lib/db` только типы.
- Браузер всё же ходит на домен Supabase в двух случаях:
  1. OAuth-редирект Google (`src/app/login/actions.ts:28-37`).
  2. Подписанные ссылки на фото: показ (`PhotoThumbnail.tsx:34`) и ZIP-бэкап (`DataSection.tsx:139`).

### Авторизация
| Что | Где |
|---|---|
| Email + пароль | `login/actions.ts:15` |
| Google OAuth (PKCE) | `login/actions.ts:28`, обмен кода `auth/callback/route.ts:24` |
| Выход | `settings/actions.ts:10` |
| Проверка JWT (`getClaims`) | `lib/supabase/proxy.ts:30`, `lib/get-current-user.ts:16` |
| Magic link, писем, регистрации | не найдено. По `docs/SETUP.md` регистрация закрыта |
| Redirect URL | код: `{origin}/auth/callback`. По `SETUP.md` в Supabase: адрес Vercel `/**`, `localhost:3000/**`, маска превью. В Google указан callback `https://<ref>.supabase.co/auth/v1/callback`. Проверить в панелях |

### Storage
- Один приватный бакет `note-photos` (миграция `0003`): лимит 5 МБ, `image/jpeg|png|webp`.
- Фото страниц книг, путь `{user_id}/{note_id}.jpg`, путь хранится в `notes.photo_path`.
- Операции: `upload`, `remove`, `createSignedUrl(s)` на 1 час (`src/lib/db/photos.ts`).

### Прочее
| Пункт | Результат |
|---|---|
| Realtime | не найдено |
| Edge Functions | не найдено |
| Функции и триггеры БД | в миграциях не найдено. Опция «Enable automatic RLS» (`SETUP.md`) могла создать event trigger: проверить в панели |
| Расширения | явных нет. `gen_random_uuid()` встроена в Postgres 13+ |
| `supabase/` | только `migrations/`. `config.toml`, `seed.sql`, дампа схемы нет |
| Номера миграций | `0001–0003`, `0005–0009`. **`0004` нет.** Сверить с реальной схемой через `pg_dump --schema-only` |

### RLS (31 политика по миграциям)
| Объект | Политики |
|---|---|
| `books`, `readings`, `sessions`, `notes`, `goals`, `settings` | `<таблица>_{select,insert,update,delete}_own` (24) |
| `ocr_usage` | `select`, `insert`, `update` (3) |
| `storage.objects` | `note_photos_{select,insert,update,delete}_own` (4) |

## 4. База

| Таблица | Назначение и связи |
|---|---|
| `books` | `user_id → auth.users`; полки `want, reading, done, paused, dropped, collection` |
| `readings` | `book_id → books` (cascade), `user_id → auth.users` |
| `sessions` | `reading_id → readings` (cascade), `user_id → auth.users` |
| `notes` | `book_id → books` (cascade, может быть NULL), `user_id → auth.users` |
| `goals` | `reading_id → readings` (cascade), `user_id → auth.users` |
| `settings` | PK `user_id → auth.users`. В коде используется только в экспорте |
| `ocr_usage` | PK `(user_id, day)`, `user_id → auth.users` |

- **Все 7 таблиц** ссылаются на `auth.users(id)`; `user_id` заполняется `default auth.uid()` (код его не передаёт).
- **Все политики** зависят от `auth.uid()`; миграции выдают права роли `authenticated`.
- Индексы: `user_id` везде, `books(user_id,shelf,queue_position)`, `sessions(user_id,started_at)`, `sessions(reading_id)`, `notes(book_id)`, уникальные частичные на `goals`.
- Нет индекса на `readings(book_id)`, хотя по нему идёт много запросов. При текущем объёме эффект мал, в новой схеме добавить.
- **Объём:** из кода не виден. Оценка для одного пользователя с октября 2026: сотни–тысячи строк, меньше 50 МБ данных; фото, вероятно, десятки МБ (клиент сжимает до 1600 px). Нужно проверить в панели.

## 5. Переменные окружения

| Имя | Где используется | Тип | В `.env.example` | В `.env.local` |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/{server,proxy,client}.ts` | публичная, вшивается при сборке | да | да |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | там же | публичная, вшивается при сборке | да | да |
| `GOOGLE_BOOKS_API_KEY` | `lib/google-books.ts:70` (необязательна) | секрет | да | нет |
| `ANTHROPIC_API_KEY` | `lib/ocr.ts:66` | секрет | **нет** | нет |
| `ANTHROPIC_OCR_MODEL` | `lib/ocr.ts:69` (необязательна, по умолчанию `claude-haiku-5-5`) | настройка | **нет** | нет |
| `NODE_ENV` | `app/dev/kit/page.tsx:5` | системная | — | — |

Поиск по типовым форматам ключей в отслеживаемых файлах совпадений не дал (историю git этот поиск не проверял). `.env*` в `.gitignore`.

## 6. PWA и внешние API

| Пункт | Факт |
|---|---|
| Manifest | `src/app/manifest.ts`, `standalone`, 3 иконки |
| Service worker | `public/sw.js`: без кеша, пропускает все запросы в сеть. Регистрация `RegisterServiceWorker.tsx` |
| Offline, push | нет (по решению в `STATE.md`) |
| Локальное состояние | активная сессия в `localStorage` (`lib/active-session.ts`), тема и язык в cookies |
| Камера | `getUserMedia`, нужен HTTPS; заголовок `Permissions-Policy` для `/session/photo` |
| Google Books | `googleapis.com/books/v1`, ключ необязателен |
| Open Library | `openlibrary.org`, без ключа (запасной) |
| Anthropic | `api.anthropic.com/v1/messages`, лимит 30 в день |
| Google Fonts | `next/font/google`: скачиваются **при сборке**, сборщику нужен интернет |

**При смене домена:** PWA ставится заново, вход выполняется заново, незавершённая сессия таймера пропадёт.

## 7. Docker

`Dockerfile`, `docker-compose`, `.dockerignore` не найдены. Ниже **черновик, не проверен сборкой**.

Нужно изменить в `next.config.ts`: добавить `output: "standalone"`.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* вшиваются при сборке. После перехода на Postgres убрать.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
```

`.dockerignore`:
```
node_modules
.next
.git
.env*
.claude
docs
new-icons
*.tsbuildinfo
```

- Секреты (`ANTHROPIC_API_KEY`, `GOOGLE_BOOKS_API_KEY`) задавать только как runtime-переменные в Coolify, не как build args.
- Healthcheck идёт на `/login`: остальные пути без входа отвечают редиректом.

### Coolify и Cloudflare Tunnel
- Проверить, что `x-forwarded-proto=https` доходит через tunnel → прокси Coolify. Иначе `redirectTo` станет `http://`. Надёжнее ввести `APP_URL` и использовать её в `request-origin.ts`.
- Если Server Actions отвечают ошибкой Origin/Host, задать `serverActions.allowedOrigins`.
- В Cloudflare не кешировать HTML и `sw.js`, выключить Rocket Loader.

## 8. Почему тормозит (4–5 секунд)

**Замеров не делалось.** Ниже причины по коду. Он объясняет, почему задержка умножается, но не доказывает именно 4–5 с: при регионе функций рядом с базой цепочка из 10 запросов обычно занимает доли секунды. Значит, вероятно, есть ещё большая сетевая задержка или холодный старт. Это надо измерить.

### 1. Длинные цепочки последовательных запросов в действиях
Счёт ниже: примерное число последовательных обращений к базе.

| Действие | Цепочка | ≈ |
|---|---|---|
| Пауза или отказ | `readings.ts:166-209` → `books.ts:185-190` + два рендера страницы | 10–13 |
| Старт сессии (книга не в «Читаю») | `session/actions.ts:36-43` → `books.ts:244-267` + рендер | ~9 |
| Сохранение сессии | `session/actions.ts:56-57` → `sessions.ts:138-168` → переход на книгу | 7–11 |
| Смена полки со страницы книги | `books.ts:217-310` + два рендера | 9–12 |

- `renumberQueue` (`books.ts:85-102`) читает очередь и обновляет книги по одной; `reorderQueue` (`books.ts:175-181`) делает `UPDATE` на каждую книгу.
- Записи идут без транзакций: обрыв посередине оставит несогласованные данные.
- **Исправление:** Postgres на том же сервере, объединить в транзакции и JOIN.

### 2. Страница рендерится дважды
- Действие вызывает `revalidatePath`, и его ответ уже содержит новый рендер текущей страницы.
- Затем клиент делает ещё и `router.refresh()`: `BookDetail.tsx:89,107,128,135,141`, `LibraryView.tsx:342,350,357,364`, `NotesView.tsx:102`, `HomeView.tsx:51`, `DeadlineDialog.tsx:102,111`.
- Каждый лишний рендер: проверка в proxy + все запросы страницы (на книге около 12).
- В `LibraryView.tsx:89` список лежит в `useState(initialBooks)` и после refresh не обновляется, то есть для списка этот refresh бесполезен.
- **Исправление:** убрать `router.refresh()` после действий с `revalidatePath`, проверяя каждый экран.

### 3. Нет мгновенной реакции на нажатие
- Оптимистичное обновление есть только у части действий (смена полки и очередь в библиотеке, полка на странице книги).
- Нет ни одного `loading.tsx`. Для динамических маршрутов без него Next не делает prefetch, и переход ждёт полного ответа сервера.
- Вкладки полок, фильтры и сортировка в библиотеке меняют URL через `router.replace` (`LibraryView.tsx:101-119`). Данные уже в браузере, но интерфейс обновится только после ответа сервера. **Исправление:** `window.history.replaceState`.
- `StatsView.tsx:32,41` и `NotesView.tsx:50` не используют `isPending`: кнопка выглядит «не нажатой».
- Новые состояния загрузки описать в `docs/DESIGN.md` (сейчас они не нарисованы).

### 4. Server Actions выполняются по очереди, часть из них лишние
Next отправляет действия с одного клиента строго по одному.
- `session/finish/page.tsx:59,70`: экран пустой, пока не выполнятся два действия подряд.
- `SessionView.tsx:63,134,174`: пустой экран до конца `prepareSessionAction`, затем ещё запрос.
- `Sidebar.tsx:32-34` вызывает действие и на телефоне (панель только скрыта через CSS) там, где не передан `today`: история, правка книги, добавление книги. Оно может задержать ваше следующее нажатие. Действие тянет и серию за 400 дней, хотя боковой панели она не нужна.
- **Исправление:** загружать данные в серверных компонентах, передавать `today`.

### 5. Инфраструктура (из кода не видно)
- Регион функций Vercel: раньше был `iad1` при базе в Ирландии, это давало 2–3 с (`docs/CHANGELOG.md:122`). **Проверить, что стоит `dub1` или `lhr1`.**
- Холодный старт функций и ограничения Supabase Free.
- `getClaims()` при симметричном ключе JWT (HS256) делает **сетевой запрос в Auth на каждый вызов**; при асимметричном проверяет локально (ключи кешируются на 10 минут). Проверить тип ключа в панели.
- Как измерить: DevTools → Network (TTFB запросов действий и `?_rsc=`) и логи функций Vercel.

### Дополнительно: тяжёлые запросы (скажутся с ростом данных)
- Главная: 15–20+ запросов; `getYearPlan` и `fetchReadingSection` по 3 последовательных (`books.ts:327-357`, `home.ts:61-97`).
- N+1: дедлайны, до 3 запросов на каждую читаемую книгу (`home.ts:122-130`, `goals.ts:121`).
- Без ограничения выборки: серия (`sessions.ts:245-249`), статистика «всё время» (`stats.ts:77`), цитата дня (`notes.ts:357-359`), теги (`notes.ts:259`).
- Заметки: читаются все, пагинация и поиск в памяти (`notes.ts:59-87`).
- Service worker проксирует каждый запрос (`sw.js:12-14`): на Android это может добавить задержку при пробуждении, вклад нужно измерить.

## 9. Репозиторий

| Что | Факт |
|---|---|
| Хостинг | GitHub, `escobarte/reading-tracker` (видимость проверить) |
| Ветки | `main`, `feat/free-notes`, `feat/year-plan`, `fix/genre-picker` (`feat/free-notes` и `fix/genre-picker` слиты в `main`, `feat/year-plan` на том же коммите, что `main`) |
| Коммиты | 58 |
| CI | не найдено (нет `.github/`) |
| Деплой | по `SETUP.md`: push в `main` публикует на Vercel, ветки получают превью |

## 10. Ресурсы (оценка, не замер)

| Компонент | RAM | CPU |
|---|---|---|
| Приложение, покой | 120–200 МБ | близко к 0 |
| Приложение, лимит контейнера | 512 МБ – 1 ГБ | 0.5–1 vCPU |
| **Сборка** в Coolify (кратковременно) | 1.5–2 ГБ свободных | 2 vCPU |
| PostgreSQL (вариант C) | 256–512 МБ | 0.5 vCPU |
| Полный Supabase (вариант B) | 2–4 ГБ и выше | 2 vCPU |

Диск: образ сотни МБ, данные и фото первые сотни МБ плюс место под бэкапы. Для `sharp` на glibc при росте памяти смотреть настройки аллокатора.

## 11. Итог

### Варианты

| | A: только приложение | B: self-hosted Supabase | **C: обычный Postgres** |
|---|---|---|---|
| Изменения кода | почти нет | мало | слой данных, вход, фото |
| Сложность | легко | средне | **средне** |
| Срок (грубо) | до 1 дня | 1–2 дня | 3–6 дней |
| Скорость | вероятно хуже (дом ↔ Ирландия на каждый запрос) | хорошая | хорошая |
| Минус | облачная зависимость остаётся | много контейнеров и обновлений | больше работы |

**Рекомендую C:** вы хотите свой PostgreSQL, пользователь один, Realtime и функций БД нет, браузер в базу не ходит. B берите, только если не хотите переписывать код.

### Блокеры и что переписать (C)

| # | Что | Объём |
|---|---|---|
| 1 | Все запросы на `supabase-js` | 123 вызова, 9 файлов `lib/db` |
| 2 | **Защита держится на RLS.** Добавить проверку входа в каждый Server Action и Route Handler; proxy одного недостаточно | 33 действия, 8 маршрутов |
| 3 | Схема: убрать `auth.users`, `auth.uid()`, роль `authenticated`, `storage.*`; задать `user_id` в коде или через default | 8 миграций → новая схема |
| 4 | Вход: Google и пароль | `proxy.ts`, `get-current-user.ts`, `login/*`, `auth/callback`, `logout` |
| 5 | Фото: volume на диске + защищённый маршрут вместо подписанных ссылок | `photos.ts`, `export.ts`, `DataSection.tsx` |
| 6 | **Типы:** драйвер Postgres по умолчанию отдаёт `timestamptz` и `date` как `Date`, `numeric` как строку. Код ждёт ISO-строки (`localeCompare`, `slice`) | настроить режим строк |
| 7 | Конфиг: `output: "standalone"`, убрать `*.supabase.co`, добавить `APP_URL` | мало |

### План

Предлагаемая ветка: `feat/self-hosting` (ветку создаёт владелец).

1. **Подготовка.** Пройти раздел 12. Сделать `pg_dump` (схема и данные) и копию бакета. Измерить текущую задержку.
2. **Контейнер.** `output: "standalone"`, Dockerfile, `.dockerignore`. Проверить локальную сборку.
3. **Postgres** в Coolify, порт наружу не открывать. Версия не ниже, чем в Supabase.
4. **Схема.** Свести миграции в одну без Supabase-объектов, добавить индекс `readings(book_id)`. UUID пользователя **сохранить**: он есть в строках и путях фото.
5. **Слой данных.** Переписать `lib/db` на Drizzle ORM, сохранив сигнатуры функций. Смену полок и сохранение сессии сделать транзакциями.
6. **Вход.** Better Auth или Auth.js (совместимость с Next 16.4 проверить): Google + пароль, только разрешённый email, регистрация закрыта. Пароль задать заново. Проверка входа в каждом действии и маршруте.
7. **Фото.** Volume, например `/data/photos/{user_id}/{note_id}.jpg`, маршрут выдачи с проверкой входа.
8. **Скорость.** Пункты 2–4 раздела 8.
9. **Перенос данных.** `pg_dump --data-only` нужных таблиц, фото из бакета. Сверить число строк по каждой таблице и число файлов.
10. **Деплой.** Coolify, переменные, домен через Cloudflare Tunnel, новый redirect URI в Google Cloud.
11. **Бэкапы.** Ежедневный `pg_dump` и копия фото **вне этого сервера**; проверить восстановление.
12. **Переключение.** Завершить сессию таймера, не вносить данные, сделать финальный перенос, проверить на телефоне, переустановить PWA. Vercel и Supabase держать 2–4 недели для отката (Free-проект может встать на паузу; данные, внесённые после переключения, назад сами не вернутся).
13. **Уборка.** Удалить `@supabase/*`, обновить `docs/STATE.md` и `SETUP.md`.

Домен нужен: Cloudflare Tunnel с постоянным адресом требует зону в Cloudflare, а в `STATE.md` записано «свой домен не нужен».

### Замечено попутно (есть уже сейчас)
- **Лимит 1000 строк** у API Supabase по умолчанию: статистика, серия и JSON-экспорт могут молча обрезаться. Поэтому переносить данные через `pg_dump`, **не** через экспорт приложения.
- **Лимит тела Server Action 1 МБ** не увеличен в `next.config.ts`, а фото уходит в действие как base64 (`PhotoNoteWizard.tsx`, `createNoteWithPhotoAction`). Крупный снимок может не сохраниться. Проверить; при необходимости задать `serverActions.bodySizeLimit`.
- Proxy не исключает `/icon.svg` и `/apple-icon.png`: без входа они отвечают редиректом.
- `.env.example` не содержит переменные Anthropic.

## 12. Проверить вручную

### Vercel
- [ ] Settings → Functions: регион (ожидается `dub1` или `lhr1`) и был ли деплой после смены.
- [ ] Версия Node.js, тариф, расход лимитов.
- [ ] Список переменных окружения (Production и Preview), есть ли обе серверные.
- [ ] Логи и длительность функций, холодные старты.

### Supabase
- [ ] Регион (по документам `eu-west-1`), тариф, размер compute.
- [ ] Размер БД и Storage, число файлов в `note-photos`, расход трафика.
- [ ] Число строк по таблицам (особенно `sessions` и `notes` относительно 1000).
- [ ] Когда была последняя пауза проекта.
- [ ] Версия Postgres, строка подключения для `pg_dump` (на Free прямое подключение обычно только IPv6, тогда Session pooler).
- [ ] API → Max rows.
- [ ] Тип JWT signing key (HS256 или асимметричный).
- [ ] Database: Functions, Triggers, Extensions, Policies; сравнить с миграциями (включая пропуск `0004`).
- [ ] Выполнены ли `0005–0009`.
- [ ] Auth: провайдеры, Redirect URLs, UUID пользователя, регистрация закрыта.
- [ ] Наличие бэкапов (на Free на них не рассчитывать).

### Google Cloud, Anthropic, дом
- [ ] Ограничения ключа Books API по IP или referrer: адрес сервера изменится.
- [ ] OAuth-клиент: redirect URI; режим Testing и тестовый пользователь.
- [ ] Anthropic: остаток кредитов и лимит расходов.
- [ ] Сервер: свободные RAM и диск, место для внешних бэкапов, поведение при отключении света и интернета.
