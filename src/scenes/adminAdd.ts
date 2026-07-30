import { Markup, Scenes } from 'telegraf';
import { message } from 'telegraf/filters';
import { BotContext } from '../context';
import { products, genId } from '../db';
import { CATEGORIES } from '../catalog';
import { isAdmin } from '../config';
import { cancelKeyboard, conditionKeyboard, removeKeyboard, skipKeyboard } from '../ui/keyboards';
import { Category, Condition, Product } from '../types';
import { productCaption } from '../ui/format';

export const ADMIN_ADD_SCENE = 'admin_add';

interface WizardData {
  category?: Category;
  brand?: string;
  model?: string;
  memory?: string;
  condition?: Condition;
  price?: number;
  warranty?: string;
  kit?: string;
  description?: string;
  photoUrl?: string;
}

const state = (ctx: BotContext) => ctx.wizard.state as unknown as WizardData;

const categoryKeyboard = () =>
  Markup.keyboard(CATEGORIES.map((c) => [`${c.emoji} ${c.title}`]).concat([['❌ Скасувати']]))
    .resize()
    .oneTime();

function parseCategory(text: string): Category | undefined {
  const clean = text.replace(/^[^\p{L}]+/u, '').trim().toLowerCase();
  return CATEGORIES.find((c) => c.title.toLowerCase() === clean || c.key === clean)?.key;
}

function parseCondition(text: string): Condition | undefined {
  const t = text.trim().toLowerCase();
  if (t.startsWith('ідеал')) return 'excellent';
  if (t.startsWith('хорош')) return 'good';
  if (t.includes('сліди') || t.startsWith('used')) return 'used';
  return undefined;
}

export const adminAddScene = new Scenes.WizardScene<BotContext>(
  ADMIN_ADD_SCENE,
  // Крок 0 — доступ + категорія
  async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      await ctx.reply('Доступ заборонено.');
      return ctx.scene.leave();
    }
    await ctx.reply('➕ Додавання товару.\nОберіть категорію:', categoryKeyboard());
    return ctx.wizard.next();
  },

  // Крок 1 — категорія → бренд
  async (ctx) => {
    if (!ctx.has(message('text'))) return;
    const category = parseCategory(ctx.message.text);
    if (!category) {
      await ctx.reply('Оберіть категорію кнопкою нижче.', categoryKeyboard());
      return;
    }
    state(ctx).category = category;
    await ctx.reply('Бренд (наприклад: Apple, Samsung):', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Крок 2 — бренд → модель
  async (ctx) => {
    if (!ctx.has(message('text'))) return;
    state(ctx).brand = ctx.message.text.trim();
    await ctx.reply('Модель (наприклад: iPhone 13 Pro):', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Крок 3 — модель → пам'ять
  async (ctx) => {
    if (!ctx.has(message('text'))) return;
    state(ctx).model = ctx.message.text.trim();
    await ctx.reply("Пам'ять/характеристики (або «⏭ Пропустити»):", skipKeyboard());
    return ctx.wizard.next();
  },

  // Крок 4 — пам'ять → стан
  async (ctx) => {
    if (!ctx.has(message('text'))) return;
    const text = ctx.message.text.trim();
    if (text !== '⏭ Пропустити') state(ctx).memory = text;
    await ctx.reply('Стан:', conditionKeyboard());
    return ctx.wizard.next();
  },

  // Крок 5 — стан → ціна
  async (ctx) => {
    if (!ctx.has(message('text'))) return;
    const condition = parseCondition(ctx.message.text);
    if (!condition) {
      await ctx.reply('Оберіть стан кнопкою нижче.', conditionKeyboard());
      return;
    }
    state(ctx).condition = condition;
    await ctx.reply('Ціна, грн (лише число):', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Крок 6 — ціна → гарантія
  async (ctx) => {
    if (!ctx.has(message('text'))) return;
    const price = Number(ctx.message.text.replace(/[^\d]/g, ''));
    if (!Number.isFinite(price) || price <= 0) {
      await ctx.reply('Введіть коректну ціну числом.', cancelKeyboard());
      return;
    }
    state(ctx).price = price;
    await ctx.reply('Гарантія (наприклад: 30 днів):', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Крок 7 — гарантія → комплект
  async (ctx) => {
    if (!ctx.has(message('text'))) return;
    state(ctx).warranty = ctx.message.text.trim();
    await ctx.reply('Комплектація (наприклад: кабель, коробка):', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Крок 8 — комплект → опис
  async (ctx) => {
    if (!ctx.has(message('text'))) return;
    state(ctx).kit = ctx.message.text.trim();
    await ctx.reply('Опис (стан батареї, нюанси; або «⏭ Пропустити»):', skipKeyboard());
    return ctx.wizard.next();
  },

  // Крок 9 — опис → фото
  async (ctx) => {
    if (!ctx.has(message('text'))) return;
    const text = ctx.message.text.trim();
    state(ctx).description = text === '⏭ Пропустити' ? '' : text;
    await ctx.reply('URL фото (або «⏭ Пропустити»):', skipKeyboard());
    return ctx.wizard.next();
  },

  // Крок 10 — фото → створення
  async (ctx) => {
    if (!ctx.has(message('text'))) return;
    const text = ctx.message.text.trim();
    if (text !== '⏭ Пропустити' && /^https?:\/\//.test(text)) {
      state(ctx).photoUrl = text;
    }

    const st = state(ctx);
    const product: Product = {
      id: genId('P-'),
      category: st.category!,
      brand: st.brand!,
      model: st.model!,
      memory: st.memory,
      condition: st.condition!,
      description: st.description ?? '',
      price: st.price!,
      warranty: st.warranty!,
      kit: st.kit!,
      status: 'available',
      photoUrl: st.photoUrl,
      createdAt: new Date().toISOString(),
    };
    await products.add(product);

    await ctx.reply('✅ Товар додано:', removeKeyboard());
    await ctx.reply(productCaption(product), { parse_mode: 'HTML' });
    return ctx.scene.leave();
  }
);
