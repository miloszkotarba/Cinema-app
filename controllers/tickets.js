const Ticket = require('../models/Ticket')
const { createCustomError } = require("../errors/custom-error");
const Room = require("../models/Room");

const getAllTickets = async (req, res) => {
    const { name } = req.query
    const queryObject = {}

    if (name) {
        queryObject.name = name
    }

    const tickets = await Ticket.find(queryObject)
    res.status(200).json({ total: tickets.length, tickets })
}

const createTicket = async (req, res) => {
    const ticket = await Ticket.create(req.body)
    res.status(201).json(ticket)
}

const updateTicket = async (req, res, next) => {
    const { id: ticketID } = req.params

    const ticket = await Ticket.findOneAndUpdate({ _id: ticketID }, req.body, {
        new: true,
        runValidators: true
    })

    if (!ticket) {
        return next(createCustomError(`No ticket with ID: ${ticketID}`, 404))
    }

    res.status(200).json(ticket)
}

const deleteTicket = async (req, res, next) => {
    const { id: ticketID } = req.params

    const ticket = await Ticket.findOneAndDelete({ _id: ticketID })

    if (!ticket) {
        return next(createCustomError(`No ticket with ID: ${ticketID}`, 404))
    }

    res.status(200).json(ticket)
}

module.exports = {
    getAllTickets,
    createTicket,
    updateTicket,
    deleteTicket
}