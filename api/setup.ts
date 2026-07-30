import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createBot } from '../src/bot';
import { config } from '../src/config';
import { seedIfEmpty } from '../src/db';
import { BOT_COMMANDS } from '../src/commands';

/**
 * Одноразове налаштування після деплою:
 *   GET /api/setup?secret=SETUP_SECRET
 * Реєструє вебхук, команди бота та сідує каталог у KV.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!config.setupSecret || req.query.secret !== config.setupSecret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  const url = `https://${host}/api/telegram`;

  try {
    const bot = createBot();
    await bot.telegram.setWebhook(url, {
      secret_token: config.webhookSecret || undefined,
      drop_pending_updates: true,
    });
    await bot.telegram.setMyCommands(BOT_COMMANDS);
    const seeded = await seedIfEmpty();
    res.status(200).json({ ok: true, webhook: url, ...seeded });
  } catch (err) {
    console.error('setup error:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}
