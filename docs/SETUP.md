# SETUP — Reading Tracker

> Что настроено вне кода и как это повторить: GitHub, Vercel, Supabase, переменные окружения.
> Ключи и пароли в этот файл не записываем. Обновляется, когда меняется настройка.

---

## 1. Как всё связано

| Сервис | Зачем | Что делает владелец |
|---|---|---|
| GitHub | хранит код и ветки | создаёт ветки, делает commit, merge, push |
| Vercel | публикует сайт | сам собирает сайт после push; основная ветка получает постоянный адрес, остальные ветки превью-адрес |
| Supabase | база данных и вход | хранит таблицы и пользователя владельца |
| `.env.local` | ключи на компьютере | файл в корне репозитория, не попадает в git |
| Environment Variables в Vercel | те же ключи для сайта | вводятся один раз вручную |

Адрес основного сайта: https://reading-tracker-one-steel.vercel.app

## 2. Vercel (сделано в Фазе 1)

1. vercel.com → Add New → Project → выбрать репозиторий с GitHub (аккаунт уже связан). Framework подхватывается сам (Next.js), настройки по умолчанию.
2. После этого каждый push в `main` обновляет основной сайт, каждый push в другую ветку создаёт превью-адрес (Deployments → строка ветки → Visit).
3. **Deployment Protection (сделано в Фазе 2).** Превью-адреса веток по умолчанию закрыты входом в Vercel: на компьютере, где ты вошёл в Vercel, всё открывается, а на телефоне появляется «Log in to Vercel». Чтобы превью открывалось на телефоне, на компьютере: проект → Settings → Deployment Protection → **Vercel Authentication** выключить → Save. Основной адрес этой защитой не закрыт.

**Регион функций (важно для скорости).** Vercel → Settings → Functions → Function Region → Europe, регион рядом с Supabase (у нас Supabase в `eu-west-1`, Ирландия; ближайшие Dublin `dub1` и London `lhr1`). По умолчанию функции стоят в США (`iad1`), тогда каждый запрос к базе идёт через океан и клик отвечает 2–3 секунды. Настройка действует только на новые деплои.

## 3. Supabase (сделано в Фазе 2)

**Проект**
1. supabase.com → Sign in (через GitHub) → New project.
2. Name: `Reading Tracker`. Database password: Generate и сохранить в менеджер паролей (в приложении не нужен). Region: Europe. План: Free.
3. Security при создании: **Enable Data API** включить, **Automatically expose new tables** выключить (права на таблицы мы выдаём вручную в SQL), **Enable automatic RLS** включить (страховка для будущих таблиц).
4. Подождать 1–2 минуты, пока статус станет Healthy.

**Закрыть регистрацию**
1. Authentication → Sign In / Providers → User Signups.
2. Выключить **Allow new users to sign up**. Провайдер Email остаётся включённым.
3. Остальные переключатели (manual linking, anonymous sign-ins) выключены. «Confirm email» можно оставить включённым: пользователь создаётся с автоподтверждением.

**Создать пользователя владельца**
1. Authentication → Users → Add user → **Create new user** (не «Send invitation»).
2. Email, сильный пароль (сохранить в менеджер паролей), галочка **Auto Confirm User**, Create user.
3. Письма при этом не отправляются, почтовый сервис не нужен.

**Забыл пароль**
Восстановления по почте в приложении нет. Сброс вручную: Authentication → Users → строка пользователя → меню «…» → Send password recovery / Reset password, либо удалить пользователя и создать заново (данные привязаны к пользователю, удалять только если база пустая).

## 3.1 Вход через Google (сделано 2026-10-27, ветка `feat/google-auth`)

Google привязывается к существующему пользователю Supabase по совпадению почты. Регистрация новых пользователей остаётся закрытой, поэтому войти через Google может только владелец.

**Если почта пользователя в Supabase не совпадает с Google-аккаунтом**, поменять её (UID и все данные сохраняются), SQL Editor:
```sql
update auth.users set email = 'НОВАЯ_ПОЧТА' where email = 'СТАРАЯ_ПОЧТА';
update auth.identities
set identity_data = jsonb_set(identity_data, '{email}', '"НОВАЯ_ПОЧТА"')
where provider = 'email' and identity_data->>'email' = 'СТАРАЯ_ПОЧТА';
```
Вход по паролю после этого с новой почтой и прежним паролем.

