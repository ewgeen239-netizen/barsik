import { Markup, Telegraf } from 'telegraf';
import { BotContext } from '../context';
import { orders, products, tradeIns } from '../db';
import { isAdmin } from '../config';
import { ADMIN_ADD_SCENE } from '../scenes/adminAdd';
import { productCaption, statusLabel } from '../ui/format';
import { productTitle } from '../catalog';
import { ProductStatus } from '../types';

const HTML = { parse_mode: 'HTML' as const };

async function ack(ctx: BotContext, text?: string): Promise<void> {
  try {
    await ctx.answerCbQuery(text);
  } catch {
    /* ignore */
  }
}

async function guard(ctx: BotContext): Promise<boolean> {
  if (isAdmin(ctx.from?.id)) return true;
  await ack(ctx);
  await ctx.reply('Доступ заборонено.');
  return false;
}

function adminMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('➕ Додати товар', 'adm:add')],
    [Markup.button.callback('📦 Товари (статуси)', 'adm:list')],
    [Markup.button.callback('📌 Заявки (бронь/купівля)', 'adm:orders')],
    [Markup.button.callback('💰 Анкети продажу', 'adm:trades')],
  ]);
}

async function showAdminMenu(ctx: BotContext): Promise<void> {
  const [prodList, orderList, tradeList] = await Promise.all([
    products.all(),
    orders.all(),
    tradeIns.all(),
  ]);
  const available = prodList.filter((p) => p.status === 'available').length;
  const newOrders = orderList.filter((o) => o.status === 'new').length;
  const newTrades = tradeList.filter((t) => t.status === 'new').length;
  await ctx.reply(
    `🛠 <b>Адмін-панель</b>\n\n` +
      `Товарів: ${prodList.length} (у наявності: ${available})\n` +
      `Нових заявок: ${newOrders}\n` +
      `Нових анкет продажу: ${newTrades}`,
    { ...HTML, ...adminMenu() }
  );
}

function adminProductMenu(id: string, status: ProductStatus) {
  const btn = (label: string, s: ProductStatus) =>
    Markup.button.callback(status === s ? `• ${label} •` : label, `adm:st:${id}:${s}`);
  return Markup.inlineKeyboard([
    [btn('🟢 В наявності', 'available'), btn('🟡 Бронь', 'reserved')],
    [Markup.button.callback('🔴 Продано', `adm:st:${id}:sold`)],
    [Markup.button.callback('🗑 Видалити', `adm:del:${id}`)],
    [Markup.button.callback('⬅️ До списку', 'adm:list')],
  ]);
}

