require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Pool } = require('pg');

async function initialize() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set in environment.");
  }

  // Connect to postgres database to check/create the target database
  const connectionStringForPostgres = dbUrl.replace(/\/([^\/]+)$/, '/postgres');
  console.log("Connecting to default postgres database to verify target database...");
  
  const client = new Client({ connectionString: connectionStringForPostgres });
  await client.connect();
  
  const targetDbName = dbUrl.match(/\/([^\/]+)$/)[1];
  
  const checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = $1";
  const res = await client.query(checkDbQuery, [targetDbName]);
  
  if (res.rowCount === 0) {
    console.log(`Database '${targetDbName}' does not exist. Creating it...`);
    // Note: CREATE DATABASE cannot be executed in a transaction block, pg client runs it cleanly
    await client.query(`CREATE DATABASE ${targetDbName}`);
    console.log(`Database '${targetDbName}' created successfully.`);
  } else {
    console.log(`Database '${targetDbName}' already exists.`);
  }
  
  await client.end();

  // Connect to target database to run schema.sql
  console.log(`Connecting to database '${targetDbName}' to execute schema...`);
  const pool = new Pool({ connectionString: dbUrl });
  
  const schemaPath = path.join(__dirname, 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  await pool.query(schemaSql);
  console.log("Schema applied successfully. Conversations and Messages tables are ready!");
  
  await pool.end();
}

initialize()
  .then(() => {
    console.log("Database setup completed successfully.");
    process.exit(0);
  })
  .catch(err => {
    console.error("Database setup failed:", err.message);
    process.exit(1);
  });
