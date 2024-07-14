import http from 'http';
import app from './app.js';
import { io, startWebSocketForAccount, stopWebSocketForAccount } from './websocket.js';
import { getAllAccounts, eventEmitter} from './database/dbContext.js';

const PORT = process.env.PORT
const server = http.createServer(app);
io.attach(server);

getAllAccounts((err, rows) => {
  if (err) {
    console.error(err.message);
    return;
  }
  rows.forEach((row) => {
    startWebSocketForAccount(row);
  });
});
// Listen for new accounts and start WebSocket connection for each new account
eventEmitter.on('newAccount', (newAccount) => {
  startWebSocketForAccount(newAccount);
});
// Listen for deleted accounts and stop WebSocket connection for each deleted account
eventEmitter.on('deleteAccount', (deletedAccount) => {
  stopWebSocketForAccount(deletedAccount);
});
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/login`);
});