export function registerAdminHandlers(bot: Telegraf<BotContext>): void {
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      await ctx.reply('Команда доступна лише адміністратору.');
      return;
    }
    await showAdminMenu(ctx);
  });

  bot.action('adm:menu', async (ctx) => {
    if (!(await guard(ctx))) return;
    await ack(ctx);
    await showAdminMenu(ctx);
  });

  bot.action('adm:add', async (ctx) => {
    if (!(await guard(ctx))) return;
    await ack(ctx);
    await ctx.scene.enter(ADMIN_ADD_SCENE);
  });

  // ------------------------- Товари -------------------------
  bot.action('adm:list', async (ctx) => {
    if (!(await guard(ctx))) return;
    await ack(ctx);
    const all = (await products.all()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (all.length === 0) {
      await ctx.reply('Товарів поки немає.', adminMenu());
      return;
    }
    const rows = all
      .slice(0, 40)
      .map((p) => [
        Markup.button.callback(
          `${statusEmoji(p.status)} ${productTitle(p)} — ${p.price} грн`,
          `adm:p:${p.id}`
        ),
      ]);
    rows.push([Markup.button.callback('⬅️ Адмін-меню', 'adm:menu')]);
    await ctx.reply('📦 Товари — оберіть для керування:', Markup.inlineKeyboard(rows));
  });

  bot.action(/^adm:p:(.+)$/, async (ctx) => {
    if (!(await guard(ctx))) return;
    await ack(ctx);
    const product = await products.getById(ctx.match[1]);
    if (!product) {
      await ctx.reply('Товар не знайдено.', adminMenu());
      return;
    }
    await ctx.reply(productCaption(product), { ...HTML, ...adminProductMenu(product.id, product.status) });
  });

  bot.action(/^adm:st:(.+):(available|reserved|sold)$/, async (ctx) => {
    if (!(await guard(ctx))) return;
    const id = ctx.match[1];
    const status = ctx.match[2] as ProductStatus;
    const updated = await products.update(id, { status });
    if (!updated) {
      await ack(ctx, 'Товар не знайдено');
      return;
    }
    await ack(ctx, `Статус: ${statusLabel(status)}`);
    await ctx.reply(
      `Оновлено: <b>${productTitle(updated)}</b>\nНовий статус: ${statusLabel(status)}`,
      { ...HTML, ...adminProductMenu(updated.id, updated.status) }
    );
  });

  bot.action(/^adm:del:(.+)$/, async (ctx) => {
    if (!(await guard(ctx))) return;
    await ack(ctx);
    const id = ctx.match[1];
    await ctx.reply(
      'Видалити товар назавжди?',
      Markup.inlineKeyboard([
        [Markup.button.callback('🗑 Так, видалити', `adm:delok:${id}`)],
        [Markup.button.callback('↩️ Скасувати', `adm:p:${id}`)],
      ])
    );
  });

  bot.action(/^adm:delok:(.+)$/, async (ctx) => {
    if (!(await guard(ctx))) return;
    const ok = await products.remove(ctx.match[1]);
    await ack(ctx, ok ? 'Видалено' : 'Не знайдено');
    await ctx.reply(ok ? '🗑 Товар видалено.' : 'Товар не знайдено.', adminMenu());
  });

  // ------------------------- Заявки -------------------------
  bot.action('adm:orders', async (ctx) => {
    if (!(await guard(ctx))) return;
    await ack(ctx);
    const all = (await orders.all()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (all.length === 0) {
      await ctx.reply('Заявок поки немає.', adminMenu());
      return;
    }
    const rows = all.slice(0, 40).map((o) => [
      Markup.button.callback(
        `${o.status === 'new' ? '🆕' : '✅'} ${o.type === 'purchase' ? '🛒' : '📌'} ${o.productTitle} — ${o.customerName}`,
        `adm:o:${o.id}`
      ),
    ]);
    rows.push([Markup.button.callback('⬅️ Адмін-меню', 'adm:menu')]);
    await ctx.reply('📌 Заявки:', Markup.inlineKeyboard(rows));
  });

  bot.action(/^adm:o:(.+)$/, async (ctx) => {
    if (!(await guard(ctx))) return;
    await ack(ctx);
    const o = await orders.getById(ctx.match[1]);
    if (!o) {
      await ctx.reply('Заявку не знайдено.', adminMenu());
      return;
    }
    const contact = o.username ? `@${o.username}` : `id ${o.userId}`;
    const text =
      `${o.type === 'purchase' ? '🛒 Купівля' : '📌 Бронювання'} № ${o.id}\n\n` +
      `Товар: ${o.productTitle}\n` +
      `Ім'я: ${o.customerName}\n` +
      `Телефон: ${o.phone}\n` +
      `Спосіб: ${o.delivery === 'delivery' ? 'доставка' : 'самовивіз'}\n` +
      (o.comment ? `Коментар: ${o.comment}\n` : '') +
      `Клієнт: ${contact}\n` +
      `Статус: ${o.status === 'new' ? '🆕 нова' : '✅ оброблена'}`;
    const buttons = [];
    if (o.status === 'new') {
      buttons.push([Markup.button.callback('✅ Позначити обробленою', `adm:odone:${o.id}`)]);
    }
    buttons.push([Markup.button.callback('🔴 Товар продано', `adm:st:${o.productId}:sold`)]);
    buttons.push([Markup.button.callback('⬅️ До заявок', 'adm:orders')]);
    await ctx.reply(text, Markup.inlineKeyboard(buttons));
  });

  bot.action(/^adm:odone:(.+)$/, async (ctx) => {
    if (!(await guard(ctx))) return;
    const updated = await orders.update(ctx.match[1], { status: 'processed' });
    await ack(ctx, updated ? 'Оброблено' : 'Не знайдено');
    await ctx.reply(updated ? '✅ Заявку позначено обробленою.' : 'Заявку не знайдено.', adminMenu());
  });

  // ------------------------- Анкети продажу -------------------------
  bot.action('adm:trades', async (ctx) => {
    if (!(await guard(ctx))) return;
    await ack(ctx);
    const all = (await tradeIns.all()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (all.length === 0) {
      await ctx.reply('Анкет продажу поки немає.', adminMenu());
      return;
    }
    const rows = all.slice(0, 40).map((t) => [
      Markup.button.callback(`${t.status === 'new' ? '🆕' : '✅'} ${t.model} — ${t.phone}`, `adm:t:${t.id}`),
    ]);
    rows.push([Markup.button.callback('⬅️ Адмін-меню', 'adm:menu')]);
    await ctx.reply('💰 Анкети продажу:', Markup.inlineKeyboard(rows));
  });

  bot.action(/^adm:t:(.+)$/, async (ctx) => {
    if (!(await guard(ctx))) return;
    await ack(ctx);
    const t = await tradeIns.getById(ctx.match[1]);
    if (!t) {
      await ctx.reply('Анкету не знайдено.', adminMenu());
      return;
    }
    const contact = t.username ? `@${t.username}` : `id ${t.userId}`;
    const text =
      `💰 Анкета продажу № ${t.id}\n\n` +
      `Модель: ${t.model}\n` +
      `Пам'ять: ${t.memory}\n` +
      `Стан: ${t.condition}\n` +
      `Коробка/док-ти: ${t.hasBox ? 'так' : 'ні'}\n` +
      `Телефон: ${t.phone}\n` +
      `Клієнт: ${contact}\n` +
      `Статус: ${t.status === 'new' ? '🆕 нова' : '✅ оброблена'}`;
    const buttons = [];
    if (t.photoFileId) {
      try {
        await ctx.replyWithPhoto(t.photoFileId);
      } catch {
        /* фото могло застаріти */
      }
    }
    if (t.status === 'new') {
      buttons.push([Markup.button.callback('✅ Позначити обробленою', `adm:tdone:${t.id}`)]);
    }
    buttons.push([Markup.button.callback('⬅️ До анкет', 'adm:trades')]);
    await ctx.reply(text, Markup.inlineKeyboard(buttons));
  });

  bot.action(/^adm:tdone:(.+)$/, async (ctx) => {
    if (!(await guard(ctx))) return;
    const updated = await tradeIns.update(ctx.match[1], { status: 'processed' });
    await ack(ctx, updated ? 'Оброблено' : 'Не знайдено');
    await ctx.reply(updated ? '✅ Анкету позначено обробленою.' : 'Анкету не знайдено.', adminMenu());
  });
}

function statusEmoji(status: ProductStatus): string {
  return status === 'available' ? '🟢' : status === 'reserved' ? '🟡' : '🔴';
}
