// Database management using SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create/open database file
const dbPath = path.join(__dirname, '..', 'messages.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Database connected:', dbPath);
    initDatabase();
  }
});

// Initialize database schema
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      toxicity REAL,
      onTopic INTEGER DEFAULT 1,
      flagged TEXT,
      hidden INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Messages table ready');
      // Check if hidden column exists, add it if missing (migration)
      db.all("PRAGMA table_info(messages)", [], (err, columns) => {
        if (err) {
          console.error('Error checking table schema:', err);
          return;
        }
        const hasHiddenColumn = columns.some(col => col.name === 'hidden');
        if (!hasHiddenColumn) {
          console.log('Migrating database: adding hidden column');
          db.run('ALTER TABLE messages ADD COLUMN hidden INTEGER DEFAULT 0', (err) => {
            if (err) {
              console.error('Error adding hidden column:', err);
            } else {
              console.log('Migration complete: hidden column added');
            }
          });
        }
      });
    }
  });
}

// Get all messages
function getAllMessages() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM messages ORDER BY createdAt ASC', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Convert INTEGER (0/1) to boolean for hidden and onTopic
        const messages = rows.map(row => ({
          ...row,
          hidden: Boolean(row.hidden),
          onTopic: Boolean(row.onTopic)
        }));
        resolve(messages);
      }
    });
  });
}

// Create a new message
function createMessage(message) {
  return new Promise((resolve, reject) => {
    const { author, content, toxicity, onTopic, flagged, hidden, createdAt } = message;
    db.run(
      `INSERT INTO messages (author, content, toxicity, onTopic, flagged, hidden, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [author, content, toxicity, onTopic ? 1 : 0, flagged, hidden ? 1 : 0, createdAt],
      function (err) {
        if (err) {
          reject(err);
        } else {
          // Return the created message with the new ID
          resolve({
            ...message,
            id: this.lastID
          });
        }
      }
    );
  });
}

// Update a message (for moderation)
function updateMessage(id, updates) {
  return new Promise((resolve, reject) => {
    const { hidden } = updates;
    db.run(
      'UPDATE messages SET hidden = ? WHERE id = ?',
      [hidden ? 1 : 0, id],
      function (err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('Message not found'));
        } else {
          // Fetch and return the updated message
          db.get('SELECT * FROM messages WHERE id = ?', [id], (err, row) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                ...row,
                hidden: Boolean(row.hidden),
                onTopic: Boolean(row.onTopic)
              });
            }
          });
        }
      }
    );
  });
}

// Delete a message
function deleteMessage(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM messages WHERE id = ?', [id], function (err) {
      if (err) {
        reject(err);
      } else if (this.changes === 0) {
        reject(new Error('Message not found'));
      } else {
        resolve({ success: true, id });
      }
    });
  });
}

// Bulk update messages
function bulkUpdateMessages(updates) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('UPDATE messages SET hidden = ? WHERE id = ?');

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      updates.forEach(update => {
        if (typeof update.hidden === 'boolean') {
          stmt.run(update.hidden ? 1 : 0, update.id);
        }
      });

      db.run('COMMIT', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true, updated: updates.length });
        }
      });
    });

    stmt.finalize();
  });
}

module.exports = {
  db,
  getAllMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  bulkUpdateMessages
};
