import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.execute('ALTER TABLE `business_profiles` ADD `isPremium` boolean DEFAULT false NOT NULL');
  console.log('Migration applied successfully!');
} catch (err) {
  if (err.code === 'ER_DUP_FIELDNAME') {
    console.log('Column already exists (safe to ignore)');
  } else {
    console.error('Migration failed:', err.message);
  }
} finally {
  await connection.end();
}
