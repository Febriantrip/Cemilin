require('dotenv').config();
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'renjana_snacks', waitForConnections: true,
  connectionLimit: 10, decimalNumbers: true, timezone: '+07:00', dateStrings: true,
});
// Seluruh NOW(), TIMESTAMP dan batas waktu pembayaran memakai Asia/Jakarta (WIB).
pool.on('connection',connection=>{connection.query("SET time_zone = '+07:00'");});
const getSettings = async (conn = pool) => {
  const [[row]] = await conn.query('SELECT * FROM store_settings WHERE id=1');
  if (!row) throw Object.assign(new Error('Pengaturan toko belum tersedia. Import SQL terlebih dahulu.'), {status:503});
  return row;
};
module.exports = {pool,getSettings};
