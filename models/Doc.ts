import mongoose from 'mongoose'

const docsSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
        default: 'Untitled'
    },
    content: {
        type: String,
        default: ''
    },
    accessType: {
        type: String,
        required: true,
        default: 'public'
    },
    accessList: {
        type: Array,
        required: true
    },
})

export default mongoose.model('Doc', docsSchema)
