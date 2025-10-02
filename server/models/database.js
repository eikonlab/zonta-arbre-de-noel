const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    // Create database file in the server directory
    const dbPath = path.join(__dirname, '..', 'messages.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database');
        this.initDatabase();
      }
    });
  }

  initDatabase() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        toxicity REAL,
        onTopic BOOLEAN,
        flagged TEXT,
        createdAt TEXT NOT NULL
      )
    `;

    this.db.run(createTableQuery, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Messages table ready');
      }
    });
  }

  // Get all messages
  getAllMessages() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM messages ORDER BY createdAt ASC', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Convert boolean fields back from integer
          const messages = rows.map(row => ({
            ...row,
            onTopic: Boolean(row.onTopic)
          }));
          resolve(messages);
        }
      });
    });
  }

  // Insert a new message
  insertMessage(message) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO messages (author, content, toxicity, onTopic, flagged, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        message.author,
        message.content,
        message.toxicity,
        message.onTopic ? 1 : 0, // Convert boolean to integer for SQLite
        message.flagged,
        message.createdAt
      ];

      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          // Return the message with the actual database ID
          resolve({
            ...message,
            id: this.lastID
          });
        }
      });
    });
  }

  // Close database connection
  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
        resolve();
      });
    });
  }

  // Clear all messages (for debugging)
  clearMessages() {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM messages', [], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`Deleted ${this.changes} messages`);
          resolve(this.changes);
        }
      });
    });
  }
}

module.exports = Database;