const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();
const ObjectId = require("mongodb").ObjectId;
const { MongoClient } = require("mongodb");

const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());


const serviceAccount = require('./superWheels-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6e2lo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


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
async function run() {
  try {
    await client.connect();
    const database = client.db("SuperWheels");
    const vehiclesCollection = database.collection("vehicles");
    const reviewsCollection = database.collection("reviews");
    const usersCollection = database.collection('users');
    const orderCollection = database.collection("order");






    app.get("/vehicles", async (req, res) => {
      const cursor = vehiclesCollection.find({});
      const vehicles = await cursor.toArray();
      res.send(vehicles);
    });
    // GET Single package
    app.get("/vehicles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const vehicle = await vehiclesCollection.findOne(query);
      res.json(vehicle);
    });
    app.post("/vehicles", async (req, res) => {
      const vehicle = req.body;
      const result = await vehiclesCollection.insertOne(vehicle);
      res.json(result);
    });
    app.delete(`/vehicles/:id`, async (req, res) => {
      const query = { _id: ObjectId(req.params.id) };
      console.log(query);
      const result = await vehiclesCollection.deleteOne(query);
      res.json(result);
    });
    app.get("/reviews", async (req, res) => {
      const cursor = reviewsCollection.find({});
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      review.createdAt = new Date();
      const result = await reviewsCollection.insertOne(review);
      res.json(result);
    });
    app.get("/order", async (req, res) => {
      const cursor = orderCollection.find({});
      const order = await cursor.toArray();
      res.send(order);
    });
    app.post("/order", async (req, res) => {
      const order = req.body;
      order.createdAt = new Date();
      const result = await orderCollection.insertOne(order);
      res.json(result);
    });
    app.delete(`/order/:id`, async (req, res) => {
      const query = { _id: ObjectId(req.params.id) };
      console.log(query);
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === 'admin') {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    });

    app.put('/users/admin', verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({ email: requester });
        if (requesterAccount.role === 'admin') {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: 'admin' } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      }
      else {
        res.status(403).json({ message: 'you do not have access to make admin' })
      }

    })
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("SuperWheels server is running");
});

app.listen(port, () => {
  console.log("Server running at port", port);
});
