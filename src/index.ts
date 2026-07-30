import { createBot } from './bot';
import { config } from './config';
import { BOT_COMMANDS } from './commands';
import { seedIfEmpty } from './db';

async function main(): Promise<void> {
  const bot = createBot();

  // Локальний запуск: сідуємо каталог за потреби.
  await seedIfEmpty();

  // Меню команд у клієнті Telegram.
  await bot.telegram.setMyCommands(BOT_COMMANDS);

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  // launch() резолвиться лише після зупинки бота — тому не await.
  bot.launch({ dropPendingUpdates: true }).catch((err) => {
    console.error('❌ Помилка роботи бота:', err);
    process.exit(1);
  });

  console.log('✅ Бота запущено (polling).');
  console.log(`👤 ADMIN_ID: ${config.adminId}`);
}

main().catch((err) => {
  console.error('❌ Не вдалося запустити бота:', err);
  process.exit(1);
});
