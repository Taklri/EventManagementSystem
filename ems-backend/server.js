import express from 'express'
import cors from 'cors';
import dotenv from 'dotenv';
import {connectDB} from './config/db.js';
import routes from './routes/index.js';
import cookieParser from 'cookie-parser';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { startRegistrationFormCleanup } from './services/registrationFormCleanupService.js';

dotenv.config();

const app = express();

// Render places the service behind one reverse proxy and forwards the client
// address in X-Forwarded-For. Trust that single hop so rate limiting uses the
// real client IP without trusting arbitrary proxy chains.
app.set('trust proxy', 1);

const frontendOrigin = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

app.use(cors({
    origin: frontendOrigin,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api', apiRateLimiter, routes);

app.get("/", (req,res)=> {
    res.json({message: "API is working"});
});


const startServer = async () => {
    await connectDB();
    startRegistrationFormCleanup();

    app.listen(process.env.PORT, ()=> {
        console.log(`Listening to PORT: ${process.env.PORT}`)
    })
}

startServer();
