import { Server } from 'socket.io';
import Binance from 'node-binance-api';
import { calcPNLPercent, closePosition, closeAllPositions } from './binance/binance.js';
const io = new Server();
const activeAccountSockets = {}; // Lưu trữ các socket đang hoạt động cho các tài khoản

const startWebSocketForAccount = (account) => {
	const socket = io.of(`/ws/${account.accountId}`);
	const binance = new Binance();
	binance.options({
		APIKEY: account.accountAPIKey,
		APISECRET: account.accountSecretKey
	});


	socket.intervalId = setInterval(async () => {
		//Todo
		//Check PNL
		//Kiểm tra vị thế
		const positionRisk = await binance.futuresPositionRisk();
		const positions = positionRisk.filter(x => Number(x.positionAmt) != 0);
		const dataPNL = []
		for (let position of positions) {
			let pnlPercent = calcPNLPercent(position)
			const data = {
				accountId: account.accountId,
				symbol: position.symbol,
				side: position.positionAmt > 0 ? 'LONG' : 'SHORT',
				pnlPercent: `${Number(pnlPercent).toFixed(4)}`,
				pnlValue: `${Number(position.unRealizedProfit).toFixed(4)}`
			}
			dataPNL.push(data)
		}
		const data = {
			dataPNL: dataPNL
		}
		socket.emit('accountData', data);
		//unRealizedProfit - Số tiền PNL, có thể âm


	}, 1000); // Log thông tin mỗi 2 giây

	socket.on('connection', (clientSocket) => {
		console.log(`WebSocket started for account ${account.accountId}`);

		clientSocket.on('closeSymbol', (messageData) => {
			if (messageData.closeAll) {
				//Close All
				closeAllPositions(binance)
			}
			else {
				closePosition(binance, messageData.symbol)
			}
		});
	});

	socket.on('disconnect', () => {
		console.log(`WebSocket stopped for account ${account.accountId}`);
		delete activeAccountSockets[account.accountId];
		clearInterval(socket.intervalId);
	});

	activeAccountSockets[account.accountId] = socket;
};


const stopWebSocketForAccount = (account) => {
	const socket = activeAccountSockets[account.accountId];
	console.log(account);
	if (socket) {
		clearInterval(socket.intervalId);
		const binance = new Binance();
		binance.options({
			APIKEY: account.accountAPIKey,
			APISECRET: account.accountSecretKey
		});
		closeAllPositions(binance)
		console.log(`WebSocket stopped for account ${account.accountId}`);
		delete activeAccountSockets[account.accountId];
	}
};


export { io, startWebSocketForAccount, stopWebSocketForAccount };
