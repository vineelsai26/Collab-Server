const mongoose = require('mongoose')

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
        type: String
    },
    accessType: {
        type: String,
        required: true,
        default: 'public'
    },
    accessList: {
        type: JSON,
        required: true
    },
})

module.exports = mongoose.model('Doc', docsSchema)