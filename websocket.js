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

	socket.monitoring = false; // Initialize socket.monitoring
	const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

	const checkPNLAndPositions = async () => {
		try {
			// Check PNL
			const positionRisk = await binance.futuresPositionRisk();
			const positions = positionRisk.filter(x => Number(x.positionAmt) != 0);
			const dataPNL = [];
			for (let position of positions) {
				let pnlPercent = calcPNLPercent(position);
				const data = {
					accountId: account.accountId,
					symbol: position.symbol,
					side: position.positionAmt > 0 ? 'LONG' : 'SHORT',
					pnlPercent: `${Number(pnlPercent).toFixed(4)}`,
					pnlValue: `${Number(position.unRealizedProfit).toFixed(4)}`
				};
				dataPNL.push(data);
			}
			const data = {
				dataPNL: dataPNL
			};

			// Check open positions
			const allOrders = await binance.futuresOpenOrders();
			if (allOrders.length === 0) {
			} else {
				const groupedOrders = allOrders.reduce((acc, order) => {
					if (!acc[order.symbol]) {
						acc[order.symbol] = [];
					}
					acc[order.symbol].push(order);
					return acc;
				}, {});

				for (let symbol in groupedOrders) {
					const hasLimitOrder = groupedOrders[symbol].some(order => order.type === 'LIMIT');
					if (hasLimitOrder) continue;
					const position = positionRisk.find(x => x.symbol === symbol);
					if (Number(position.positionAmt) != 0) continue;
					await closePosition(binance, symbol);
				}
			}

			socket.emit('accountData', data);
		} catch (error) {
			console.error('Error in checkPNLAndPositions:', error);
		}
	};
	const startMonitoring = async () => {
		socket.monitoring = true; // Set socket.monitoring to true
		while (socket.monitoring) {
			await checkPNLAndPositions();
			await delay(1000); // Adjust the delay as needed
		}
	};

	startMonitoring();

	socket.on('connection', (clientSocket) => {
		console.log(`WebSocket started for account ${account.accountId}`);

		clientSocket.on('closeSymbol', async (messageData) => {
			if (messageData.closeAll) {
				//Close All
				await closeAllPositions(binance)
			}
			else {
				await closePosition(binance, messageData.symbol)
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


const stopWebSocketForAccount = async (account) => {
	const socket = activeAccountSockets[account.accountId];
	if (socket) {
		socket.monitoring = false; // Initialize socket.monitoring
		const binance = new Binance();
		binance.options({
			APIKEY: account.accountAPIKey,
			APISECRET: account.accountSecretKey
		});
		await closeAllPositions(binance)
		console.log(`WebSocket stopped for account ${account.accountId}`);
		delete activeAccountSockets[account.accountId];
	}
};


export { io, startWebSocketForAccount, stopWebSocketForAccount };
