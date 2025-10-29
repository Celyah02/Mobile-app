import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize SQLite DB
const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Auth routes
app.post('/auth/signup', (req, res) => {
  const { firstName, lastName, email } = req.body;
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare('INSERT INTO users (firstName, lastName, email) VALUES (?, ?, ?)');
  stmt.run([firstName, lastName, email], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to create user' });
    }
    res.status(201).json({ id: this.lastID, firstName, lastName, email });
  });
});

app.get('/auth/users', (req, res) => {
  db.all('SELECT id, firstName, lastName, email, createdAt FROM users ORDER BY createdAt DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch users' });
    res.json(rows);
  });
});

// Products routes
app.post('/products', (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare('INSERT INTO products (name, description) VALUES (?, ?)');
  stmt.run([name, description], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to add product' });
    res.status(201).json({ id: this.lastID, name, description });
  });
});

app.get('/products', (req, res) => {
  db.all('SELECT id, name, description, createdAt FROM products ORDER BY createdAt DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch products' });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});


