const express = require('express');
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())



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

    const userCollection = client.db("MCMS").collection("user")
    const campCollection = client.db("MCMS").collection("camps")



    // jwt token

    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res.send({token})
    })


     const verifyToken = (req, res, next)=>{
      if(!req.headers.authorization){
        return res.status(401).send({message: "unauthorized Access"})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          return res.status(401).send({message: "unauthorized access"})
        }
        req.decoded = decoded
        next()
      })
     }

     const verifyAdmin = async(req, res, next) =>{
      const email = req.decoded.email;
      const query = {email: email}
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
     }


    app.post('/users', async (req, res)=>{
      const user = req.body
      const query = {email: user.email}
      const exitingUser = await userCollection.findOne(query)
      if(exitingUser){
        return res.send({message: "user already exist", insertedID: null})

      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    app.post('/add-camp', verifyToken, verifyAdmin, async(req, res)=>{
      const item = req.body
      const result =  await campCollection.insertOne(item)
      res.send(result)

    })


    app.get('/users/admin/:email', verifyToken, verifyAdmin, async(req, res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden Access'})
      }
      const query = {email: email}
      const user  = await userCollection.findOne(query)
      let admin = false
      if(user){
        admin = user?.role === 'admin'
      }
      res.send({admin})

    })


    app.get("/camp", async(req, res)=>{
        const result = await campCollection.find().toArray()
        res.send(result)
    })
    app.get("/camp-details/:campId", async(req, res)=>{
      const id = req.params.campId
      const query = {_id: new ObjectId(id)}
      const result =  await campCollection.findOne(query)
      res.send(result)
    })

    app.delete("/delete-camp/:campId", verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.campId
      const query = {_id: new ObjectId(id)}
      const result = await campCollection.deleteOne(query)
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