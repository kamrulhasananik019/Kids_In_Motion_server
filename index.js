const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middle wars
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.epmhope.mongodb.net/?retryWrites=true&w=majority`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const usersCollection = client.db('ass-12').collection("users");
        const allclassCollection = client.db('ass-12').collection("allclass");

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin' && 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }





        // user related apis
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });



        // security layer: verifyJWT
        // email same
        // check admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        }
        )


        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })



        // instructor apis


        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        }
        )


        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // //////////ALL Class

        app.post('/addclass', verifyJWT, async (req, res) => {
            const addclass = req.body;
            const result = await allclassCollection.insertOne(addclass);
            res.send(result);
        })


        app.get('/allclass', verifyJWT, async (req, res) => {
            const result = await allclassCollection.find().toArray();
            res.send(result)
        })

        //  approved 

        app.patch('/allclass/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const { feedback, status } = req.body;

            const updateDoc = { $set: { feedback } };
            if (status) {
                updateDoc.$set.status = status;
            }
            const result = await allclassCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        //  feedback


        // app.patch('/fclass/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: new ObjectId(id) };
        //     const { feedback } = req.body;
        //     const update = { $set:  };
        //     const result = await allclassCollection.updateOne(filter, update);
        //     res.send(result);
        // });



        app.get('/myclass/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await allclassCollection.find(query).toArray()
            res.send(result)
        })
        // instructors
        app.get('/instructors', verifyJWT, async (req, res) => {
            const quary = { role: 'instructor' };
            const result = await usersCollection.find(quary).toArray()
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('sports is ON')
})

app.listen(port, () => {
    console.log(` Sports is  on Port ${port}`);
})