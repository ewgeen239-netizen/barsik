import { BotContext } from '../context';
import { Product } from '../types';
import { products } from '../db';
import { CATEGORIES, categoryMeta } from '../catalog';
import { texts } from '../ui/texts';
import { productCaption } from '../ui/format';
import {
  backToMain,
  catalogMenu,
  contactMenu,
  mainMenu,
  productCardMenu,
  productListMenu,
} from '../ui/keyboards';
import { config } from '../config';

const HTML = { parse_mode: 'HTML' as const };

export async function showMainMenu(ctx: BotContext): Promise<void> {
  await ctx.reply(texts.mainMenuTitle, mainMenu());
}

export async function showCatalog(ctx: BotContext): Promise<void> {
  await ctx.reply(texts.catalogTitle, catalogMenu());
}

export async function showCategory(ctx: BotContext, categoryKey: string): Promise<void> {
  const meta = CATEGORIES.find((c) => c.key === categoryKey);
  if (!meta) {
    await ctx.reply(texts.emptyCategory, catalogMenu());
    return;
  }
  const items = (await products.find((p) => p.category === meta.key)).sort(
    (a, b) => a.price - b.price
  );
  if (items.length === 0) {
    await ctx.reply(`${meta.emoji} <b>${meta.title}</b>\n\n${texts.emptyCategory}`, {
      ...HTML,
      ...catalogMenu(),
    });
    return;
  }
  await ctx.reply(
    `${meta.emoji} <b>${meta.title}</b> — ${items.length} шт.\nОберіть товар:`,
    { ...HTML, ...productListMenu(items, 'menu:catalog', '⬅️ До каталогу') }
  );
}

/** Надіслати картку товару (фото + підпис + кнопки). */
export async function showProduct(ctx: BotContext, product: Product): Promise<void> {
  const caption = productCaption(product);
  const keyboard = productCardMenu(product);
  if (product.photoUrl) {
    try {
      await ctx.replyWithPhoto(product.photoUrl, {
        caption,
        ...HTML,
        ...keyboard,
      });
      return;
    } catch {
      // Якщо фото недоступне — падаємо у текстовий варіант.
    }
  }
  await ctx.reply(caption, { ...HTML, ...keyboard });
}

export async function showNewArrivals(ctx: BotContext): Promise<void> {
  const all = await products.all();
  const items = all
    .filter((p) => p.status !== 'sold')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 8);
  if (items.length === 0) {
    await ctx.reply(texts.newArrivalsEmpty, backToMain());
    return;
  }
  await ctx.reply(texts.newArrivalsTitle, productListMenu(items, 'menu:main', '⬅️ Головне меню'));
}

export async function showPromos(ctx: BotContext): Promise<void> {
  const items = (await products.find((p) => !!p.oldPrice && p.oldPrice > p.price && p.status === 'available')).sort(
    (a, b) => b.oldPrice! - b.price - (a.oldPrice! - a.price)
  );
  if (items.length === 0) {
    await ctx.reply(texts.promoEmpty, backToMain());
    return;
  }
  await ctx.reply(texts.promoTitle, productListMenu(items, 'menu:main', '⬅️ Головне меню'));
}

export async function showWarranty(ctx: BotContext): Promise<void> {
  await ctx.reply(texts.warranty, { ...HTML, ...backToMain() });
}

export async function showContact(ctx: BotContext): Promise<void> {
  await ctx.reply(texts.contactManager(config.managerUsername || undefined), {
    ...HTML,
    ...contactMenu(),
  });
}
