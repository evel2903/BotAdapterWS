import bcrypt from 'bcryptjs';
import db from './database.js';

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)");
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        username TEXT, 
        telegramToken TEXT, 
        telegramChannel TEXT, 
        orderType TEXT CHECK(orderType IN ('MARKET', 'LIMIT')), 
        useTelegram INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        accountAPIKey TEXT,
        accountSecretKey TEXT,
        accountId TEXT,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    // Hash passwords before storing (for demo purposes, use bcrypt for production)
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    stmt.run("user1", bcrypt.hashSync("password1", 10));
    stmt.finalize();
});

console.log('Successful data migration...');
