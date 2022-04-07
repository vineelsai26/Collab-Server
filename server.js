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

io.on('connection', (socket) => {
    const id = socket.handshake.query.id
    socket.join(id)
    socket.on('send', ({ message }) => {
        socket.to(id).emit('receive', { message })
    })
    socket.on('join', () => {
        socket.to(id).emit('join')
    })
    socket.on('disconnect', () => {
        socket.to(id).emit('userLeft')
    })
})

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
const jsonParser = bodyParser.json()


app.post('/dbGet', jsonParser, async (req, res) => {
    const pageId = req.body.pageId
    const email = req.body.email
    const content = req.body.content
    const addEmail = req.body.addEmail
    Doc.findOne({ id: pageId }, async (err, doc) => {
        if (err) {
            console.log(err)
        } else {
            if (doc && doc._id) {
                if (content) {
                    doc.content = content
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

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})