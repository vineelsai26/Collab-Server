import { Request, Response } from 'express'
import { Socket, Server } from 'socket.io'
import express from 'express'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import cors from 'cors'
import 'dotenv/config'
import http from 'http'
import Doc from '../models/Doc.js'

const app = express()

const PORT = process.env.PORT || 4000

const server = new http.Server(app)
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    }
})

const db = process.env.MONGODB_DOCS
if (!db) {
    console.error('MongoDB not configured')
    process.exit(1)
}

try {
    mongoose.connect(db, {})
    console.log('MongoDB connected')
} catch (err: any) {
    console.error(err.message)
    process.exit(1)
}

io.on('connection', (socket: Socket) => {
    const id = socket.handshake.query.id
    socket.join(id!)
    socket.on('send', ({ message, index, length }: { message: string, index: number, length: number }) => {
        socket.broadcast.to(id?.toString()!).emit('receive', { message: message, index: index, length: length })
    })
    socket.on('send_hash', ({ hash, index, length }: { hash: string, index: number, length: number }) => {
        socket.broadcast.to(id?.toString()!).emit('receive_hash', { hash: hash, index: index, length: length })
    })
    socket.on('request', ({ hash, index }) => {
        socket.broadcast.to(id?.toString()!).emit('requested_lines', { hash: hash, index: index })
    })
    socket.on('title', (title: string) => {
        socket.broadcast.to(id?.toString()!).emit('title', title)
    })
    socket.on('join', () => {
        socket.broadcast.to(id?.toString()!).emit('join')
    })
})

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
const jsonParser = bodyParser.json()

app.get('/', (_: Request, res: Response) => {
    res.status(200).send('Server is running')
})

app.post('/dbGet', jsonParser, async (req: Request, res: Response) => {
    const pageId = req.body.pageId
    const email = req.body.email
    const content = req.body.content
    const title = req.body.title
    const addEmail = req.body.addEmail
    const accessType = req.body.accessType
    const doc = await Doc.findOne({ id: pageId })

    if (doc && doc._id) {
        if (content) {
            doc.content = content
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
        if (accessType) {
            doc.accessType = accessType
            await doc.save()
        }
        if (doc.accessType === 'public') {
            res.json(doc)
        } else {
            if (doc.accessList.includes(email) || doc.accessType === 'public') {
                res.json(doc)
            } else {
                res.json({ error: "You don't have access to this page" })
            }
        }
    } else {
        const newDoc = new Doc({
            id: pageId,
            content: "",
            accessType: "public",
            accessList: [email]
        })

        await newDoc.save().then((data: any) => {
            res.json(data)
        }).catch((err: any) => {
            console.log(err)
            res.json({ error: "You don't have access to this page" })
        })
    }
})

app.post('/myDocs', jsonParser, async (req: Request, res: Response) => {
    const email = req.body.email
    const docs = await Doc.find({ accessList: email })
    res.status(200).json(docs)
})

app.post('/deleteDoc', jsonParser, (req: Request, res: Response) => {
    const id = req.body.id
    Doc.deleteOne({ id: id }, (err: any, docs: any) => {
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
