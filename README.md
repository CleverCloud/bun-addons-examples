# Clever Cloud add-ons - Bun examples

This repository contains examples of how to use Clever Cloud add-ons thanks to native [Bun](https://bun.sh) support. To use them you need [Bun](https://bun.sh), [Clever Tools](https://www.clever-cloud.com/doc/reference/cli/) CLI and [git](https://git-scm.com/) installed.

## Setup

Clone this repository:

```bash
git clone https://github.com/CleverCloud/bun-addons-examples
cd bun-addons-examples

# create a .env file to store your add-ons credentials
touch .env
```

## PostgreSQL / MySQL

Create a PostgreSQL or MySQL add-on:

```bash
clever addon create postgresql-addon <addon-name>
clever addon create mysql-addon <addon-name>

# Add credentials to .env
clever addon env <addon-name> >> .env
```

### Basic usage

Test connection, if a MySQL add-on and a PostgreSQL add-on are available, you'll be prompted to choose one:

```bash
bun sql-connect.js
```

### SQL TODO CLI

```bash
# Show all todos
bun sql-todo.js

# Add a todo
bun sql-todo.js add "Learn Bun with PostgreSQL"

# Toggle completion
bun sql-todo.js toggle 1

# Show statistics
bun sql-todo.js stats

# Delete a todo
bun sql-todo.js delete 1
```

## Cellar (S3-compatible Object Storage)

Create a Cellar add-on:

```bash
clever addon create cellar <addon-name>

# Add credentials to .env
clever addon env <addon-name> >> .env
```

Go to the [Clever Cloud Console](https://console.clever-cloud.com/), open your Cellar add-on and create a bucket.

### Basic usage

Connect and list bucket contents:

```bash
bun s3-connect.js <bucket-name>
```

### S3 file management, presigned URL

```bash
# Run full demo
bun s3.js <bucket-name>

# List files
bun s3.js <bucket-name> list

# Upload a file
echo 'Hello, Clever Cloud!' > myfile.txt
bun s3.js <bucket-name> upload myfile.txt

# Print file contents
bun s3.js <bucket-name> print myfile.txt

# Generate presigned URL (5 minutes default)
bun s3.js <bucket-name> presign myfile.txt

# Generate presigned URL (custom duration)
bun s3.js <bucket-name> presign myfile.txt 3600

# Delete a file
bun s3.js mybucket delete myfile.txt
```

## Materia KV / Redis

Create a Materia KV or Redis add-on (both work with this script):

```bash
clever addon create kv <addon-name>
# or
clever addon create redis <addon-name>

# Add credentials to .env
clever addon env <addon-name> >> .env
```

### Key-Value client

```bash
# Set a key
bun kv-client.js SET mykey "Hello World"

# Get a key
bun kv-client.js GET mykey

# List all keys
bun kv-client.js KEYS "*"

# JSON operations (Materia KV)
bun kv-client.js JSON.SET myJsonKey $ '{"name":"John","age":30}'
bun kv-client.js JSON.GET myJsonKey
bun kv-client.js JSON.GET myJsonKey $.name

# Get info
bun kv-client.js PING
```

## Documentation

- [Clever Tools Reference](https://www.clever-cloud.com/doc/reference/cli/)
- [Cellar add-on documentation](https://www.clever-cloud.com/doc/addons/cellar/)
- [MySQL add-on documentation](https://www.clever-cloud.com/doc/addons/mysql/)
- [PostgreSQL add-on documentation](https://www.clever-cloud.com/doc/addons/postgresql/)
- [Materia KV add-on documentation](https://www.clever-cloud.com/doc/addons/materia-kv/)
- [Redis add-on documentation](https://www.clever-cloud.com/doc/addons/redis/)
