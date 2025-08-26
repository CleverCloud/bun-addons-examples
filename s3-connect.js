import { S3Client } from "bun";
import input from '@inquirer/input';
import pasword from '@inquirer/password';

export async function s3Connect(bucket = null) {
  let endpoint = process.env.CELLAR_ADDON_HOST;
  let accessKeyId = process.env.CELLAR_ADDON_KEY_ID;
  let secretAccessKey = process.env.CELLAR_ADDON_KEY_SECRET;

  try {
    if (!endpoint) {
      endpoint = await input({
        message: "S3 Endpoint:",
        default: "cellar-fr-north-hds-c1.services.clever-cloud.com"
      });
    }

    if (!accessKeyId) {
      accessKeyId = await input({
        message: "Access Key ID:",
      });
    }

    if (!secretAccessKey) {
      secretAccessKey = await pasword({
        message: "Secret Access Key:",
        mask: true
      });
    }

    if (!bucket) {
      bucket = await input({
        message: "Bucket name:",
      });
    }

  } catch (err) {
    if (err && err.name === 'ExitPromptError') {
      console.log('\n👋 Cancelled by user');
      process.exit(0);
    }
    throw err;
  }

  const client = new S3Client({
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: `https://${endpoint}`,
  });

  return { client, bucket, endpoint };
}

async function main() {
  const [, , bucketArg] = process.argv;
  const { client, bucket } = await s3Connect(bucketArg);

  console.log(`🔗 Connected to S3 bucket: ${bucket}`);

  try {
    const response = await client.list();

    if (!response || response.keyCount === 0 || !response.contents?.length) {
      console.log(`📂 Bucket "${bucket}" is empty`);
      return;
    }

    console.log(`📂 Objects in bucket "${bucket}" (${response.keyCount} objects):`);

    response.contents.forEach(obj => {
      const size = obj.size < 1024 ? `${obj.size}B` : `${(obj.size / 1024).toFixed(1)}KB`;
      const date = obj.lastModified ? new Date(obj.lastModified).toLocaleDateString() : "Unknown";
      console.log(`   📄 ${obj.key} (${size}, ${date})`);
    });

  } catch (error) {
    if (error.code === "NoSuchBucket" || error.code === "AccessDenied") {
      console.error(`❌ Bucket '${bucket}' does not exist or access denied`);
    } else {
      console.error(`❌ Failed to list objects: ${error.message}`);
    }
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
