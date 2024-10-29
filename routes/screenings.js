/**
 * @swagger
 * components:
 *   schemas:
 *     Seat:
 *       type: object
 *       properties:
 *         seatNumber:
 *           type: number
 *           description: The seat number
 *         typeofSeat:
 *           type: string
 *           enum:
 *             - ulgowy
 *             - normalny
 *           description: The type of seat (ulgowy or normalny)
 *       required:
 *       - seatNumber
 *       - typeofSeat
 *
 *     Client:
 *       type: object
 *       properties:
 *         lastName:
 *           type: string
 *           description: The last name of the client
 *         firstName:
 *           type: string
 *           description: The first name of the client
 *         email:
 *           type: string
 *           format: email
 *           description: The email address of the client
 *       required:
 *       - lastName
 *       - firstName
 *       - email
 *
 *     Reservation:
 *       type: object
 *       properties:
 *         _id:
 *          type: string
 *          description: The automatically generated ID of the Reservation
 *         seats:
 *           type: array
 *           description: <b>Array of Seat Object.</b> The seats reserved
 *         client:
 *           type: object
 *           description: <b>Client Object.</b> The client making the reservation
 *       required:
 *       - seats
 *       - client
 *
 *     Screening:
 *       type: object
 *       required:
 *         - date
 *         - movie
 *         - room
 *         - advertisementsDuration
 *       properties:
 *         _id:
 *           type: string
 *           description: The automatically generated ID of the Screening
 *         date:
 *           type: string
 *           format: date-time
 *           description: The date of the screening
 *           example: "2023-12-31T18:30:00Z"
 *         advertisementsDuration:
 *           type: number
 *           description: The duration of the advertisements in minutes
 *         movie:
 *           type: object
 *           required:
 *             - _id
 *           properties:
 *             _id:
 *               type: string
 *               description: The ID of the Movie Object
 *         room:
 *           type: object
 *           required:
 *             - _id
 *           properties:
 *             _id:
 *               type: string
 *               description: The ID of the Room Object
 *         reservations:
 *           type: array
 *           description: <b>Array of Reservation Object.</b> The reservations
 */

/**
 * @swagger
 * tags:
 *   name: Screenings
 *   description: Endpoints for managing Screenings and Reservations
 */

/**
 * @swagger
 * paths:
 *   /api/v1/screenings:
 *     get:
 *       summary: Returns the list of all screenings
 *       tags:
 *         - Screenings
 *       parameters:
 *         - in: query
 *           name: date
 *           description: Filter screenings by date (e.g., '2023-11-12')
 *         - in: query
 *           name: movie
 *           description: Filter screenings by ID of Movie Object (e.g., '657f463dff2cf6ad54a0710d')
 *     post:
 *       summary: Create a new screening
 *       tags:
 *         - Screenings
 *   /api/v1/screenings/{id}:
 *     get:
 *       summary: Get a specific screening by ID
 *       tags:
 *         - Screenings
 *     delete:
 *       summary: Delete a specific screening by ID
 *       tags:
 *         - Screenings
 *
 *
 *   /api/v1/screenings/{id}/reservations:
 *     get:
 *       summary: Returns the list of all reservations by ID of Screening
 *       tags:
 *         - Screenings
 *     post:
 *       summary: Push a new reservation to the Reservation Object
 *       tags:
 *         - Screenings
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             example:
 *               seats:
 *                 - seatNumber: 17
 *                   typeOfSeat: 'normalny'
 *                 - seatNumber: 20
 *                   typeOfSeat: 'ulgowy'
 *               client:
 *                 lastName: 'Wójcikowski'
 *                 firstName: 'Jan'
 *                 email: 'msiuda9@gmail.com'
 *
 *
 *
 *   /api/v1/screenings/{id}/reservations/{id}:
 *     get:
 *       summary: Get a specific reservation by ID
 *       tags:
 *         - Screenings
 */



const express = require('express')
const router = express.Router()

const {
    getAllScreenings,
    getScreening,
    createScreening,
    updateScreening,
    deleteScreening,
    getAllReservations,
    getReservation,
    createReservation,
    updateReservation,
    deleteReservation,

}
    = require('../controllers/screenings')

router.route("/").get(getAllScreenings).post(createScreening)
router.route("/:id").get(getScreening).patch(updateScreening).delete(deleteScreening)
router.route("/:id/reservations").get(getAllReservations).post(createReservation)
router.route("/:id/reservations/:reservationID").get(getReservation).patch(updateReservation).delete(deleteReservation)


module.exports = router

