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
      flagReason TEXT,
      hidden INTEGER DEFAULT 0,
      priorityNumber INTEGER,
      ipAddress TEXT,
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
        const hasFlagReasonColumn = columns.some(col => col.name === 'flagReason');
        const hasPriorityNumberColumn = columns.some(col => col.name === 'priorityNumber');
        const hasIpAddressColumn = columns.some(col => col.name === 'ipAddress');
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
        if (!hasFlagReasonColumn) {
          console.log('Migrating database: adding flagReason column');
          db.run('ALTER TABLE messages ADD COLUMN flagReason TEXT', (err) => {
            if (err) {
              console.error('Error adding flagReason column:', err);
            } else {
              console.log('Migration complete: flagReason column added');
            }
          });
        }
        if (!hasPriorityNumberColumn) {
          console.log('Migrating database: adding priorityNumber column');
          db.run('ALTER TABLE messages ADD COLUMN priorityNumber INTEGER', (err) => {
            if (err) {
              console.error('Error adding priorityNumber column:', err);
            } else {
              console.log('Migration complete: priorityNumber column added');
            }
          });
        }
        if (!hasIpAddressColumn) {
          console.log('Migrating database: adding ipAddress column');
          db.run('ALTER TABLE messages ADD COLUMN ipAddress TEXT', (err) => {
            if (err) {
              console.error('Error adding ipAddress column:', err);
            } else {
              console.log('Migration complete: ipAddress column added');
            }
          });
        }

        // Ensure consistency: any flagged message should be hidden by default
        db.run(
          "UPDATE messages SET hidden = 1 WHERE (flagged IS NOT NULL AND flagged != '') AND hidden = 0",
          (err) => {
            if (err) {
              console.error('Error applying visibility consistency fix:', err);
            } else {
              console.log('Visibility consistency fix applied for flagged messages');
            }
          }
        );
      });
    }
  });

  // Create subscriptions table
  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      endpoint TEXT PRIMARY KEY,
      keys TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating subscriptions table:', err);
    } else {
      console.log('Subscriptions table ready');
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
    const { author, content, toxicity, onTopic, flagged, flagReason, hidden, priorityNumber, ipAddress, createdAt } = message;
    db.run(
      `INSERT INTO messages (author, content, toxicity, onTopic, flagged, flagReason, hidden, priorityNumber, ipAddress, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [author, content, toxicity, onTopic ? 1 : 0, flagged, flagReason, hidden ? 1 : 0, priorityNumber, ipAddress, createdAt],
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
    const fields = [];
    const params = [];

    if (typeof updates.hidden === 'boolean') {
      fields.push('hidden = ?');
      params.push(updates.hidden ? 1 : 0);
    }
    if (typeof updates.flagged !== 'undefined') {
      fields.push('flagged = ?');
      params.push(updates.flagged === null ? null : updates.flagged);
    }
    if (typeof updates.flagReason !== 'undefined') {
      fields.push('flagReason = ?');
      params.push(updates.flagReason === null ? null : updates.flagReason);
    }

    if (fields.length === 0) {
      return reject(new Error('No valid fields to update'));
    }

    const sql = `UPDATE messages SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    db.run(sql, params, function (err) {
      if (err) {
        return reject(err);
      }
      if (this.changes === 0) {
        return reject(new Error('Message not found'));
      }
      // Fetch and return the updated message
      db.get('SELECT * FROM messages WHERE id = ?', [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve({
          ...row,
          hidden: Boolean(row.hidden),
          onTopic: Boolean(row.onTopic)
        });
      });
    });
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

// Get hidden messages since a given ISO datetime
function getHiddenMessagesSince(sinceISO, limit = 50, offset = 0) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM messages
      WHERE hidden = 1 AND datetime(createdAt) >= datetime(?)
      ORDER BY datetime(createdAt) DESC
      LIMIT ? OFFSET ?
    `;
    db.all(sql, [sinceISO, limit, offset], (err, rows) => {
      if (err) return reject(err);
      const messages = rows.map(row => ({
        ...row,
        hidden: Boolean(row.hidden),
        onTopic: Boolean(row.onTopic)
      }));
      resolve(messages);
    });
  });
}

function countHiddenMessagesSince(sinceISO) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT COUNT(*) as cnt FROM messages WHERE hidden = 1 AND datetime(createdAt) >= datetime(?)`;
    db.get(sql, [sinceISO], (err, row) => {
      if (err) return reject(err);
      resolve(row?.cnt || 0);
    });
  });
}

// Count all messages
function countAllMessages() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM messages', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count);
      }
    });
  });
}

// Check if IP has posted in the last 24 hours
function hasPostedToday(ipAddress) {
  return new Promise((resolve, reject) => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sql = `SELECT COUNT(*) as count FROM messages WHERE ipAddress = ? AND datetime(createdAt) >= datetime(?)`;
    db.get(sql, [ipAddress, oneDayAgo], (err, row) => {
      if (err) return reject(err);
      resolve(row.count > 0);
    });
  });
}

// Check if IP can post (not exceeding POSTS_PER_DAY)
function canPost(ipAddress) {
  return new Promise((resolve, reject) => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sql = `SELECT COUNT(*) as count FROM messages WHERE ipAddress = ? AND datetime(createdAt) >= datetime(?)`;
    db.get(sql, [ipAddress, oneDayAgo], (err, row) => {
      if (err) return reject(err);
      resolve(row.count < POSTS_PER_DAY);
    });
  });
}

// Add a push subscription
function addSubscription(subscription) {
  return new Promise((resolve, reject) => {
    const { endpoint, keys } = subscription;
    const createdAt = new Date().toISOString();
    db.run(
      `INSERT OR REPLACE INTO subscriptions (endpoint, keys, createdAt) VALUES (?, ?, ?)`,
      [endpoint, JSON.stringify(keys), createdAt],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true });
        }
      }
    );
  });
}

// Remove a push subscription
function removeSubscription(endpoint) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM subscriptions WHERE endpoint = ?', [endpoint], function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ success: true });
      }
    });
  });
}

// Get all push subscriptions
function getAllSubscriptions() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM subscriptions', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const subscriptions = rows.map(row => ({
          endpoint: row.endpoint,
          keys: JSON.parse(row.keys)
        }));
        resolve(subscriptions);
      }
    });
  });
}

const POSTS_PER_DAY = parseInt(process.env.POSTS_PER_DAY, 10) || 5;

module.exports = {
  db,
  getAllMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  bulkUpdateMessages,
  getHiddenMessagesSince,
  countHiddenMessagesSince,
  countAllMessages,
  hasPostedToday,
  canPost,
  addSubscription,
  removeSubscription,
  getAllSubscriptions
};
