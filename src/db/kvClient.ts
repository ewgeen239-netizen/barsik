import { createClient, type VercelKV } from '@vercel/kv';

/**
 * Vercel KV та інтеграція Upstash Redis виставляють різні імена змінних.
 * Підтримуємо обидва варіанти.
 */
function resolveCreds(): { url?: string; token?: string } {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    undefined;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    undefined;
  return { url, token };
}

/** Чи налаштоване KV-сховище (є URL і токен). */
export function hasKv(): boolean {
  const { url, token } = resolveCreds();
  return Boolean(url && token);
}

/** Імена наявних KV/Redis-змінних (для діагностики, без значень). */
export function detectedKvEnvNames(): string[] {
  return Object.keys(process.env).filter((k) => /KV|UPSTASH|REDIS/i.test(k));
}

let client: VercelKV | null = null;

export function kvClient(): VercelKV {
  if (client) return client;
  const { url, token } = resolveCreds();
  if (!url || !token) {
    throw new Error(
      'KV не налаштовано: відсутні KV_REST_API_URL / KV_REST_API_TOKEN (або UPSTASH_REDIS_REST_URL / _TOKEN).'
    );
  }
  client = createClient({ url, token });
  return client;
}
