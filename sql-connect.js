import { SQL } from "bun";
import select from '@inquirer/select';
import password from '@inquirer/password';

export async function dbConnect() {
  let uri;

  try {
    uri = process.env.MYSQL_ADDON_URI || process.env.POSTGRESQL_ADDON_URI;

    if (process.env.MYSQL_ADDON_URI && process.env.POSTGRESQL_ADDON_URI) {
      uri = await select({
        message: "Both MYSQL_ADDON_URI and POSTGRESQL_ADDON_URI are set. Which database do you want to connect to?",
        choices: [
          { name: "MySQL", value: process.env.MYSQL_ADDON_URI },
          { name: "PostgreSQL", value: process.env.POSTGRESQL_ADDON_URI }
        ]
      });
    }

    if (!uri) {
      uri = await password({
        mask: true,
        message: "No environment variable for SQL URI, provide it (e.g., scheme://user:password@host:port/db):",
      });
    }
  } catch (err) {
    if (err && err.name === 'ExitPromptError') {
      console.log('\n👋 Cancelled by user');
      process.exit(0);
    }
    throw err;
  }

  const dbType = uri.startsWith('postgresql') ? 'PostgreSQL' : uri.startsWith('mysql') ? 'MySQL' : null;

  if (!dbType) {
    console.error("❌ Unsupported database type. Only MySQL and PostgreSQL are supported.");
    process.exit(1);
  }

  const client = new SQL(uri);
  return { client, dbType };
}

async function main() {
  const { client, dbType } = await dbConnect();

  console.log(`🔌 Connecting to ${dbType}…`);

  try {
    const result = await client`SELECT 1 as test`;
    console.log("✅ Connection successful!");
    console.log("📊 Test result:", result[0]?.test || result);

    const serverInfo = await client`SELECT VERSION() as version`;
    console.log("🗄️ Database version:", serverInfo[0]?.version || serverInfo);

  } catch (error) {
    console.error("❌ Connection error:", error instanceof Error ? error.message : error);
  } finally {
    await client.close();
    console.log("🔌 Connection closed");
  }
}

if (import.meta.main) {
  main().catch(err => {
    if (err && err.name === 'ExitPromptError') {
      console.log('\n👋 Cancelled by user');
      process.exit(0);
    }
    console.error(err);
  });
}
