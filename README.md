# 🤖 Telegram-бот магазину б/в техніки «ТехноКоміс»

Професійний бот для магазину вживаної техніки: iPhone, Android, ноутбуки, планшети, Apple Watch, AirPods та аксесуари.
Показує наявність, допомагає знайти товар, приймає заявки на купівлю/бронювання та анкети на продаж/обмін.

**Стек:** Node.js · TypeScript · Telegraf 4 · JSON-сховок · polling.

---

## 🚀 Швидкий старт

```bash
# 1. Встановити залежності
npm install

# 2. Налаштувати оточення
cp .env.example .env
#   заповніть BOT_TOKEN (від @BotFather) та ADMIN_ID (від @userinfobot)

# 3. Запуск у режимі розробки (hot-reload)
npm run dev

# або продакшн-збірка
npm run build
npm start
```

> `ADMIN_ID` — ваш числовий Telegram ID. Щоб отримати заявки, адмін має хоч раз натиснути **/start** у боті.

---

## ⚙️ Змінні середовища

| Змінна                     | Обов'язкова | Де потрібна | Опис                                             |
| -------------------------- | :---------: | :---------: | ------------------------------------------------ |
| `BOT_TOKEN`                |      ✅      |  усюди      | Токен бота від [@BotFather](https://t.me/BotFather) |
| `ADMIN_ID`                 |      ✅      |  усюди      | Telegram ID адміністратора                        |
| `MANAGER_USERNAME`         |      ⬜      |  усюди      | Username менеджера без `@` (кнопка «Написати»)    |
| `TELEGRAM_WEBHOOK_SECRET`  |      ⬜      |  Vercel     | Секрет для перевірки запитів вебхука               |
| `SETUP_SECRET`             |   ✅ (Vercel) |  Vercel     | Секрет для доступу до `/api/setup`                |
| `KV_REST_API_URL` тощо     |   авто      |  Vercel     | Додаються інтеграцією Vercel KV автоматично        |

> Наявність `KV_REST_API_URL` перемикає сховок і сесії на Vercel KV. Без неї (локально) бот працює на JSON-файлах + polling.

---

## ▲ Деплой на Vercel (webhook + KV)

Бот працює на Vercel як serverless-функція через **вебхук**, а дані зберігає у **Vercel KV** (файлова система там ефемерна).

1. **Імпортуйте репозиторій** у Vercel (Framework Preset: *Other*).
2. **Storage → створіть KV Store** і під'єднайте до проєкту — змінні `KV_*` додадуться самі.
3. **Settings → Environment Variables** додайте: `BOT_TOKEN`, `ADMIN_ID`, `TELEGRAM_WEBHOOK_SECRET` (будь-який рядок), `SETUP_SECRET` (будь-який рядок), за бажанням `MANAGER_USERNAME`.
4. **Deploy.**
5. Один раз відкрийте у браузері (реєструє вебхук, команди й сідує каталог):
   ```
   https://<ваш-домен>.vercel.app/api/setup?secret=SETUP_SECRET
   ```
   Успіх: `{"ok":true,"webhook":".../api/telegram","seeded":12}`.

Ендпоінти: `/api/telegram` — приймає апдейти Telegram; `/api/setup` — одноразове налаштування; `/` — статус-сторінка.

> Polling (`npm run dev`, `npm start`) і Vercel-вебхук — взаємовиключні для одного токена. Локальну розробку робіть окремим тестовим ботом.

---

## 🧭 Можливості

### Клієнт
- **Головне меню:** Каталог · Пошук · Нові надходження · Акції · Продати/обміняти · Гарантія · Менеджер.
- **Каталог** за категоріями з лічильником товарів.
- **Картка товару:** фото, назва, пам'ять, стан, комплект, гарантія, ціна, статус + кнопки
  «Забронювати», «Купити», «Поставити питання», «Схожі товари».
- **Пошук** за вільним текстом (`iPhone 13 128`) з ранжуванням і схожими варіантами.
- **Бронювання/купівля:** ім'я → телефон → доставка/самовивіз → коментар → заявка адміну.
- **Продати/обміняти:** модель → пам'ять → стан → коробка → фото → телефон → анкета адміну.

### Адмін (`/admin`, лише для `ADMIN_ID`)
- ➕ Додати товар (покроковий майстер).
- 📦 Змінити статус (в наявності / бронь / продано) та видалити товар.
- 📌 Переглянути заявки на бронь/купівлю, позначити обробленими.
- 💰 Переглянути анкети продажу з фото.

---

## 📂 Структура

```
.
├── api/                      # Vercel serverless-функції
│   ├── telegram.ts           # прийом апдейтів (webhook)
│   └── setup.ts              # реєстрація вебхука + сідування
├── public/                   # статус-сторінка (outputDirectory Vercel)
├── vercel.json               # конфіг деплою
├── data/                     # локальний JSON-сховок (генерується)
├── src/
│   ├── index.ts              # точка входу, launch(polling)
│   ├── bot.ts                # збірка бота, сцени, роутинг
│   ├── config.ts             # env + isAdmin()
│   ├── context.ts            # тип BotContext
│   ├── types.ts              # Product / Order / TradeIn
│   ├── catalog.ts            # категорії, пошук, схожі товари
│   ├── db/
│   │   ├── store.ts          # Store<T> + JsonStore (локально)
│   │   ├── kvStore.ts        # KvStore (Vercel KV)
│   │   ├── seedData.ts       # канонічний початковий каталог
│   │   └── index.ts          # вибір бекенду + seedIfEmpty()
│   ├── ui/
│   │   ├── texts.ts          # усі тексти (укр.)
│   │   ├── format.ts         # підписи, ціна, статуси
│   │   └── keyboards.ts      # inline/reply-клавіатури
│   ├── handlers/
│   │   ├── customer.ts       # меню, каталог, пошук
│   │   ├── render.ts         # рендер меню й карток
│   │   └── admin.ts          # адмін-панель
│   └── scenes/
│       ├── booking.ts        # бронювання/купівля
│       ├── sell.ts           # продати/обміняти
│       ├── ask.ts            # питання менеджеру
│       └── adminAdd.ts       # додавання товару
├── .env.example
├── tsconfig.json
└── package.json
```

---

## 🗃 Модель товару

```ts
type Product = {
  id: string;
  category: 'iphone' | 'samsung' | 'laptop' | 'tablet' | 'watch' | 'airpods' | 'accessory';
  brand: string;
  model: string;
  memory?: string;
  condition: 'excellent' | 'good' | 'used';
  description: string;
  price: number;
  oldPrice?: number;   // стара ціна — для розділу «Акції»
  warranty: string;
  kit: string;
  status: 'available' | 'reserved' | 'sold';
  photoUrl?: string;
  createdAt: string;   // ISO — для «Нових надходжень»
};
```

> До базової структури додано два опційні поля: `oldPrice` (акції) та `createdAt` (сортування нових надходжень). Вони не ламають сумісність.

---

## 📝 Нотатки

- Дані зберігаються у JSON. Для великого навантаження варто замінити `JsonStore` на SQLite/Postgres — інтерфейс сховку (`all/find/getById/add/update/remove`) для цього ізольований.
- Фото у засіяному каталозі — плейсхолдери `picsum.photos`. Замініть на реальні URL або завантажуйте товари через `/admin` → «Додати товар».
- Скасувати будь-який діалог: команда **/cancel** або кнопка «❌ Скасувати».
