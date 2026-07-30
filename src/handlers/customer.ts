import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { BotContext } from '../context';
import { products } from '../db';
import { searchProducts, similarProducts } from '../catalog';
import { texts } from '../ui/texts';
import { backToMain, productListMenu } from '../ui/keyboards';
import {
  showCatalog,
  showCategory,
  showContact,
  showMainMenu,
  showNewArrivals,
  showProduct,
  showPromos,
  showWarranty,
} from './render';

const HTML = { parse_mode: 'HTML' as const };

/** Безпечно закрити callback-запит (ігноруємо застарілі). */
async function ack(ctx: BotContext, text?: string): Promise<void> {
  try {
    await ctx.answerCbQuery(text);
  } catch {
    /* застарілий запит — не критично */
  }
}

export function registerCustomerHandlers(bot: Telegraf<BotContext>): void {
  bot.start(async (ctx) => {
    const name = ctx.from?.first_name ?? 'друже';
    await ctx.reply(texts.welcome(name), HTML);
    await showMainMenu(ctx);
  });

  bot.command('menu', async (ctx) => showMainMenu(ctx));
  bot.command('help', async (ctx) => {
    await ctx.reply(
      'Доступні команди:\n' +
        '/start — головне меню\n' +
        '/menu — головне меню\n' +
        '/cancel — скасувати поточну дію\n\n' +
        'Також можете просто написати модель для пошуку.',
      backToMain()
    );
  });

  // ------------------------- Головне меню -------------------------
  bot.action('menu:main', async (ctx) => {
    await ack(ctx);
    await showMainMenu(ctx);
  });
  bot.action('menu:catalog', async (ctx) => {
    await ack(ctx);
    await showCatalog(ctx);
  });
  bot.action('menu:new', async (ctx) => {
    await ack(ctx);
    await showNewArrivals(ctx);
  });
  bot.action('menu:promo', async (ctx) => {
    await ack(ctx);
    await showPromos(ctx);
  });
  bot.action('menu:warranty', async (ctx) => {
    await ack(ctx);
    await showWarranty(ctx);
  });
  bot.action('menu:contact', async (ctx) => {
    await ack(ctx);
    await showContact(ctx);
  });
  bot.action('menu:search', async (ctx) => {
    await ack(ctx);
    await ctx.reply(texts.searchPrompt, HTML);
  });

  // ------------------------- Каталог / товари -------------------------
  bot.action(/^cat:(.+)$/, async (ctx) => {
    await ack(ctx);
    await showCategory(ctx, ctx.match[1]);
  });

  bot.action(/^prod:(.+)$/, async (ctx) => {
    await ack(ctx);
    const product = await products.getById(ctx.match[1]);
    if (!product) {
      await ctx.reply('Товар не знайдено або його вже продано.', backToMain());
      return;
    }
    await showProduct(ctx, product);
  });

  bot.action(/^similar:(.+)$/, async (ctx) => {
    await ack(ctx);
    const target = await products.getById(ctx.match[1]);
    if (!target) {
      await ctx.reply('Товар не знайдено.', backToMain());
      return;
    }
    const items = similarProducts(await products.all(), target);
    if (items.length === 0) {
      await ctx.reply('Схожих товарів поки немає.', backToMain());
      return;
    }
    await ctx.reply('🔁 Схожі товари:', productListMenu(items, `cat:${target.category}`, '⬅️ Назад'));
  });

  // ------------------------- Текстовий пошук -------------------------
  bot.on(message('text'), async (ctx, next) => {
    const query = ctx.message.text.trim();
    if (query.startsWith('/')) return next();

    const results = searchProducts(await products.all(), query);
    if (results.length === 0) {
      await ctx.reply(texts.searchNotFound, backToMain());
      return;
    }
    if (results.length === 1) {
      await showProduct(ctx, results[0]);
      return;
    }
    await ctx.reply(
      `🔎 Знайдено ${results.length} за запитом «${query}»:`,
      productListMenu(results.slice(0, 10), 'menu:main', '⬅️ Головне меню')
    );
  });
}
