const express = require('express');
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config();


const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())



app.get('/', (req, res)=>{
    res.send('my express server is running')
})

app.listen(port, ()=>{
    console.log(`my port is ${port}` )
})