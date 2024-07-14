import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getUserByUsername, insertAccount, deleteAccountById, getAccountsByUsername } from '../database/dbContext.js';

const router = express.Router();

// Endpoint to insert a new account for a user
router.post('/', verifyToken, async (req, res) => {
  const { username } = req.user;
  const { accountAPIKey, accountSecretKey, accountId } = req.body;

  let result = {
    data: [],
    errorFlg: true,
    message: ''
  }

  getUserByUsername(username, (err, userRow) => {
    if (err) {
      console.error(err.message);
      result.message = "Internal server error"
      return res.status(500).json(result);;
    }

    if (!userRow) {
      result.message = "User not found"
      return res.status(404).json(result);;
    }

    const userId = userRow.id;
    const account = { accountAPIKey, accountSecretKey, accountId };

    insertAccount(userId, account, (err) => {
      if (err) {
        console.error(err.message);
        result.message = "Failed to insert account"
        return res.status(500).json(result);;
      } else {
        result.message = "Insert sussces"
        result.errorFlg = false
        return res.status(200).json(result);;
      }
    });
  });
});

// Endpoint to delete an account by accountId
router.delete('/:accountId', verifyToken, async (req, res) => {
  const { username } = req.user;
  const { accountId } = req.params;
  let result = {
    data: [],
    errorFlg: true,
    message: ''
  }
  deleteAccountById(accountId, username, (err) => {
    if (err) {
      console.error(err.message);
      result.message = "Failed to delete account"
      return res.status(500).json(result);
    } else {
      result.message = "Delete sussces"
      result.errorFlg = false
      return res.status(200).send(result);
    }
  });
});

// Endpoint to get all accounts of a user by username
router.get('/', verifyToken, async (req, res) => {
  const { username } = req.user;
  let result = {
    data: [],
    errorFlg: true,
    message: ''
  }
  getAccountsByUsername(username, (err, accounts) => {
    if (err) {
      console.error(err.message);
      result.message = "Internal server error"
      return res.status(500).json(result);
    }

    if (!accounts || accounts.length === 0) {
      result.message = "No accounts found for this user"
      return res.status(404).json(result);
    }

    result.errorFlg = false
    result.data = accounts.map(item => {
      return {
          accountId: item.accountId
      }
  })
    return res.json(result);
  });
});

export default router;
