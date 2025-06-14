const express = require('express');
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const port = process.env.PORT || 5000;


app.use(cors({
  origin: ["https://assignment-12-4815a.web.app", "http://localhost:5173", "assignment-12-4815a.firebaseapp.com"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
}))
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
    const regCampCollection = client.db("MCMS").collection("registered-camps")



    // jwt token

    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '5h'})
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
    app.post('/registered-camp', async(req, res)=>{
      const item = req.body
      const result =  await regCampCollection.insertOne(item)
      await campCollection.updateOne(
        {_id: new ObjectId(item.camp_id)},
        {$inc: {participant_count: 1}}
      )
      res.send(result)
    })

    app.post('/create-payment-intent', async(req, res)=>{
      const {price}=req.body
      const amount = parseInt(price * 100)
      const paymentIntent =  await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.get("/registered-camp", verifyToken, async(req, res)=>{
        const result = await regCampCollection.find().toArray()
        res.send(result)
    })

    app.get("/registered-camp/:email", verifyToken, async(req, res)=>{
      const email = req.params.email
      if(email !== req.decoded.email){
        return res.status(403).send ({message: "forbidden access"})
      }
      const query = {participant_email: email}
      const result = await regCampCollection.find(query).toArray()
        res.send(result)
    })

    app.delete("/delete-registered-camp/:regCampId", verifyToken, async(req, res)=>{
      const id = req.params.regCampId
      const query = {_id: new ObjectId(id)}
      const result = await regCampCollection.deleteOne(query)
      res.send(result)
    })

    app.patch("/update-registered-camp/:regCampId", verifyToken, async(req, res)=>{
      const regCampId = req.params.regCampId
      const {transactionId}= req.body
      const filter = {_id: new ObjectId(regCampId), participant_email: req.decoded.email}
      const updateDoc = {
        $set: {
          payment_status: "paid",
          confirmation_status: "confirmed",
          transaction_id : transactionId
        }
      } 
      const result = await regCampCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.get("/payment-history/:email", verifyToken, async(req, res)=>{
      const email = req.params.email
      if(email !== req.decoded.email){
        return res.status(403).send({message: "forbidden access"})
      }
      const query = { participant_email: email, payment_status: "paid"}
      const result = await regCampCollection.find(query).toArray()
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

    app.patch("/update-camp/:campId", verifyToken, verifyAdmin, async(req, res)=>{
      const camp = req.body
      const id = req.params.campId
      const filter = {_id: new ObjectId(id)}
      const updateCamp = {
        $set: {
          camp_name : camp.camp_name,
          image : camp.image,
          camp_fees : camp.camp_fees,
          date_time : camp.date_time,
          location : camp.location,
          healthcare_professional_name : camp.healthcare_professional_name,
          description : camp.description,
        }
      }
      const result = await campCollection.updateOne(filter, updateCamp)
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