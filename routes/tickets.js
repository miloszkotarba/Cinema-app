/**
 * @swagger
 * components:
 *   schemas:
 *     Ticket:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The automatically generated ID of the Cinema Room
 *         name:
 *           type: string
 *           description: The Ticket type
 *         price:
 *           type: number
 *           description: Price per each ticket
 *           example: 20
 *       required:
 *         - name
 *         - price
 */

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Endpoints for managing Tickets
 */

/**
 * @swagger
 * paths:
 *   /api/v1/tickets:
 *     get:
 *       summary: Returns the list of all tickets
 *       tags:
 *         - Tickets
 *       parameters:
 *         - in: query
 *           name: name
 *           description: Filter tickets by name (e.g., 'ulgowy')
 *     post:
 *       summary: Create a new ticket
 *       tags:
 *         - Tickets
 *   /api/v1/tickets/{id}:
 *     patch:
 *       summary: Update a specific ticket by ID
 *       tags:
 *         - Tickets
 *     delete:
 *       summary: Delete a specific ticket by ID
 *       tags:
 *         - Tickets
 */

const express = require('express')
const router = express.Router()

const {
    createTicket,
    getAllTickets,
    updateTicket,
    deleteTicket,
} = require("../controllers/tickets");

router.route("/").get(getAllTickets).post(createTicket)
router.route("/:id").patch(updateTicket).delete(deleteTicket)

module.exports = router