import confirm from '@inquirer/confirm';
import { s3Connect } from './s3-connect.js';

class S3Demo {
    static DEFAULT_PRESIGN_EXPIRES = 300;

    constructor(client, bucket) {
        this.client = client;
        this.bucket = bucket;
    }

    async checkFileExists(key) {
        if (!await this.client.exists(key)) {
            throw new Error(`File "${key}" does not exist in bucket "${this.bucket}"`);
        }

        return this.client.file(key);;
    }

    async uploadFile(key, content, contentType = "text/plain") {
        await this.client.write(key, new TextEncoder().encode(content), {
            contentType,
        });
        console.log(`✅ Uploaded ${key} to bucket "${this.bucket}"`);
    }

    async printFile(key) {
        const file = await this.checkFileExists(key);
        const content = file.type === "application/json" ? await file.json() : await file.text();

        console.log(content);
    }

    async printFileInfo(key) {
        const file = await this.checkFileExists(key);

        console.log(await file);
        console.log(await file.stat());
    }

    async listFiles() {
        const response = await this.client.list();

        if (!response || response.keyCount === 0 || !response.contents?.length) {
            console.log(`📂 Bucket "${this.bucket}" is empty, run \`bun s3.js ${this.bucket}\` for full demo with file uploads!`);
            return [];
        }

        console.log(`📂 Objects in bucket "${this.bucket}" (${response.keyCount} objects):`);

        response.contents.forEach(obj => {
            const size = obj.size < 1024 ? `${obj.size}B` : `${(obj.size / 1024).toFixed(1)}KB`;
            const date = obj.lastModified ? new Date(obj.lastModified).toLocaleDateString() : "Unknown";
            console.log(`   📄 ${obj.key} (${size}, ${date})`);
        });
        return response.contents;
    }

    async deleteFile(key, confirmDelete = true) {
        const file = await this.checkFileExists(key);

        if (confirmDelete) {
            const shouldDelete = await confirm({
                message: `Are you sure you want to delete "${key}" from bucket "${this.bucket}"?`,
                default: false
            });

            if (!shouldDelete) {
                console.log("Delete cancelled");
                return;
            }
        }

        await this.client.unlink(key);
        console.log(`🗑️ Deleted ${key} from bucket "${this.bucket}"`);
    }

    async presignFile(key, expiresIn = S3Demo.DEFAULT_PRESIGN_EXPIRES) {
        const file = await this.checkFileExists(key);
        const url = this.client.presign(key, { expiresIn });

        console.log(`🔗 Generated presigned URL for ${key} (expires in ${expiresIn} seconds): ${url}`);
        return url;
    }

    async runDemo() {
        console.log("🚀 Bun S3 API Demo - Starting…\n");

        const shouldProceed = await confirm({
            message: `This demo will upload files to bucket "${this.bucket}" and then clean them up. Continue?`,
            default: false
        });

        if (!shouldProceed) {
            console.log("Demo cancelled");
            return;
        }

        await this.client.list();

        const demoFiles = [
            { key: "demo.txt", content: "Hello from Bun S3 API! This is a simple text file.", type: "text/plain" },
            { key: "data.json", content: JSON.stringify({ message: "Bun S3 rocks!", timestamp: new Date().toISOString(), version: "1.0" }, null, 2), type: "application/json" },
            { key: "readme.md", content: "# Bun S3 Demo\n\nThis file was uploaded using Bun's native S3 client.\n\n- Fast\n- Simple\n- Built-in", type: "text/markdown" }
        ];

        await this.listFiles();

        console.log("\n📤 Uploading demo files…");
        for (const file of demoFiles) {
            await this.uploadFile(file.key, file.content, file.type);
        }

        console.log("\n📋 Files after upload:");
        await this.listFiles();

        console.log("\n📥 Testing file content:");
        await this.printFile("data.json");
        await this.printFileInfo("data.json");

        console.log("\n🗑️ Cleaning up demo files (keeping demo.txt)…");
        for (const file of demoFiles.slice(1)) {
            await this.deleteFile(file.key, false);
        }

        console.log("\n📋 Final state:");
        await this.listFiles();

        console.log("");
        await this.presignFile("demo.txt");

        console.log("\n✅ Demo completed successfully!");
        console.log(`💡 Use \`bun s3.js ${this.bucket} list\` to see remaining files anytime!`);
    }
}

async function main() {
    const [, , bucketOrCommand, command, ...args] = process.argv;

    if (!bucketOrCommand || bucketOrCommand === "help") {
        console.log("\n📚 S3 Demo - Usage:");
        console.log("   bun s3.js <bucket>                          - Run full demo");
        console.log("   bun s3.js <bucket> list                     - List files in bucket");
        console.log("   bun s3.js <bucket> upload <file>            - Upload a file");
        console.log("   bun s3.js <bucket> delete <file>            - Delete a file");
        console.log("   bun s3.js <bucket> presign <file> [seconds] - Generate presigned URL");
        console.log("   bun s3.js <bucket> print <file>             - Print file content");
        console.log("   bun s3.js <bucket> info <file>              - Print file info");
        console.log("   bun s3.js help                              - Show this help");
        return;
    }

    const bucket = bucketOrCommand;
    const { client } = await s3Connect(bucket);
    const demo = new S3Demo(client, bucket);

    try {
        switch (command) {
            case "list":
                await demo.listFiles();
                break;
            case "upload":
                if (!args[0]) {
                    console.log("❌ Please provide a file path to upload");
                    return;
                }
                const file = Bun.file(args[0]);
                const content = await file.text();
                await demo.uploadFile(args[0], content, file.type || "text/plain");
                break;
            case "info":
                if (!args[0]) {
                    console.log("❌ Please provide a file key to get info");
                    return;
                }
                await demo.printFileInfo(args[0]);
                break;
            case "print":
                if (!args[0]) {
                    console.log("❌ Please provide a file key to print");
                    return;
                }
                await demo.printFile(args[0]);
                break;
            case "delete":
                if (!args[0]) {
                    console.log("❌ Please provide a file key to delete");
                    return;
                }
                await demo.deleteFile(args[0]);
                break;
            case "presign":
                if (!args[0]) {
                    console.log("❌ Please provide a file key to presign");
                    return;
                }
                const expiresIn = args[1] ? parseInt(args[1]) : S3Demo.DEFAULT_PRESIGN_EXPIRES;
                await demo.presignFile(args[0], expiresIn);
                break;
            case "help":
                demo.showHelp();
                break;
            case undefined:
            default:
                await demo.runDemo();
                break;
        }
    } catch (error) {
        console.error("❌ Operation failed:", error.message);
        process.exit(1);
    }
}

main().catch(console.error);
