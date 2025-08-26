
import { dbConnect } from './sql-connect.js';

class TodoApp {
  constructor(client, dbType) {
    this.client = client;
    this.dbType = dbType;
  }

  validateTodoId(id) {
    const todoId = parseInt(id);
    if (!todoId) {
      console.log("❌ Please provide a valid todo ID");
      return null;
    }
    return todoId;
  }

  async findTodoById(id) {
    const existing = await this.client`SELECT id, completed, task FROM todos WHERE id = ${id}`;
    if (existing.length === 0) {
      console.log(`❌ Todo with ID ${id} not found`);
      return null;
    }
    return existing[0];
  }

  async setupDatabase() {
    console.log("🔧 Setting up database…");
    switch (this.dbType) {
      case 'PostgreSQL':
        await this.client`
          CREATE TABLE IF NOT EXISTS todos (
            id SERIAL PRIMARY KEY,
            task VARCHAR(255) NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        break;
      case 'MySQL':
        await this.client`
          CREATE TABLE IF NOT EXISTS todos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            task VARCHAR(255) NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        break;
      default:
        throw new Error(`Unsupported database type: ${this.dbType}`);
    }
    console.log("✅ Database setup complete");
  }

  async addTodo(task) {
    switch (this.dbType) {
      case 'PostgreSQL': {
        const pgResult = await this.client`INSERT INTO todos (task) VALUES (${task}) RETURNING id`;
        console.log(`📝 Added todo: "${task}" (ID: ${pgResult[0].id})`);
        break;
      }
      case 'MySQL': {
        await this.client`INSERT INTO todos (task) VALUES (${task})`;
        const mysqlResult = await this.client`SELECT LAST_INSERT_ID() as id`;
        console.log(`📝 Added todo: "${task}" (ID: ${mysqlResult[0].id})`);
        break;
      }
      default:
        throw new Error(`Unsupported database type: ${this.dbType}`);
    }
  }

  async listTodos() {
    const todos = await this.client`SELECT * FROM todos ORDER BY created_at DESC`;
    console.log("\n📋 Todo List:");
    console.log("─".repeat(50));
    if (todos.length === 0) {
      console.log("   No todos found. Add some with: bun todo-cli.js add \"Your task\"");
      return;
    }
    todos.forEach(todo => {
      const status = todo.completed ? "✅" : "⏳";
      const date = new Date(todo.created_at).toLocaleDateString();
      console.log(`${status} [${todo.id}] ${todo.task} (${date})`);
    });
  }

  async toggleTodo(id) {
    const todo = await this.findTodoById(id);
    if (!todo) return;
    const newStatus = !todo.completed;
    await this.client`UPDATE todos SET completed = ${newStatus} WHERE id = ${id}`;
    const statusIcon = newStatus ? "✅" : "⏳";
    const statusText = newStatus ? "completed" : "pending";
    console.log(`${statusIcon} Marked todo ${id} as ${statusText}: "${todo.task}"`);
  }

  async deleteTodo(id) {
    const todo = await this.findTodoById(id);
    if (!todo) return;
    await this.client`DELETE FROM todos WHERE id = ${id}`;
    console.log(`🗑️ Deleted todo ${id}`);
  }

  async showStats() {
    const [total] = await this.client`SELECT COUNT(*) as total FROM todos`;
    const [completed] = await this.client`SELECT COUNT(*) as completed FROM todos WHERE completed = TRUE`;
    const [pending] = await this.client`SELECT COUNT(*) as pending FROM todos WHERE completed = FALSE`;
    console.log("\n📊 Statistics:");
    console.log(`   Total tasks: ${total.total}`);
    console.log(`   Completed: ${completed.completed}`);
    console.log(`   Pending: ${pending.pending}`);
  }

  showHelp() {
    console.log("\n📚 Todo CLI - Usage:");
    console.log("   bun todo-cli.js list                      - Show all todos");
    console.log("   bun todo-cli.js add \"Task description\"    - Add a new todo");
    console.log("   bun todo-cli.js toggle <id>               - Toggle todo status (completed/pending)");
    console.log("   bun todo-cli.js delete <id>               - Delete a todo");
    console.log("   bun todo-cli.js stats                     - Show statistics");
    console.log("   bun todo-cli.js help                      - Show this help");
  }
}

async function main() {
  const { client, dbType } = await dbConnect();
  const app = new TodoApp(client, dbType);

  try {
    await app.setupDatabase();
    const [, , command, ...args] = process.argv;
    switch (command) {
      case "add":
        if (!args[0]) {
          console.log("❌ Please provide a task description");
          return;
        }
        await app.addTodo(args.join(" "));
        break;
      case "list":
      case undefined:
        await app.listTodos();
        break;
      case "toggle": {
        const toggleId = app.validateTodoId(args[0]);
        if (!toggleId) return;
        await app.toggleTodo(toggleId);
        break;
      }
      case "delete": {
        const deleteId = app.validateTodoId(args[0]);
        if (!deleteId) return;
        await app.deleteTodo(deleteId);
        break;
      }
      case "stats":
        await app.showStats();
        break;
      case "help":
      default:
        app.showHelp();
        break;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