**Supabase: адреса.** Authentication → URL Configuration:
- Site URL: `https://reading-tracker-one-steel.vercel.app`
- Redirect URLs: `https://reading-tracker-one-steel.vercel.app/**`, `http://localhost:3000/**`, `https://reading-tracker-*-escobartes-projects.vercel.app/**` (превью веток).

**Google Cloud** (проект `Reading Tracker`, тот же, что для ключа Books API; нужна двухэтапная аутентификация на аккаунте):
1. Поиск → **Google Auth Platform** → Get started: App name `Reading Tracker`, support email, Audience **External**, contact email, согласие, Create.
2. Audience → Test users → Add users: почта владельца. Публиковать приложение не нужно: в режиме **Testing** войти могут только тестовые пользователи.
3. Clients → Create client: Web application, Authorized redirect URI = Callback URL из Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`; Supabase → Authentication → Sign In / Providers → Google). Authorized JavaScript origins пустые.
4. Client ID и Client secret показываются один раз: **Download JSON** и хранить вне репозитория.

**Supabase: провайдер.** Authentication → Sign In / Providers → Google: Enable, вставить Client ID и Client Secret, Save. Остальные переключатели выключены.

**Код.** Промпт «Вход через Google» в `PROMPTS.md`. Новых переменных окружения нет: Client ID и Secret хранятся только в Supabase.

**Первый вход:** Google может показать «Google hasn't verified this app» (режим Testing). Нажать Advanced → Go to Reading Tracker → Continue.

## 4. Ключи

Где взять: кнопка **Connect** вверху проекта Supabase → вкладка Framework → Next.js, блок `.env.local`. Второй путь: Project Settings → API Keys.

| Переменная | Что это | Секретная? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | адрес проекта `https://…supabase.co` | нет |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | публичный ключ, начинается с `sb_publishable_` | нет, защищён правилами RLS |
| `GOOGLE_BOOKS_API_KEY` | ключ Google Books API (Фаза 3), только на сервере, без `NEXT_PUBLIC_` | **да.** Подробно: `guide-google-api.md` |
| Secret key (`sb_secret_…`) | полный доступ к базе | **да. Не копировать, не отправлять, не использовать** |
| Database password | пароль самой базы | **да. Только в менеджере паролей** |

**Vercel:** проект → Settings → Environment Variables → Add Environment Variable. Две переменные из таблицы выше, Type **Config**, Environments **Production и Preview**. В Value только сам адрес или ключ, без имени и знака `=`. Новые значения применяются к следующим сборкам.

Ключ Google Books добавляется так же, но Type **Secret** (получение ключа: `guide-google-api.md`).

**Локально:** в корне репозитория файл `.env.local` (его нет в git):
```
NEXT_PUBLIC_SUPABASE_URL=https://ВАШ-ПРОЕКТ.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```
После изменения файла перезапустить `npm run dev`.

## 5. SQL-миграции

Файлы лежат в `supabase/migrations/`. Выполнять по порядку, каждый один раз.

1. В редакторе кода открыть файл (например `supabase/migrations/0001_init.sql`), Ctrl+A, Ctrl+C.
2. Supabase → левое меню **SQL Editor** (иконка `>_`) → **New query** → кликнуть в пустое поле → Ctrl+V → **Run** (или Ctrl+Enter).
3. Внизу должно быть **Success. No rows returned**. Красная ошибка означает, что что-то не выполнилось: скопировать текст ошибки и показать в штабе.
4. Supabase → **Table Editor**: слева в списке должны появиться таблицы миграции (для `0001`: `books`, `readings`, `sessions`, `notes`, `goals`, `settings`).

Выполнено: `0001_init.sql` (2026-10-22), `0002_goals.sql` (2026-10-27, Фаза 6: дедлайн по книге).

Проверка защиты (RLS включён на всех таблицах):
```
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```
У всех шести таблиц (`books`, `readings`, `sessions`, `notes`, `goals`, `settings`) `rowsecurity` должно быть `true`.

