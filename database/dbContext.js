import db from './database.js';
import bcrypt from 'bcryptjs';
import { EventEmitter } from 'events';

const eventEmitter = new EventEmitter();

// User related functions
const getUserByUsername = (username, callback) => {
  db.get("SELECT * FROM users WHERE username = ?", [username], callback);
};
// Function to change user password
const changePassword = async (username, currentPassword, newPassword) => {
  return new Promise((resolve, reject) => {
      // Retrieve user from database
      db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
          if (err) {
              reject(err);
          }
          if (!user) {
              reject(new Error('User not found'));
          }

          // Check if current password matches
          if (!bcrypt.compareSync(currentPassword, user.password)) {
              reject(new Error('Current password is incorrect'));
          }

          // Hash the new password
          const hashedPassword = bcrypt.hashSync(newPassword, 10);

          // Update the password in the database
          db.run("UPDATE users SET password = ? WHERE username = ?", [hashedPassword, username], (err) => {
              if (err) {
                  reject(err);
              }
              resolve('Password updated successfully');
          });
      });
  });
};

const updateUserSettings = (username, settings, callback) => {
  db.run("UPDATE settings SET telegramToken = ?, telegramChannel = ?, orderType = ?, useTelegram = ? WHERE username = ?", 
    [settings.telegramToken, settings.telegramChannel, settings.orderType, settings.useTelegram, username], callback);
};

const insertUserSettings = (username, settings, callback) => {
  db.run("INSERT INTO settings (username, telegramToken, telegramChannel, orderType, useTelegram) VALUES (?, ?, ?, ?, ?)", 
    [username, settings.telegramToken, settings.telegramChannel, settings.orderType, settings.useTelegram], callback);
};

const getUserSettings = (username, callback) => {
  db.get("SELECT * FROM settings WHERE username = ?", [username], callback);
};

const getAllUsernames = (callback) => {
  db.all("SELECT username FROM users", callback);
};

// Account related functions
const getAccountsByUserId = (userId, callback) => {
  db.all("SELECT * FROM accounts WHERE userId = ?", [userId], callback);
};
const getAllAccounts = (callback) => {
  db.all("SELECT * FROM accounts", callback);
}

const insertAccount = (userId, account, callback) => {
  db.run("INSERT INTO accounts (userId, accountAPIKey, accountSecretKey, accountId) VALUES (?, ?, ?, ?)", 
    [userId, account.accountAPIKey, account.accountSecretKey, account.accountId], function(err) {
      if (!err) {
        eventEmitter.emit('newAccount', { id: this.lastID, ...account, userId });
      }
      callback(err);
    });
};

const deleteAccountById = (accountId, username, callback) => {
  db.get(`SELECT * FROM accounts WHERE accountId = ? AND userId = (SELECT id FROM users WHERE username = ?)`, [accountId, username], (err, account) => {
    if (err) {
      return callback(err);
    }
    if (!account) {
      return callback(new Error('Account not found'));
    }

    db.run(`    
      DELETE FROM accounts
      WHERE accountId = ?
      AND userId = (SELECT id FROM users WHERE username = ?)`, [accountId, username], function(err) {
      if (!err) {
        eventEmitter.emit('deleteAccount', account);
      }
      callback(err);
    });
  });
};


const getAccountsByUsername = (username, callback) => {
  db.all("SELECT * FROM accounts WHERE userId = (SELECT id FROM users WHERE username = ?)", [username], callback);
};
const getAccountByUsernameAndAccountId = (username1,username2, accountId, callback) => {
  db.get(`
    SELECT * FROM
    accounts ac
    LEFT JOIN settings s ON s.username = ?
    WHERE ac.userId = (SELECT id FROM users WHERE username = ?) and ac.accountId = ?`, [username1,username2, accountId], callback);
};
export {
  getUserByUsername,
  changePassword,
  updateUserSettings,
  insertUserSettings,
  getUserSettings,
  getAllUsernames,
  getAccountsByUserId,
  getAllAccounts,
  insertAccount,
  deleteAccountById,
  getAccountsByUsername,
  getAccountByUsernameAndAccountId,
  eventEmitter 
};
