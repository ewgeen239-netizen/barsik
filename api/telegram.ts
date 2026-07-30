import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createBot } from '../src/bot';
import { config } from '../src/config';

// Створюється один раз на холодний старт і перевикористовується.
const bot = createBot();

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(200).send('Telegram webhook is up.');
    return;
  }

  // Перевірка секрету вебхука (заголовок від Telegram).
  if (config.webhookSecret) {
    const token = req.headers['x-telegram-bot-api-secret-token'];
    if (token !== config.webhookSecret) {
      res.status(401).send('unauthorized');
      return;
    }
  }

  try {
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error('handleUpdate error:', err);
  }
  // Завжди 200, щоб Telegram не ретраїв нескінченно.
  res.status(200).send('ok');
}
