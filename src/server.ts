import { Request, Response } from 'express'
import { Socket, Server } from 'socket.io'
import express from 'express'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import cors from 'cors'
import 'dotenv/config'
import http from 'http'
import Doc from '../models/Doc.js'
import { OAuth2Client } from 'google-auth-library'
import { randomUUID } from 'crypto'

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

async function getAuthInfo(id_token: string) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    const res = await client.verifyIdToken({ idToken: id_token, audience: process.env.CLIENT_ID })
    return res.getPayload()
}

const middleware = {
    jsonParser: jsonParser,
    getAuthInfo: async function (req: Request, res: Response, next: any) {
        req.body.email = ''
        try {
            const id_token = req.headers.authorization?.split(' ')[1]
            if (!id_token) {
                res.status(401).json({ error: 'Unauthorized' })
                return
            }
            const user = await getAuthInfo(id_token)
            if (user) {
                req.body.email = user.email
                next()
            } else {
                res.status(401).json({ error: 'Unauthorized' })
            }
        } catch (err: any) {
            console.error(err)
            res.status(401).json({ error: 'Unauthorized' })
        }
    }
}

app.get('/doc/:pageId', [middleware.jsonParser, middleware.getAuthInfo], async (req: Request, res: Response) => {
    const pageId = req.params.pageId
    const doc = await Doc.findOne({ id: pageId })
    const email = req.body.email

    if (doc) {
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
        res.json({ error: "Page doesn't exist" })
    }
})

app.post('/doc', [middleware.jsonParser, middleware.getAuthInfo], async (req: Request, res: Response) => {
    const email = req.body.email
    const newDoc = new Doc({
        id: randomUUID(),
        content: "",
        accessType: "public",
        accessList: [email]
    })

    const doc = await newDoc.save()
    res.json(doc)
})

app.patch('/doc', [middleware.jsonParser, middleware.getAuthInfo], async (req: Request, res: Response) => {
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
        res.json({ error: "Page doesn't exist" })
    }
})

app.get('/docs/me', [middleware.getAuthInfo], async (req: Request, res: Response) => {
    const email = req.body.email
    const docs = await Doc.find({ accessList: email })
    res.status(200).json(docs)
})

app.delete('/doc', [middleware.jsonParser, middleware.getAuthInfo], (req: Request, res: Response) => {
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
