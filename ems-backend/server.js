const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req,res)=> {
    res.json({message: "API is working"});
});

app.listen(process.env.PORT, () => {
    console.log(`listening to port: ${process.env.PORT}`)
})