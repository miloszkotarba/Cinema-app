const { createCustomError } = require('../errors/custom-error')
const mongoose = require('mongoose')

const ticketSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Type of Ticket is required"],
        enum: {
            values: ["ulgowy", "normalny"],
            message: "{VALUE} is not correct",
        },
    },
    price: {
        type: Number,
        required: [true, "The ticket price is required"]
    }
}, {
    versionKey: false
})

// Dodanie walidacji przed zapisaniem do bazy danych
ticketSchema.pre('save', async function (next) {
    const existingTicket = await this.constructor.findOne({ name: this.name });

    if (existingTicket && !existingTicket._id.equals(this._id)) {
        return next(createCustomError(`There can be only one "${this.name}" ticket`, 400))
    } else {
        next();
    }
});


module.exports = mongoose.model('Ticket', ticketSchema)