// import { sendTelegramMessage } from '../telegram.js'

/**
 * Change leverage for a symbol in the futures market.
 *
 * @param {string} symbol - The symbol for which to change the leverage.
 * @param {number} leverage - The leverage value to set.
 */
async function changeLeverage(binance, symbol, leverage) {
    try {
        await binance.futuresLeverage(symbol, leverage).then(async res => {
            let message = ''
            if (res.code == undefined) {
                message = `Đòn bẩy cặp giao dịch ${symbol} được thay đổi thành x${leverage}`
            }
            else {
                message = `Đòn bẩy cặp giao dịch ${symbol} đổi thành x${leverage} thất bại`
            }
            //await sendTelegramMessage(message)
            console.log('CHANGE LEVERAGE SUSSCES', { REQUEST: { symbol: symbol, leverage: leverage }, RESPONSE: res })
        }).catch(err => console.log('CHANGE LEVERAGE ERROR', { REQUEST: { symbol: symbol, leverage: leverage }, ERROR: err }))
    } catch (error) {
        console.error(`Error setting leverage for ${symbol}: ${error}`)
    }
}
/**
* @param {string} symbol - The symbol of the position to close.
* @return {Promise<void>} - A promise that resolves when the position is closed.
*/
const closePosition = async function (binance, symbol) {
    try {
        // Đóng tất cả các lệnh mở với symbol này
        const openOrders = await binance.futuresOpenOrders(symbol);
        if (openOrders.length > 0) {
            await binance.futuresCancelAll(symbol);
            console.log(`Cancelled all open orders for ${symbol}`);
        }
        // Kiểm tra vị thế hiện tại
        const positionRisk = await binance.futuresPositionRisk();
        const position = positionRisk.find(x => x.symbol === symbol);
        const positionAmt = parseFloat(position.positionAmt);
        const side = positionAmt > 0 ? 'SELL' : 'BUY';

        if (position && Number(position.positionAmt) !== 0) {
            // Xử lý đóng vị thế


            const quantity = Math.abs(positionAmt);
            const order = side == 'BUY' ? await binance.futuresMarketBuy(symbol, quantity) : await binance.futuresMarketSell(symbol, quantity)
        } else {
            console.log(`No position to close for ${symbol}`);
        }
    } catch (error) {
        console.error(`Error in closePositionBySymbol: ${error}`);
    }
}

const closeAllPositions = async function (binance) {
    try {
        // Get all open positions
        const positionRisk = await binance.futuresPositionRisk();
        const openPositions = positionRisk.filter(position => Number(position.positionAmt) !== 0);

        if (openPositions.length === 0) {
            console.log('No open positions to close.');
            return;
        }

        for (let position of openPositions) {
            const symbol = position.symbol;
            const positionAmt = parseFloat(position.positionAmt);
            const side = positionAmt > 0 ? 'SELL' : 'BUY';

            // Cancel all open orders for this symbol
            const openOrders = await binance.futuresOpenOrders(symbol);
            if (openOrders.length > 0) {
                await binance.futuresCancelAll(symbol);
                console.log(`Cancelled all open orders for ${symbol}`);
            }

            // Close the position
            if (Number(position.positionAmt) !== 0) {
                const quantity = Math.abs(positionAmt);
                const order = side === 'BUY'
                    ? await binance.futuresMarketBuy(symbol, quantity)
                    : await binance.futuresMarketSell(symbol, quantity);
                console.log(`Closed position for ${symbol}`);
            }
        }

        console.log('All positions closed.');
    } catch (error) {
        console.error(`Error in closeAllPositions: ${error}`);
    }
}


