/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The automatically generated ID of the Cinema Room
 *         name:
 *           type: string
 *           description: The Room name
 *         numberOfSeats:
 *           type: number
 *           description: Seating capacity in the Cinema Room
 *       required:
 *         - name
 *         - numberOfSeats
 */

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Endpoints for managing Cinema Rooms
 */

/**
 * @swagger
 * paths:
 *   /api/v1/rooms:
 *     get:
 *       summary: Returns the list of all rooms
 *       tags:
 *         - Rooms
 *     post:
 *       summary: Create a new room
 *       tags:
 *         - Rooms
 *
 *   /api/v1/rooms/{id}:
 *     get:
 *       summary: Get a specific room by ID
 *       tags:
 *         - Rooms
 *     patch:
 *       summary: Update a specific room by ID
 *       tags:
 *         - Rooms
 *     delete:
 *       summary: Delete a specific room by ID
 *       tags:
 *         - Rooms
 */

const express = require('express')
const router = express.Router()

const {
    getAllRooms,
    createRoom,
    getRoom,
    updateRoom,
    deleteRoom,
} = require('../controllers/rooms')

router.route("/").get(getAllRooms).post(createRoom)
router.route("/:id").get(getRoom).patch(updateRoom).delete(deleteRoom)

module.exports = router