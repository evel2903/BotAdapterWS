import express from 'express';
import Binance from 'node-binance-api';
import { getAccountByUsernameAndAccountId } from '../database/dbContext.js';
import { openPosition} from '../binance/binance.js';

const router = express.Router();

// Endpoint to update settings or insert if not exists
router.post('/', async (req, res) => {

    const alert = req.body
    const username = alert.username
    const accountId = alert.accountId

    let result = {
        data: {},
        errorFlg: true,
        message: ''
    }

    getAccountByUsernameAndAccountId(username,username, accountId, async (err, row) => {
        if (err) {
            console.error(err.message);
            result.message = "Internal server error"
            return res.status(500).json(result);;
        }

        if (!row) {
            result.message = "Account not found"
            return res.status(404).json(result);
        }
        const { accountAPIKey, accountSecretKey, orderType} = row;
        result.errorFlg = false
        result.message = "Order sussces"
        const binance = new Binance();
        binance.options({
            APIKEY: accountAPIKey,
            APISECRET: accountSecretKey
        });

        await openPosition(binance, alert, orderType)
        return res.status(200).json(result)
    })
    
});

export default router;
