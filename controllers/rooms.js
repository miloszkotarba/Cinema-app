const Room = require('../models/Room')
const { createCustomError } = require("../errors/custom-error");

const getAllRooms = async (req, res) => {
    const rooms = await Room.find({}).sort({ name: 1 })
    res.status(200).json({ total: rooms.length, rooms })
}

const getRoom = async (req, res, next) => {
    const { id: roomID } = req.params
    const room = await Room.findOne({ _id: roomID })

    if (!room) {
        return next(createCustomError(`No room with ID: ${roomID}`, 404))
    }

    res.status(200).json(room)
}

const createRoom = async (req, res) => {
    const room = await Room.create(req.body)
    res.status(201).json(room)
}

const updateRoom = async (req, res, next) => {
    const { id: roomID } = req.params
    const room = await Room.findOneAndUpdate({ _id: roomID }, req.body, {
        new: true,
        runValidators: true
    })

    if (!room) {
        return next(createCustomError(`No room with ID: ${roomID}`, 404))
    }

    res.status(200).json(room)
}

const deleteRoom = async (req, res, next) => {
    const { id: roomID } = req.params
    const room = await Room.findOneAndDelete({ _id: roomID })

    if (!room) {
        return next(createCustomError(`No room with ID: ${roomID}`, 404))
    }

    res.status(200).json(room)
}

module.exports = {
    getAllRooms, createRoom, getRoom, updateRoom, deleteRoom
}