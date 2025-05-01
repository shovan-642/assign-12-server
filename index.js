const express = require('express');
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');


const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())

// assignment-12
// YQt$e!A~63x2QNv




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@assignment-10.9gvo9.mongodb.net/?retryWrites=true&w=majority&appName=assignment-10`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const campCollection = client.db("MCMS").collection("camps")



    app.get("/camp", async(req, res)=>{
        const result = await campCollection.find().toArray()
        res.send(result)
    })

    app.get("/highestCamp", async(req, res)=>{
        const topParticipantCamp = campCollection.find().sort({participant_count:-1}).limit(6)
        const result = await topParticipantCamp.toArray()
        res.send(result)
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);






app.get('/', (req, res)=>{
    res.send('my express server is running')
})

app.listen(port, ()=>{
    console.log(`my port is ${port}` )
})