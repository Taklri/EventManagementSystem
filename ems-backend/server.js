import express from 'express'
import cors from 'cors';
import dotenv from 'dotenv';
import {connectDB} from './config/db.js';
import routes from './routes/index.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);

app.get("/", (req,res)=> {
    res.json({message: "API is working"});
});


const startServer = async () => {
    await connectDB();

    app.listen(process.env.PORT, ()=> {
        console.log(`Listening to PORT: ${process.env.PORT}`)
    })
}

startServer();