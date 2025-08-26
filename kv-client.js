import { RedisClient } from "bun";
import password from '@inquirer/password';

async function main() {

    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error("Usage: bun kc-client.ts <COMMAND> [ARGUMENTS]");
        process.exit(1);
    }

    let redis_url = process.env.REDIS_URL;

    if (!redis_url) {
        redis_url = await password({
            mask: true,
            message: "No REDIS_URL environment variable, provide it (e.g., redis://:password@host:6379/0:"
        });
    }

    // If URL contains rediss:// and port 6379 (Materia KV), adapt URL as Redis client in Bun doesn't handle TLS correctly
    if (redis_url.startsWith('rediss://') && redis_url.endsWith(':6379')) {
        redis_url = redis_url.replace('rediss://', 'redis://').replace(':6379', ':6378');
    }

    const client = new RedisClient(redis_url);

    const command = args[0].toUpperCase();
    const commandArgs = args.slice(1);

    try {
        const result = await client.send(command, commandArgs);
        console.log(result);
    } catch (error) {
        console.error("Redis error:", error);
        process.exit(1);
    }
}

main().catch(console.error);
