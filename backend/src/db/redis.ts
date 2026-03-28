import { createClient } from "redis";

type RedisConnection = ReturnType<typeof createClient>;

let clientPromise: Promise<RedisConnection | null> | null = null;

async function getRedisClient(): Promise<RedisConnection | null> {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL
      });

      client.on("error", (error) => {
        console.error("[redis] connection error:", error);
      });

      await client.connect();
      return client;
    })().catch((error) => {
      console.error("[redis] failed to initialize:", error);
      clientPromise = null;
      return null;
    });
  }

  return clientPromise;
}

export async function publishToRedis(channel: string, message: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  await client.publish(channel, message);
}

export async function closeRedis(): Promise<void> {
  if (!clientPromise) {
    return;
  }

  const client = await clientPromise;
  clientPromise = null;
  if (client) {
    await client.quit();
  }
}
