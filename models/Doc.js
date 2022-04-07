const mongoose = require('mongoose')

const docsSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: String
    },
    contentType: {
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