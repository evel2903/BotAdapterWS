import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByUsername } from '../database/dbContext.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET

router.post('/',  async (req, res) => {
    console.log(JWT_SECRET);
    const { username, password } = req.body;
    console.log(req.body);
    let result = {
        token: '',
        errorFlg: true,
        message: ''
    }
    getUserByUsername(username, (err, row) => {
        if (err) {
            console.error(err.message);
            result.message = 'Internal server error'
            return res.status(500).json(result)
        }

        if (!row) {
            result.message = 'User not found'
            return res.status(404).json(result)
        }

        if (bcrypt.compareSync(password, row.password)) {
            const token = jwt.sign({ username: username }, JWT_SECRET);
            result.token = token
            result.errorFlg = false
            result.message = 'Authentication success'
            return res.status(200).json(result);
        } 
        else {
            result.message = "Authentication failed"
            res.status(401).json(result);
        }
    });
});
router.post('/verify-token', async (req, res) => {
    const { token } = req.body;
    let result = {
        token: token,
        errorFlg: true,
        message: ''
    }

    if (!token) {
        result.message = 'Token is required'
        return res.status(400).json(result);
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        result.errorFlg = false
        result.message = 'Token is valid'
        return res.status(200).json(result);
    } catch (err) {
        console.log(err);
        result.message = 'Invalid token'
        return res.status(401).json(result);
    }
});

export default router;