## 6. Как проверять новую ветку (порядок)

Так проверяется каждая фаза, пока не слита в `main`:
1. Claude Code пишет код на ветке. Владелец коммитит и отправляет ветку: `git add .`, `git commit -m "…"`, `git push origin имя-ветки`.
2. Vercel сам собирает превью. Vercel → проект → **Deployments** → строка с названием ветки (статус **Ready**) → **Visit**. Адрес можно скопировать и открыть на телефоне.
3. Проверка на компьютере и на телефоне (чек-лист фазы из отчёта Claude Code).
4. Если всё хорошо: `git switch main`, `git pull`, `git merge имя-ветки`, `git push`. Основной сайт обновится через 1–2 минуты.
5. Если что-то сломано, в `main` не сливаем: правим на ветке.

Почему не сливаем сразу в `main`: основной адрес стоит на телефоне как приложение, ошибка в нём ломает именно его.

Локально (`npm run dev`) запускать не обязательно: превью на Vercel использует те же переменные.

### Чек-лист проверки Фазы 2 (выполнен 2026-10-22)

| Проверка | Ожидание |
|---|---|
| Открыть сайт без входа | перекидывает на `/login` |
| Войти email и паролем из Supabase | открывается главная |
| `/dev/db`: создать тестовую книгу | книга появляется в списке |
| `/dev/db`: нажать крестик | книга удаляется, «Пока пусто» |
| Настройки → «Выйти» | возвращает на `/login` |
| После выхода открыть `/dev/db` | перекидывает на `/login`, страница закрыта |
| Открыть превью на телефоне, войти | всё то же самое работает |
| SQL: `select tablename, rowsecurity from pg_tables where schemaname = 'public';` | у всех шести таблиц `true` |

### Чек-лист проверки Фазы 3 (выполнен 2026-10-23)

| Проверка | Ожидание |
|---|---|
| Книги → «+», поиск «Мастер и Маргарита» | один выбранный результат, обложки или заглушки, язык словами |
| «Добавить в библиотеку» | открывается страница книги |
| Добавить ту же книгу ещё раз | плашка «Уже в библиотеке» над кнопкой, второй записи нет |
| «Хочу прочитать», обновить страницу | остаётся та же полка (`?shelf=want`) |
| Перетащить строку за ручку (мышь и палец) | порядок меняется и сохраняется, книга не открывается |
| Страница книги → смена полки | счётчики полок обновляются, у позиции 1 метка «следующая» |
| «Ещё» → Изменить, Удалить | данные меняются, книга пропадает |
| 360, 390 и 1440 px | как на макетах, без горизонтальной прокрутки |

## 7. Если что-то не работает

| Симптом | Что проверить |
|---|---|
| Вход не пускает, «Неверный email или пароль» | пользователь создан с Auto Confirm User; пароль без пробелов; email совпадает |
| Сайт на Vercel не видит базу | переменные добавлены для нужной среды (Production или Preview), имена совпадают буква в букву, после добавления сделана новая сборка |
| Превью-адрес ветки просит вход в Vercel (обычно на телефоне) | отключить Vercel Authentication в Settings → Deployment Protection |
| Поиск книг ничего не находит или результаты бедные | Google Books отдаёт `429` при исчерпанной квоте, тогда работает запасной Open Library (без страниц). Проверить `GOOGLE_BOOKS_API_KEY` в Vercel, см. `guide-google-api.md`, раздел 8 |
| После Google-входа возвращает на `/login?error=google` | почта Google-аккаунта не совпадает с почтой пользователя в Supabase (регистрация закрыта, новый пользователь не создаётся); почта не добавлена в Test users; в Supabase нет нужного Redirect URL; в Google другой Callback URL |
| Google пишет «Access blocked» | почта не добавлена в Audience → Test users |
| Таблицы пустые или ошибка прав | выполнен ли SQL-файл целиком; есть ли в нём `grant … to authenticated` |

## 8. Отложено

Регистрация новых пользователей и восстановление пароля по почте: нужен свой домен и почтовый сервис (например, Resend). Вернёмся, когда появится домен.
