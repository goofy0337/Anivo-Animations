import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4567;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database setup
const db = new (sqlite3.verbose()).Database('./users.db', (err) => {
  if (err) {
    console.error('Database error:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

// Helper function to generate token
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
}

// Middleware to verify token
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Routes

// Sign up
app.post('/api/signup', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (user) {
      return res.status(400).json({ message: 'Email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Server error' });
        }

        const token = generateToken(this.lastID);
        res.status(201).json({
          message: 'User created successfully',
          token,
          user: { id: this.lastID, username, email }
        });
      });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  });
});

// Get current user
app.get('/api/user', verifyToken, (req, res) => {
  db.get('SELECT id, username, email FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  });
});

// Create project
app.post('/api/projects', verifyToken, (req, res) => {
  const { title, description } = req.body;
  
  db.run('INSERT INTO projects (user_id, title, description, data) VALUES (?, ?, ?, ?)',
    [req.userId, title, description, JSON.stringify({})],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }

      res.status(201).json({
        id: this.lastID,
        user_id: req.userId,
        title,
        description,
        data: {}
      });
    });
});

// Get user's projects
app.get('/api/projects', verifyToken, (req, res) => {
  db.all('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC', [req.userId], (err, projects) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    res.json(projects.map(p => ({ ...p, data: JSON.parse(p.data) })));
  });
});

// Get single project
app.get('/api/projects/:id', verifyToken, (req, res) => {
  db.get('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.userId], (err, project) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ ...project, data: JSON.parse(project.data) });
  });
});

// Update project
app.put('/api/projects/:id', verifyToken, (req, res) => {
  const { title, description, data } = req.body;
  
  db.run('UPDATE projects SET title = ?, description = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [title, description, JSON.stringify(data), req.params.id, req.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }

      res.json({ message: 'Project updated successfully' });
    });
});

// Delete project
app.delete('/api/projects/:id', verifyToken, (req, res) => {
  db.run('DELETE FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.userId], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    res.json({ message: 'Project deleted successfully' });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