const openPosition = async function (binance, request, orderType) {
    const order_action = request.order_action;
    const symbol = request.symbol;
    const price = Number(`${request.price}`.substring(0, Number(request.sizePricePrecision)));
    const callbackRate = Number(request.callbackRate);
    const position_size_usdt = request.position_size_usdt;
    const leverage = request.leverage;
    const takeProfitRate = Number(request.takeProfitRate);

    const order_contracts = Math.floor((position_size_usdt * leverage) / price);
    const activationPrice = (price + (order_action == 'buy' ? (price * callbackRate) / 100 : -(price * callbackRate) / 100))
        .toString()
        .substring(0, Number(request.sizePricePrecision));

    const stopLossPrice = (order_action == 'buy'
        ? price - (2 * price * callbackRate) / 100
        : price + (2 * price * callbackRate) / 100)
        .toString()
        .substring(0, Number(request.sizePricePrecision));

    const takeProfitPrice = (order_action == 'buy'
        ? price + (price * takeProfitRate) / 100
        : price - (price * takeProfitRate) / 100)
        .toString()
        .substring(0, Number(request.sizePricePrecision));

    console.log(`Price: ${price}`);
    console.log(`Activation Price: ${activationPrice}`);
    console.log(`Stop Loss Price: ${stopLossPrice}`);
    console.log(`Take Profit Price: ${takeProfitPrice}`);

    try {
        await changeLeverage(binance, symbol, leverage);
        await closePosition(binance, symbol);
        if (orderType == 'LIMIT') {
            if (order_action == 'buy') {
                await binance.futuresBuy(symbol, order_contracts, price, { timeInForce: 'GTC', type: 'LIMIT' })
                    .then(res => console.log('ORDER SUCCESS', { REQUEST: request, RESPONSE: res }))
                    .catch(err => console.log('ORDER ERROR', { REQUEST: request, ERROR: err }));

                await binance.futuresSell(symbol, order_contracts, price, { timeInForce: 'GTC', type: 'TRAILING_STOP_MARKET', callbackRate: callbackRate, activationPrice: activationPrice })
                    .then(res => {
                        console.log('TRAILING STOP SUCCESS', { REQUEST: request, RESPONSE: res })
                        return res
                    })
                    .catch(err => console.log('TRAILING STOP ERROR', { REQUEST: request, ERROR: err }));

                await binance.futuresMarketSell(symbol, order_contracts, {
                    type: "STOP_MARKET",
                    stopPrice: stopLossPrice,
                    priceProtect: true
                })
                    .then(res => {
                        console.log('STOP LOSS SUCCESS', { REQUEST: request, RESPONSE: res })
                        return res
                    })
                    .catch(err => console.log('STOP LOSS ERROR', { REQUEST: request, ERROR: err }))

                if (takeProfitRate != 0) {
                    await binance.futuresMarketSell(symbol, order_contracts, {
                        type: "TAKE_PROFIT_MARKET",
                        stopPrice: takeProfitPrice,
                        priceProtect: true
                    }).then(res => {
                        console.log('TAKE PROFIT SUCCESS', { REQUEST: request, RESPONSE: res })
                        return res
                    })
                        .catch(err => console.log('TAKE PROFIT ERROR', { REQUEST: request, ERROR: err }))
                }
            }
            else {
                await binance.futuresSell(symbol, order_contracts, price, { timeInForce: 'GTC', type: 'LIMIT' })
                    .then(res => console.log('ORDER SUCCESS', { REQUEST: request, RESPONSE: res }))
                    .catch(err => console.log('ORDER ERROR', { REQUEST: request, ERROR: err }));

                await binance.futuresBuy(symbol, order_contracts, price, { timeInForce: 'GTC', type: 'TRAILING_STOP_MARKET', callbackRate: callbackRate, activationPrice: activationPrice })
                    .then(res => {
                        console.log('TRAILING STOP SUCCESS', { REQUEST: request, RESPONSE: res })
                        return res
                    })
                    .catch(err => console.log('TRAILING STOP ERROR', { REQUEST: request, ERROR: err }));

                await binance.futuresMarketBuy(symbol, order_contracts, {
                    type: "STOP_MARKET",
                    stopPrice: stopLossPrice,
                    priceProtect: true
                })
                    .then(res => {
                        console.log('STOP LOSS SUCCESS', { REQUEST: request, RESPONSE: res })
                        return res
                    })
                    .catch(err => console.log('STOP LOSS ERROR', { REQUEST: request, ERROR: err }));

                if (takeProfitRate != 0) {
                    await binance.futuresMarketBuy(symbol, order_contracts, {
                        type: "TAKE_PROFIT_MARKET",
                        stopPrice: takeProfitPrice,
                        priceProtect: true
                    })
                        .then(res => {
                            console.log('TAKE PROFIT SUCCESS', { REQUEST: request, RESPONSE: res })
                            return res
                        })
                        .catch(err => console.log('TAKE PROFIT ERROR', { REQUEST: request, ERROR: err }))
                }
            }
        }
        else {
            if (order_action == 'buy') {
                await binance.futuresMarketBuy(symbol, order_contracts)
                    .then(res => console.log('ORDER SUCCESS', { REQUEST: request, RESPONSE: res }))
                    .catch(err => console.log('ORDER ERROR', { REQUEST: request, ERROR: err }));

                await binance.futuresSell(symbol, order_contracts, price, { timeInForce: 'GTC', type: 'TRAILING_STOP_MARKET', callbackRate: callbackRate, activationPrice: activationPrice })
                    .then(res => {
                        console.log('TRAILING STOP SUCCESS', { REQUEST: request, RESPONSE: res })
                        return res
                    })
                    .catch(err => console.log('TRAILING STOP ERROR', { REQUEST: request, ERROR: err }));

                await binance.futuresMarketSell(symbol, order_contracts, {
                    type: "STOP_MARKET",
                    stopPrice: stopLossPrice,
                    priceProtect: true
                })
                    .then(res => {
                        console.log('STOP LOSS SUCCESS', { REQUEST: request, RESPONSE: res })
                        return res
                    })
                    .catch(err => console.log('STOP LOSS ERROR', { REQUEST: request, ERROR: err }))

                if (takeProfitRate != 0) {
                    await binance.futuresMarketSell(symbol, order_contracts, {
                        type: "TAKE_PROFIT_MARKET",
                        stopPrice: takeProfitPrice,
                        priceProtect: true
                    }).then(res => {
                        console.log('TAKE PROFIT SUCCESS', { REQUEST: request, RESPONSE: res })
                        return res
                    })
                        .catch(err => console.log('TAKE PROFIT ERROR', { REQUEST: request, ERROR: err }))
                }
            }
            else {
                await binance.futuresMarketSell(symbol, order_contracts)
                    .then(res => console.log('ORDER SUCCESS', { REQUEST: request, RESPONSE: res }))
                    .catch(err => console.log('ORDER ERROR', { REQUEST: request, ERROR: err }));

                await binance.futuresBuy(symbol, order_contracts, price, { timeInForce: 'GTC', type: 'TRAILING_STOP_MARKET', callbackRate: callbackRate, activationPrice: activationPrice })
                    .then(res => {
                        console.log('TRAILING STOP SUCCESS', { REQUEST: request, RESPONSE: res })
                        return res
                    })
                    .catch(err => console.log('TRAILING STOP ERROR', { REQUEST: request, ERROR: err }));

                await binance.futuresMarketBuy(symbol, order_contracts, {
                    type: "STOP_MARKET",
                    stopPrice: stopLossPrice,
                    priceProtect: true
                })
                    .then(res => {
                        console.log('STOP LOSS SUCCESS', { REQUEST: request, RESPONSE: res })
                        return res
                    })
                    .catch(err => console.log('STOP LOSS ERROR', { REQUEST: request, ERROR: err }));

                if (takeProfitRate != 0) {
                    await binance.futuresMarketBuy(symbol, order_contracts, {
                        type: "TAKE_PROFIT_MARKET",
                        stopPrice: takeProfitPrice,
                        priceProtect: true
                    })
                        .then(res => {
                            console.log('TAKE PROFIT SUCCESS', { REQUEST: request, RESPONSE: res })
                            return res
                        })
                        .catch(err => console.log('TAKE PROFIT ERROR', { REQUEST: request, ERROR: err }))
                }
            }
        }

        //await sendTelegramMessage(`Mở vị thế [${(order_action == 'buy' ? 'LONG' : 'SHORT')}] ${symbol}`);
    } catch (error) {
        console.error(`openOrderPosition$: ${error}`);
    }
}

const calcPNLPercent = function (positionData) {
    const entryPrice = parseFloat(positionData.entryPrice);
    const markPrice = parseFloat(positionData.markPrice);
    const unRealizedProfit = parseFloat(positionData.unRealizedProfit);
    const notional = parseFloat(positionData.notional);

    // Tính phần trăm PNL
    const pnlPercent = (unRealizedProfit / Math.abs(notional)) * 100;
    return pnlPercent
}

export {
    closePosition,
    closeAllPositions,
    openPosition,
    calcPNLPercent
}
