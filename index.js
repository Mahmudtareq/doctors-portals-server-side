const { MongoClient } = require('mongodb');
const express = require('express')
const admin = require("firebase-admin");
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000
// doctors-portal-firebase-adminsdk.json


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// middle ware
app.use(cors());
app.use(express.json());

// database connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l1qze.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// console.log(uri)
// verfiy token 
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;

      
    }
    catch {
      
    }
  }
  next();
}
// 
async function run(){
    try{
      await client.connect()
      const database = client.db("doctorsDB");
      const appointmentCollection = database.collection(" appointments");
      const userCollection = database.collection('users');
      // new user create 
      // get data 
      app.get('/appointments',verifyToken, async (req, res) => {
        const email = req.query.email;
        const date = req.query.date;
        // console.log(date)
        const query = { email: email ,date:date};
        // console.log(query)
        const cursor = appointmentCollection.find(query);
        const appointments = await cursor.toArray();
        // console.log(appointments)
        res.json(appointments);
      })

      
      
      // post method appointments
      // post only one users
      app.post('/appointments', async (req, res) => {
        const appointment = req.body;
        const result = await appointmentCollection.insertOne(appointment);
        // console.log(result);
        res.json(result)
        
      })
      // admin find
      app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let isAdmin = false;
        if (user?.role === 'admin') {
          isAdmin = true;
        }
        res.json({ admin: isAdmin });
      })

      // 
      // for users collection
      app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await userCollection.insertOne(user);
        // console.log(result);
        res.json(result);
      })

      // 
      app.put('/users', async (req, res) => {
        const user = req.body;
        // console.log('put',user)
        const filter = { email: user.email }
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await userCollection.updateOne(filter, updateDoc, options)
        res.json(result);
      })

        // admin create
      app.put('/users/admin', verifyToken, async (req, res) => {
        const user = req.body;
        const requester =  req.decodedEmail;
        if (requester) {
          const requesterAccount = await userCollection.findOne({ email: requester });
          if (requesterAccount.role === 'admin') {
            const filter = { email: user.email };
            const updateDoc = { $set: { role: 'admin' } };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.json(result);
          }
          
        }
        else {
          res.status(403).json({message:"You  do not have access to make admin"})
        }
      
      })

    }
    finally{
        // await client.close();

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello Doctors portal')
})

app.listen(port, () => {
  console.log(`Listening at :`,port)
})