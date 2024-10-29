const mongoose = require('mongoose')

const MovieSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Title is required"]
    },
    director: {
        type: String,
        required: [true, "Director is required"]
    },
    release: {
        year: {
            type: Number,
            required: [true, "Release Year is required"],
        },
        country: {
            type: String,
            required: [true, "Release Country is required"],
        },
        poster: {
            data: Buffer,
            contentType: String,
        }
    },
    duration: {
        type: Number,
        required: [true, "Duration is required"]
    },
    ageRestriction: {
        type: Number,
    },
    cast: {
        type: [String],
        default: [],
    },
    genres: {
        type: [String],
        default: [],
    },
    description: {
        type: String,
        required: [true, "Description is required"],
    },
    posterUrl: {
        type: String,
        default: null
    },
    posterPublicId: {
        type: String,
    }
}, {
    versionKey: false
})

module.exports = mongoose.model("Movie", MovieSchema)