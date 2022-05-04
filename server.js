const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const Doc = require('./models/Doc');

const PORT = process.env.PORT || 7000

const server = require('http').Server(app)
const io = require('socket.io')(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    }
})

mongoose.connect(process.env.MONGODB_DOCS, {}).then(() => {
    console.log('Connected to MongoDB')
}).catch(err => {
    console.log(err)
})

const users = {}

io.on('connection', (socket) => {
    const id = socket.handshake.query.id
    socket.join(id)
    if (users[id]) {
        users[id]++
    } else {
        users[id] = 1
    }
    socket.on('send', ({ message }) => {
        socket.broadcast.to(id).emit('receive', { message: message, noOfUsers: users[id] })
    })
    socket.on('join', () => {
        socket.broadcast.to(id).emit('join')
    })
    socket.on('disconnect', () => {
        if (users[id] > 1) {
            users[id]--
        } else {
            delete users[id]
        }
        socket.to(id).emit('userLeft', { noOfUsers: users[id] })
    })
})

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
const jsonParser = bodyParser.json()


app.get('/', (req, res) => {
    res.status(200).send('Server is running')
})

app.post('/dbGet', jsonParser, async (req, res) => {
    const pageId = req.body.pageId
    const email = req.body.email
    const content = req.body.content
    const title = req.body.title
    const addEmail = req.body.addEmail
    Doc.findOne({ id: pageId }, async (err, doc) => {
        if (err) {
            console.log(err)
        } else {
            if (doc && doc._id) {
                if (content) {
                    doc.content = JSON.stringify(content)
                    await doc.save()
                }
                if (title) {
                    doc.title = title
                    await doc.save()
                }
                if (addEmail) {
                    doc.accessList = addEmail
                    await doc.save()
                }
                if (doc.accessType === 'public') {
                    res.json(doc)
                } else {
                    if (doc.accessList.includes(email)) {
                        res.json(doc)
                    } else {
                        res.json({ error: "You don't have access to this page" })
                    }
                }
            } else {
                const newDoc = new Doc({
                    id: pageId,
                    content: "",
                    contentType: "public",
                    accessList: [email]
                })

                await newDoc.save().then((data) => {
                    res.json(data)
                }).catch(err => {
                    console.log(err)
                    res.json({ error: "You don't have access to this page" })
                })
            }
        }
    })
})

app.post('/myDocs', jsonParser, (req, res) => {
    const email = req.body.email
    Doc.find({ accessList: email }, (err, docs) => {
        if (err) {
            console.log(err)
            res.status(500).json({ error: "Something went wrong" })
        } else {
            res.status(200).json(docs)
        }
    })
})

app.post('/deleteDoc', jsonParser, (req, res) => {
    const id = req.body.id
    Doc.deleteOne({ id: id }, (err, docs) => {
        if (err) {
            console.log(err)
            res.status(500).json({ error: "Something went wrong" })
        } else {
            res.status(200).json(docs)
        }
    })
})

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})