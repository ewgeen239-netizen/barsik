import { Scenes, Telegraf, session } from 'telegraf';
import { BotContext } from './context';
import { config } from './config';
import { bookingScene, BOOKING_SCENE } from './scenes/booking';
import { sellScene, SELL_SCENE } from './scenes/sell';
import { askScene, ASK_SCENE } from './scenes/ask';
import { adminAddScene } from './scenes/adminAdd';
import { registerCustomerHandlers } from './handlers/customer';
import { registerAdminHandlers } from './handlers/admin';
import { showMainMenu } from './handlers/render';
import { removeKeyboard } from './ui/keyboards';
import { texts } from './ui/texts';
import { products } from './db';
import { hasKv } from './db/kvClient';
import { kvSessionStore } from './kvSession';

async function ack(ctx: BotContext): Promise<void> {
  try {
    await ctx.answerCbQuery();
  } catch {
    /* ignore */
  }
}

export function createBot(): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(config.botToken);

  bot.catch((err, ctx) => {
    console.error(`Помилка під час обробки ${ctx.updateType}:`, err);
  });

  // На Vercel (KV присутній) сесії зберігаємо в KV, локально — у пам'яті.
  bot.use(hasKv() ? session({ store: kvSessionStore }) : session());

  const stage = new Scenes.Stage<BotContext>([bookingScene, sellScene, askScene, adminAddScene]);

  // Скасування працює всередині будь-якої сцени.
  const cancel = async (ctx: BotContext) => {
    await ctx.reply(texts.cancelled, removeKeyboard());
    return ctx.scene.leave();
  };
  stage.command('cancel', cancel);
  stage.hears(/^❌?\s*скасувати$/i, cancel);
  stage.command('start', async (ctx) => {
    await ctx.scene.leave();
    await showMainMenu(ctx);
  });

  bot.use(stage.middleware());

  // ------------------------- Вхід у сцени -------------------------
  bot.action('menu:sell', async (ctx) => {
    await ack(ctx);
    await ctx.scene.enter(SELL_SCENE);
  });

  bot.action(/^book:(.+)$/, async (ctx) => {
    await ack(ctx);
    const product = await products.getById(ctx.match[1]);
    if (!product || product.status !== 'available') {
      await ctx.reply(texts.notForSale);
      return;
    }
    await ctx.scene.enter(BOOKING_SCENE, { productId: product.id, type: 'booking' });
  });

  bot.action(/^buy:(.+)$/, async (ctx) => {
    await ack(ctx);
    const product = await products.getById(ctx.match[1]);
    if (!product || product.status !== 'available') {
      await ctx.reply(texts.notForSale);
      return;
    }
    await ctx.scene.enter(BOOKING_SCENE, { productId: product.id, type: 'purchase' });
  });

  bot.action('ask:general', async (ctx) => {
    await ack(ctx);
    await ctx.scene.enter(ASK_SCENE, {});
  });

  bot.action(/^ask:(.+)$/, async (ctx) => {
    await ack(ctx);
    await ctx.scene.enter(ASK_SCENE, { productId: ctx.match[1] });
  });

  // ------------------------- Решта обробників -------------------------
  registerAdminHandlers(bot);
  registerCustomerHandlers(bot);

  return bot;
}
