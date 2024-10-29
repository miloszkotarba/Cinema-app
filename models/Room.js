const mongoose = require('mongoose')

const RoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Cinema Room Name is required"],
        unique: true,
    }, numberOfSeats: {
        type: Number,
        required: [true, "Cinema numberOfSeats is required"],
        min: 1,
        max: 200,
    }
}, {
    versionKey: false
})

module.exports = mongoose.model("Room", RoomSchema);