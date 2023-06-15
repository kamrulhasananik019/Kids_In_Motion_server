require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000;


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


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.diakkqj.mongodb.net/?retryWrites=true&w=majority`;

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
        // await client.connect();


        const usersCollection = client.db('ass-12').collection("users");
        const allclassCollection = client.db('ass-12').collection("allclass");
        const selectclassCollection = client.db('ass-12').collection("selectClass");
        const paymentCollection = client.db('ass-12').collection("payment")
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


        app.get('/allclass', async (req, res) => {
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

        // feedback
        app.patch('/allclass/:id', verifyJWT, verifyAdmin, async (req, res) => {
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



        app.get('/myclass/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await allclassCollection.find(query).toArray()
            res.send(result)
        })
        // instructors
        app.get('/instructors', async (req, res) => {
            const quary = { role: 'instructor' };
            const result = await usersCollection.find(quary).toArray()
            res.send(result)
        })


        //  select class
        app.post('/select', verifyJWT, async (req, res) => {
            const selectedClass = req.body;

            const existingClass = await selectclassCollection.findOne(selectedClass);
            if (existingClass) {
                console.log(existingClass);
                res.status(400).send('Selected class already exists');
                return;
            }
            const result = await selectclassCollection.insertOne(selectedClass);
            res.send(result);
        });


        app.get('/select', async (req, res) => {
            const result = await selectclassCollection.find().toArray()
            res.send(result)
        })

        app.get('/select/:user', async (req, res) => {
            const user = req.params.user;
            const query = { user: user }
            const result = await selectclassCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/select/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) }
            const result = await selectclassCollection.deleteOne(query);
            res.send(result)
        });

        // payment

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        app.patch('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;

            // Insert payment document only if it doesn't exist
            const query = { classname: payment.classname, email: payment.email };
            const existingPayment = await paymentCollection.findOne(query);

            if (!existingPayment) {
                const insertedResult = await paymentCollection.insertOne(payment);

                // Update the class document in paymentCollection
                const filter = { classname: payment.classname };
                const updateDoc = {
                    $inc: {
                        seats: -1,
                        enrolledStuNum: 1
                    }
                };

                const updatePaymentResult = await paymentCollection.updateOne(filter, updateDoc, { upsert: false });

                // Update the class document in classCollection
                const updateClassResult = await allclassCollection.updateOne(filter, updateDoc, { upsert: false });



                res.send({ insertedResult, updatePaymentResult, updateClassResult });
            } else {
                // delete from selected classes //
                const deletedSelected = await selectclassCollection.deleteOne(query)

                res.send({ message: 'Payment document already exists' });
            }
        });

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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