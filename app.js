import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import accountsRoutes from './routes/accounts.js';
import webhookRoutes from './routes/webhook.js';

const app = express();

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(cookieParser());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));
app.use('/login', (req,res)=>{
    res.render('login', {title: `Cài đặt thông số Bot`});
})
app.use('/home', (req,res)=>{
    res.render('home', {title: `Cài đặt thông số Bot`});
})
app.use('/auth', authRoutes);
app.use('/setting', settingsRoutes);
app.use('/accounts', accountsRoutes);;
app.use(`/${process.env.ENDPOINT}`, webhookRoutes)

export default app;