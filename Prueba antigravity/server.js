/**
 * JAVI HUB - Backend Alternativo en Node.js (Express + mysql2)
 * Para ejecutar: npm install express mysql2 cors && node server.js
 */

const express = require('express');
const cors = require('cors');
let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  mysql = null;
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'javihub_db'
};

async function getPool() {
  if (!mysql) return null;
  try {
    return mysql.createPool(dbConfig);
  } catch (err) {
    return null;
  }
}

app.get('/api/ping', async (req, res) => {
  const pool = await getPool();
  if (!pool) return res.json({ status: 'ok', mysql_connected: false });
  try {
    const [rows] = await pool.query('SELECT 1');
    res.json({ status: 'ok', mysql_connected: true });
  } catch (e) {
    res.json({ status: 'ok', mysql_connected: false, error: e.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password, altura, peso_inicial, ocupacion_tipo, ocupacion_nombre } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
  }

  const pool = await getPool();
  if (!pool) {
    return res.status(500).json({ success: false, message: 'MySQL no disponible en Node' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM usuarios WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'El usuario ya existe' });
    }

    const [result] = await pool.query(
      'INSERT INTO usuarios (username, password, altura, peso_inicial, ocupacion_tipo, ocupacion_nombre) VALUES (?, ?, ?, ?, ?, ?)',
      [username, password, altura || 175, peso_inicial || 70, ocupacion_tipo || 'estudio', ocupacion_nombre || 'DAM']
    );

    res.json({
      success: true,
      user: {
        id: result.insertId,
        username,
        altura,
        peso_inicial,
        ocupacion_tipo,
        ocupacion_nombre
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const pool = await getPool();
  if (!pool) return res.status(500).json({ success: false, message: 'MySQL no disponible' });

  try {
    const [rows] = await pool.query(
      'SELECT id, username, password, altura, peso_inicial, ocupacion_tipo, ocupacion_nombre FROM usuarios WHERE username = ?',
      [username]
    );

    if (rows.length === 0 || rows[0].password !== password) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const user = { ...rows[0] };
    delete user.password;
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Javi Hub Server corriendo en http://localhost:${PORT}`);
});
