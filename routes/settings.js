import express from 'express';
import { updateUserSettings, insertUserSettings, getUserSettings } from '../database/dbContext.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Endpoint to update settings or insert if not exists
router.post('/', verifyToken, async (req, res) => {
  const { username } = req.user;
  const { telegramToken, telegramChannel, orderType, useTelegram } = req.body;

  let result = {
    data: {},
    errorFlg: true,
    message: ''
  }

  if (!['MARKET', 'LIMIT'].includes(orderType)) {
    result.message = "Invalid order type. Must be 'MARKET' or 'LIMIT'."
    return res.status(400).json(result);
  }

  // Check if settings exist for the username
  getUserSettings(username, (err, row) => {
    if (err) {
      console.error(err.message);
      result.message = "Internal server error"
      return res.status(500).json(result);;
    }

    if (row) {
      console.log(row);
      console.log(req.body);
      // Update existing settings
      updateUserSettings(username, { telegramToken, telegramChannel, orderType, useTelegram }, (err) => {
        if (err) {
          console.error(err.message);
          result.message = "Failed to update settings"
          return res.status(500).json(result);;
        } else {
          result.message = "Update sussces"
          result.errorFlg = false
          return res.status(200).json(result);;
        }
      });
    } else {
      // Insert new settings
      insertUserSettings(username, { telegramToken, telegramChannel, orderType, useTelegram }, (err) => {
        if (err) {
          console.error(err.message);
          result.message = "Failed to insert settings"
          return res.status(500).json(result);;
        } else {
          result.message = "Insert sussces"
          result.errorFlg = false
          return res.status(200).json(result);;
        }
      });
    }
  });
});


router.get('/', verifyToken, async (req, res) => {
  const { username } = req.user;

  let result = {
    data: {},
    errorFlg: true,
    message: ''
  }
  getUserSettings(username, (err, row) => {
    if (err) {
      console.error(err.message);
      result.message = 'Internal server error'
      return res.status(500).json(result);
    }

    // If settings are found, attach them to request object
    if (row) {
      result.data = {
        ...row,
        webhook: `${process.env.ENDPOINT}`,
      }
      result.errorFlg = false
    } else {
      // If settings are not found, create an empty object
      result.data = {}
      result.errorFlg = 'Settings are not found'
    }
    return res.status(200).json(result)
  });
});

export default router;
