const { format, startOfDay, endOfDay, addMinutes } = require('date-fns')

const { CustomApiError, createCustomError } = require('../errors/custom-error')
const Screening = require('../models/Screening')
const Movie = require('../models/Movie')
const Room = require('../models/Room')
const Ticket = require('../models/Ticket')
const { buildPDF } = require('../pdf/invoiceTemplate')
const sendEmail = require('../mailer/sendEmail')
require('dotenv').config()

const getAllScreenings = async (req, res) => {
    const { date, movie } = req.query
    const queryObject = {}

    if (date) {
        // Zmiana formatu daty z "31-12-2024" na "2024-12-31"
        const [day, month, year] = date.split('-');
        const isoFormatDate = `${year}-${month}-${day}`;

        const startOfDayDate = startOfDay(new Date(isoFormatDate));
        const endOfDayDate = endOfDay(new Date(isoFormatDate));

        queryObject.date = { $gte: startOfDayDate, $lt: endOfDayDate };
    }

    if (movie) {
        if (!queryObject.movie) {
            queryObject.movie = {};
        }

        queryObject.movie._id = movie;
    }


    const screenings = await Screening.find(queryObject).populate('movie').populate('room').sort({
        date: 'asc',
        'movie._id': 'asc'
    })

    const formattedScreenings = screenings.map(screening => {
        return {
            _id: screening._id,
            advertisementsDuration: screening.advertisementsDuration,
            date: format(new Date(screening.date), 'yyyy-MM-dd HH:mm:ss'),
            movie: screening.movie,
            room: screening.room,
            reservations: screening.reservations,
        };
    });

    res.status(200).json({ total: screenings.length, screenings: formattedScreenings })
}

const getScreening = async (req, res, next) => {
    const { id: screeningID } = req.params
    const screening = await Screening.findOne({ _id: screeningID }).populate('movie').populate('room')

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    const formattedScreening = {
        _id: screening._id,
        advertisementsDuration: screening.advertisementsDuration,
        date: format(new Date(screening.date), 'yyyy-MM-dd HH:mm:ss'),
        movie: screening.movie,
        room: screening.room,
        reservations: screening.reservations,
    };

    res.status(200).json(formattedScreening)
}

const createScreening = async (req, res, next) => {
    const { movie, room, date, advertisementsDuration } = req.body

    const { _id: movieID } = movie
    const movieExists = await Movie.findOne({ _id: movieID })

    if (!movieExists) {
        return next(createCustomError(`No movie with ID: ${movieID}`, 409))
    }

    const { duration: movieDuration } = movieExists

    const { _id: roomID } = room
    const roomExists = await Room.exists({ _id: roomID })

    if (!roomExists) {
        return next(createCustomError(`No room with ID: ${roomID}`, 409))
    }

    const existingScreenings = await Screening.find({
        room: roomID,
    }).populate('movie')

    const isOverlap = existingScreenings.some(screening => {
        const screeningStartTime = new Date(screening.date);
        const screeningEndTime = addMinutes(new Date(screening.date), screening.movie.duration + screening.advertisementsDuration);
        const newScreeningStartTime = new Date(date);
        const newScreeningEndTime = addMinutes(newScreeningStartTime, movieDuration + advertisementsDuration);

        return screeningStartTime < newScreeningEndTime && newScreeningStartTime < screeningEndTime;
    })

    if (isOverlap) {
        return next(createCustomError(`Room is not available at the specified time.`, 409));
    }

    const screening = await Screening.create(req.body)
    res.status(201).json(screening)
}

const updateScreening = async (req, res, next) => {
    const { id: screeningID } = req.params
    const { movie, room, date, advertisementsDuration } = req.body

    const { _id: movieID } = movie
    const movieExists = await Movie.findOne({ _id: movieID })

    if (!movieExists) {
        return next(createCustomError(`No movie with ID: ${movieID}`, 409))
    }

    const { duration: movieDuration } = movieExists

    const { _id: roomID } = room
    const roomExists = await Room.exists({ _id: roomID })

    if (!roomExists) {
        return next(createCustomError(`No room with ID: ${roomID}`, 409))
    }

    const existingScreenings = await Screening.find({
        room: roomID,
        _id: { $ne: screeningID }
    }).populate('movie')

    const isOverlap = existingScreenings.some(screening => {
        const screeningStartTime = new Date(screening.date);
        const screeningEndTime = addMinutes(new Date(screening.date), screening.movie.duration + screening.advertisementsDuration);
        const newScreeningStartTime = new Date(date);
        const newScreeningEndTime = addMinutes(newScreeningStartTime, movieDuration + advertisementsDuration);

        return screeningStartTime < newScreeningEndTime && newScreeningStartTime < screeningEndTime;
    })

    if (isOverlap) {
        return next(createCustomError(`Room is not available at the specified time.`, 409));
    }

    const screeningNewObject = await Screening.findOneAndUpdate({ _id: screeningID }, req.body, {
        new: true,
        runValidators: true
    })

    if (!screeningNewObject) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    res.status(200).json(screeningNewObject)
}

const deleteScreening = async (req, res, next) => {
    const { id: screeningID } = req.params

    const screening = await Screening.findOneAndDelete({ _id: screeningID })

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    res.status(200).json(screening)
}

const getAllReservations = async (req, res, next) => {
    const { id: screeningID } = req.params

    const screening = await Screening.findOne({ _id: screeningID })

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    const { reservations } = screening

    res.status(200).json({ total: reservations.length, reservations })
}

const getReservation = async (req, res, next) => {
    const { id: screeningID, reservationID } = req.params

    const screening = await Screening.findOne({ _id: screeningID })

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    const reservation = screening.reservations.find(reservation => String(reservation._id) === reservationID)

    if (!reservation) {
        return next(createCustomError(`No reservation with ID: ${reservationID}`, 404))
    }

    res.status(200).json(reservation)
}

const createReservation = async (req, res, next) => {
    const { id: screeningID } = req.params

    const screening = await Screening.findOne({ _id: screeningID }).populate('room').populate('movie')

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    const { room, reservations } = screening

    const bookedSeatNumbers = [...new Set(reservations.flatMap(reservation => reservation.seats.map(seat => seat.seatNumber)))].sort()

    const { numberOfSeats } = room

    const newReservation = {
        seats: req.body.seats,
        client: req.body.client,
    };

    for (const seat of newReservation.seats) {
        const seatNumber = seat.seatNumber;

        if (seatNumber < 1 || seatNumber > numberOfSeats) {
            return next(createCustomError(`Seat number ${seatNumber} is not valid. It should be in the range of 1 to ${numberOfSeats}.`, 400));
        }

        if (bookedSeatNumbers.includes(seatNumber)) {
            return next(createCustomError(`Seat number ${seatNumber} is already booked.`, 400));
        }
    }

    const updatedScreening = await Screening.findOneAndUpdate(
        { _id: screeningID },
        { $push: { reservations: newReservation } },
        { runValidators: true, upsert: true, new: true }
    );

    if (!updatedScreening) {
        return next(createCustomError(`Failed to update screening with ID: ${screeningID}`, 500));
    }

    const addedReservation = updatedScreening.reservations[updatedScreening.reservations.length - 1];
    const addedReservationId = addedReservation._id;

    const ticket = await Ticket.find({})

    function convertSeatsToItems(seats) {
        const seatTypes = {};
        seats.forEach(seat => {
            if (!seatTypes[seat.typeOfSeat]) {
                seatTypes[seat.typeOfSeat] = [];
            }
            seatTypes[seat.typeOfSeat].push(seat.seatNumber);
        });

        const ticketPrices = {};
        ticket.forEach(t => {
            ticketPrices[t.name] = t.price * 100;
        });

        const items = [];
        Object.entries(seatTypes).forEach(([seatType, seatNumbers]) => {
            items.push({
                item: `Bilet ${seatType}`,
                description: seatType === 'ulgowy' ? 'Dla osób uprawnionych do ulgi' : '',
                quantity: seatNumbers.length,
                amount: seatType === 'ulgowy' ? ticketPrices['ulgowy'] : ticketPrices['normalny']
            });
        });

        return items;
    }

    function generateRandomNumber() {
        // Generate a random number between 0 and 9999999999
        const randomNumber = Math.floor(Math.random() * 10000000000);

        // Convert the number to a string and pad it with leading zeros if necessary
        return randomNumber.toString().padStart(10, '0');
    }

    const invoice = {
        reservation: {
            id: generateRandomNumber()
        },
        client: {
            name: `${newReservation.client.lastName} ${newReservation.client.firstName}`,
            email: newReservation.client.email
        },
        items: convertSeatsToItems(newReservation.seats),
        screening: {
            movie: screening.movie.title,
            date: screening.date,
            duration: screening.movie.duration + screening.advertisementsDuration,
            advertisementsDuration: screening.advertisementsDuration,
            room: screening.room.name
        },
        seats: newReservation.seats
    }

    let pdfBuffer

    try {
        pdfBuffer = await new Promise((resolve, reject) => {
            const chunks = []
            buildPDF(
                (chunk) => chunks.push(chunk),
                () => {
                    try {
                        const buffer = Buffer.concat(chunks);
                        resolve(buffer);
                    } catch (error) {
                        reject(error)
                    }
                },
                invoice
            )
        })
    } catch (error) {
        console.error(error)
        return next(createCustomError(error, 500))
    }

    try {
        const attachments = [
            {
                filename: 'invoice.pdf',
                content: pdfBuffer,
                encoding: 'base64',
            },
        ];

        await sendEmail({
            name: invoice.client.name,
            email: invoice.client.email
        }, "Potwierdzenie zakupu biletów", null, attachments, "<!doctype html>\n" +
            "<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\"\n" +
            "      xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n" +
            "\n" +
            "<head>\n" +
            "    <title>\n" +
            "\n" +
            "    </title>\n" +
            "    <!--[if !mso]>\n" +
            "    <-- -->\n" +
            "    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n" +
            "    <!--<![endif]-->\n" +
            "    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">\n" +
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
            "    <style type=\"text/css\">\n" +
            "        #outlook a {\n" +
            "            padding: 0;\n" +
            "        }\n" +
            "\n" +
            "        .movie {\n" +
            "            margin-top: 1.5rem;\n" +
            "            border: 1.2px solid #7F8FA4;\n" +
            "            border-radius: 5px;\n" +
            "            padding: 1rem;\n" +
            "        }\n" +
            "\n" +
            "        .movie span {\n" +
            "            margin-top: 0.5rem;\n" +
            "            display: block;\n" +
            "        }\n" +
            "\n" +
            "        .movie span:first-child {\n" +
            "            margin-top: 0;\n" +
            "        }\n" +
            "\n" +
            "        .ReadMsgBody {\n" +
            "            width: 100%;\n" +
            "        }\n" +
            "\n" +
            "        .ExternalClass {\n" +
            "            width: 100%;\n" +
            "        }\n" +
            "\n" +
            "        .ExternalClass * {\n" +
            "            line-height: 100%;\n" +
            "        }\n" +
            "\n" +
            "        body {\n" +
            "            margin: 0;\n" +
            "            padding: 0;\n" +
            "            -webkit-text-size-adjust: 100%;\n" +
            "            -ms-text-size-adjust: 100%;\n" +
            "        }\n" +
            "\n" +
            "        table,\n" +
            "        td {\n" +
            "            border-collapse: collapse;\n" +
            "            mso-table-lspace: 0pt;\n" +
            "            mso-table-rspace: 0pt;\n" +
            "        }\n" +
            "\n" +
            "        img, svg {\n" +
            "            border: 0;\n" +
            "            height: auto;\n" +
            "            line-height: 100%;\n" +
            "            outline: none;\n" +
            "            text-decoration: none;\n" +
            "            -ms-interpolation-mode: bicubic;\n" +
            "        }\n" +
            "\n" +
            "        p {\n" +
            "            display: block;\n" +
            "            margin: 13px 0;\n" +
            "        }\n" +
            "    </style>\n" +
            "    <!--[if !mso]><!-->\n" +
            "    <style type=\"text/css\">\n" +
            "        @media only screen and (max-width: 480px) {\n" +
            "            @-ms-viewport {\n" +
            "                width: 320px;\n" +
            "            }\n" +
            "            @viewport {\n" +
            "                width: 320px;\n" +
            "            }\n" +
            "        }\n" +
            "    </style>\n" +
            "    <!--<![endif]-->\n" +
            "    <!--[if mso]>\n" +
            "    <xml>\n" +
            "        <o:OfficeDocumentSettings>\n" +
            "            <o:AllowPNG/>\n" +
            "            <o:PixelsPerInch>96</o:PixelsPerInch>\n" +
            "        </o:OfficeDocumentSettings>\n" +
            "    </xml>\n" +
            "    <![endif]-->\n" +
            "    <!--[if lte mso 11]>\n" +
            "    <style type=\"text/css\">\n" +
            "        .outlook-group-fix {\n" +
            "            width: 100% !important;\n" +
            "        }\n" +
            "    </style>\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <style type=\"text/css\">\n" +
            "        @media only screen and (min-width: 480px) {\n" +
            "            .mj-column-per-100 {\n" +
            "                width: 100% !important;\n" +
            "            }\n" +
            "        }\n" +
            "    </style>\n" +
            "\n" +
            "\n" +
            "    <style type=\"text/css\">\n" +
            "    </style>\n" +
            "\n" +
            "</head>\n" +
            "\n" +
            "<body style=\"background-color:#f9f9f9;\">\n" +
            "\n" +
            "\n" +
            "<div style=\"background-color:#f9f9f9;\">\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    <table\n" +
            "            align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;\" width=\"600\"\n" +
            "    >\n" +
            "        <tr>\n" +
            "            <td style=\"line-height:0px;font-size:0px;mso-line-height-rule:exactly;\">\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <div style=\"background:#f9f9f9;background-color:#f9f9f9;Margin:0px auto;max-width:600px;\">\n" +
            "\n" +
            "        <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "               style=\"background:#f9f9f9;background-color:#f9f9f9;width:100%;\">\n" +
            "            <tbody>\n" +
            "            <tr>\n" +
            "                <td style=\"border-bottom:#333957 solid 5px;direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;\">\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    <table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n" +
            "\n" +
            "                        <tr>\n" +
            "\n" +
            "                        </tr>\n" +
            "\n" +
            "                    </table>\n" +
            "                    <![endif]-->\n" +
            "                </td>\n" +
            "            </tr>\n" +
            "            </tbody>\n" +
            "        </table>\n" +
            "\n" +
            "    </div>\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    </td>\n" +
            "    </tr>\n" +
            "    </table>\n" +
            "\n" +
            "    <table\n" +
            "            align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;\" width=\"600\"\n" +
            "    >\n" +
            "        <tr>\n" +
            "            <td style=\"line-height:0px;font-size:0px;mso-line-height-rule:exactly;\">\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <div style=\"background:#fff;background-color:#fff;Margin:0px auto;max-width:600px;\">\n" +
            "\n" +
            "        <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "               style=\"background:#fff;background-color:#fff;width:100%;\">\n" +
            "            <tbody>\n" +
            "            <tr>\n" +
            "                <td style=\"border:#dddddd solid 1px;border-top:0px;direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;\">\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    <table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n" +
            "\n" +
            "                        <tr>\n" +
            "\n" +
            "                            <td\n" +
            "                                    style=\"vertical-align:bottom;width:600px;\"\n" +
            "                            >\n" +
            "                    <![endif]-->\n" +
            "\n" +
            "                    <div class=\"mj-column-per-100 outlook-group-fix\"\n" +
            "                         style=\"font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:bottom;width:100%;\">\n" +
            "\n" +
            "                        <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "                               style=\"vertical-align:bottom;\" width=\"100%\">\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\" style=\"font-size:0px;padding:10px 25px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "                                           style=\"border-collapse:collapse;border-spacing:0px;\">\n" +
            "                                        <tbody>\n" +
            "                                        <tr>\n" +
            "                                            <td style=\"width:64px;\">\n" +
            "\n" +
            "                                                <svg style=\"border:0;display:block;outline:none;text-decoration:none;width:100%;\"\n" +
            "                                                     enable-background=\"new 0 0 91 91\" height=\"auto\" id=\"Layer_1\"\n" +
            "                                                     version=\"1.1\" viewBox=\"0 0 91 91\" width=\"91px\" xml:space=\"preserve\"\n" +
            "                                                     xmlns=\"http://www.w3.org/2000/svg\"\n" +
            "                                                     xmlns:xlink=\"http://www.w3.org/1999/xlink\"><g><path d=\"M2.776,82.355c9.909,0.493,19.864,0.474,29.785,0.675c4.745,0.096,9.491,0.192,14.236,0.289   c4.266,0.088,8.71,0.533,12.947-0.112c5.219-0.794,7.587-4.099,8.733-8.277c5.639,2.646,11.217,5.551,16.513,8.796   c2.229,1.366,4.858-0.429,4.974-2.854c0.6-12.705,1.109-25.559,0.538-38.273c-0.119-2.633-2.789-4.175-5.129-2.943   c-4.98,2.626-10.757,4.983-15.659,8.17C69.66,46.556,69.6,45.282,69.527,44c-0.083-1.503-1.197-2.745-2.762-2.763   c-1.384-0.015-2.768-0.044-4.151-0.063c6.359-3.657,10.901-10.495,10.446-18.095c-0.318-5.311-3.085-10.052-7.46-13.059   C60.25,6.346,53.666,6.367,47.451,6.877c-3.608,0.297-4.903,3.281-4.257,5.765c-4.441,2.589-8.013,6.445-9.174,11.454   c-0.71-3.47-2.85-6.56-5.808-8.536c-4.253-2.841-9.419-2.818-14.321-2.421c-2.886,0.233-3.913,2.631-3.378,4.613   c-4.341,2.521-7.654,6.531-7.629,11.875c0.022,4.417,2.598,8.021,6.14,10.307c-1.642,0.024-3.28,0.068-4.91,0.159   C0.094,40.318,0,45.797,3.699,46.475C2.823,57.563,1.154,68.648,0.141,79.721C0.007,81.189,1.46,82.289,2.776,82.355z    M62.79,75.273c-1.683,3.313-6.137,2.772-9.281,2.717c-15.992-0.289-32.028-0.98-48.026-0.914   C5.749,66.959,5.75,56.777,6.235,46.671c9.681,0.56,19.595-0.043,29.273-0.036c9.551,0.007,19.103,0.03,28.654,0.112   c0.373,6.491,0.7,12.979,0.045,19.471C63.918,69.068,64.117,72.656,62.79,75.273z M83.681,47.916   c0.01,9.057,0.073,18.098-0.146,27.154c-4.364-2.729-13.597-8.698-13.898-8.805c0.276-4.265,0.338-8.479,0.262-12.711   C72.776,52.668,81.92,48.717,83.681,47.916z M39.096,26.115c0.532-4.416,3.713-7.801,7.6-10.17c0.595,0.11,1.255,0.127,1.984,0.01   c6.434-1.03,16.544-1.124,17.253,7.675c0.579,7.199-5.986,13.501-12.848,14.088C46.634,38.268,38.208,33.489,39.096,26.115z    M33.868,30.115c0.858,4.525,3.912,8.25,7.859,10.693c-2.073-0.043-4.146-0.083-6.219-0.128c-3.112-0.068-6.25-0.2-9.396-0.336   C29.905,38.096,32.828,34.394,33.868,30.115z M7.201,28.596c0.342-3.598,2.951-6.334,6.114-8.242   c0.466,0.084,0.982,0.096,1.553,0.004c5.275-0.837,13.589-0.764,13.738,6.58c0.114,5.564-4.898,10.26-10.234,10.735   C13.316,38.124,6.65,34.391,7.201,28.596z\"></path></g></svg>\n" +
            "\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "                                        </tbody>\n" +
            "                                    </table>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\"\n" +
            "                                    style=\"font-size:0px;padding:10px 25px;padding-bottom:40px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:38px;font-weight:bold;line-height:1;text-align:center;color:#555;\">\n" +
            "                                        Dziękujemy za zamówienie!\n" +
            "                                    </div>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\"\n" +
            "                                    style=\"font-size:0px;padding:10px 25px;padding-bottom:40px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;line-height:1;text-align:center;color:#555;\">\n" +
            "                                        Bilety znajdziesz w załączniku. W celu zarządzania szczegółami rezerwacji kliknij przycisk poniżej.\n" +
            "                                    </div>\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\" style=\"font-size:0px;padding:10px 25px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "                                           style=\"border-collapse:collapse;border-spacing:0px;\">\n" +
            "                                        <tbody>\n" +
            "                                        <tr>\n" +
            "                                            <td style=\"width:128px;\">\n" +
            "\n" +
            "                                                <img height=\"auto\" src=\"https://vps.kotika.pl/~vue/successIMG.png\"\n" +
            "                                                     style=\"border:0;display:block;outline:none;text-decoration:none;width:300px;\"\n" +
            "                                                     width=\"328\"/>\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "                                        </tbody>\n" +
            "                                    </table>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\" style=\"font-size:0px;padding:10px 25px;padding-top:30px;padding-bottom:50px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <a href=\"" + process.env.VUE_PROJECT_URI + "rezerwacja/" + addedReservationId + "\" style=\"text-decoration: none; color: white\"><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse:separate;line-height:100%;\">\n" +
            "                                        <tr>\n" +
            "                                            <td align=\"center\" bgcolor=\"#2F67F6\" role=\"presentation\" style=\"border:none;border-radius:3px;color:#ffffff;padding:15px 35px; cursor: pointer\" valign=\"middle\">\n" +
            "                                                <p style=\"background:#2F67F6;color:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;font-size:17px;font-weight:normal;line-height:120%;Margin:0;text-decoration:none;text-transform:none; letter-spacing: 1.3px\">\n" +
            "                                                    ZARZĄDZAJ REZERWACJĄ\n" +
            "                                                </p>\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "                                    </table></a>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\"\n" +
            "                                    style=\"font-size:0px;padding:10px 25px;padding-bottom:40px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:20px;text-align:center;color:#7F8FA4;\">\n" +
            "                                        Ta wiadomość została wysłana automatycznie.\n" +
            "                                    </div>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                        </table>\n" +
            "\n" +
            "                    </div>\n" +
            "\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    </td>\n" +
            "\n" +
            "                    </tr>\n" +
            "\n" +
            "                    </table>\n" +
            "                    <![endif]-->\n" +
            "                </td>\n" +
            "            </tr>\n" +
            "            </tbody>\n" +
            "        </table>\n" +
            "\n" +
            "    </div>\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    </td>\n" +
            "    </tr>\n" +
            "    </table>\n" +
            "\n" +
            "    <table\n" +
            "            align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;\" width=\"600\"\n" +
            "    >\n" +
            "        <tr>\n" +
            "            <td style=\"line-height:0px;font-size:0px;mso-line-height-rule:exactly;\">\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <div style=\"Margin:0px auto;max-width:600px;\">\n" +
            "\n" +
            "        <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"width:100%;\">\n" +
            "            <tbody>\n" +
            "\n" +
            "            <tr>\n" +
            "                <td style=\"direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;\">\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    <table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n" +
            "\n" +
            "                        <tr>\n" +
            "\n" +
            "                            <td\n" +
            "                                    style=\"vertical-align:bottom;width:600px;\"\n" +
            "                            >\n" +
            "                    <![endif]-->\n" +
            "\n" +
            "                    <div class=\"mj-column-per-100 outlook-group-fix\"\n" +
            "                         style=\"font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:bottom;width:100%;\">\n" +
            "\n" +
            "                        <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\">\n" +
            "                            <tbody>\n" +
            "                            <tr>\n" +
            "                                <td style=\"vertical-align:bottom;padding:0;\">\n" +
            "\n" +
            "                                    <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\">\n" +
            "\n" +
            "                                        <tr>\n" +
            "                                            <td align=\"center\" style=\"font-size:0px;padding:0;word-break:break-word;\">\n" +
            "\n" +
            "                                                <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:300;line-height:1;text-align:center;color:#575757;\">\n" +
            "                                                    Kino Screenix Sp z.o.o <br><br>\n" +
            "                                                    Łódź 91-002, ul. Drewnowska 58\n" +
            "                                                </div>\n" +
            "\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "\n" +
            "                                        <tr>\n" +
            "                                            <td align=\"center\"\n" +
            "                                                style=\"font-size:0px;padding:10px;word-break:break-word;\">\n" +
            "\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "\n" +
            "                                    </table>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "                            </tbody>\n" +
            "                        </table>\n" +
            "\n" +
            "                    </div>\n" +
            "\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    </td>\n" +
            "\n" +
            "                    </tr>\n" +
            "\n" +
            "                    </table>\n" +
            "                    <![endif]-->\n" +
            "                </td>\n" +
            "            </tr>\n" +
            "            </tbody>\n" +
            "        </table>\n" +
            "\n" +
            "    </div>\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    </td>\n" +
            "    </tr>\n" +
            "    </table>\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "</div>\n" +
            "\n" +
            "</body>\n" +
            "\n" +
            "</html>");

    } catch (error) {
        console.error("Błąd wysyłania e-maila:", error);
        return next(createCustomError(error, 500))
    }

    res.status(201).json({ message: 'Reservation created successfully' });
}

const updateReservation = async (req, res, next) => {
    const { id: screeningID, reservationID } = req.params;
    console.log(req.body)

    const screening = await Screening.findOne({ _id: screeningID }).populate('room').populate('movie');

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404));
    }

    const reservationIndex = screening.reservations.findIndex(reservation => String(reservation._id) === reservationID);

    if (reservationIndex === -1) {
        return next(createCustomError(`No reservation with ID: ${reservationID}`, 404));
    }

    const { room, reservations } = screening;
    const tempSeatsNumbers = [...new Set(reservations.flatMap(reservation => reservation.seats.map(seat => seat.seatNumber)))].sort((a, b) => a - b);
    const reservedSeatNumbers = reservations[reservationIndex].seats.map(seat => seat.seatNumber);

    const bookedSeatNumbers = tempSeatsNumbers.filter(seatNumber => !reservedSeatNumbers.includes(seatNumber));

    const newReservationData = {
        seats: req.body.seats,
        client: req.body.client || reservations[reservationIndex].client,
    };

    const { numberOfSeats } = room;

    for (const seat of newReservationData.seats) {
        const seatNumber = seat.seatNumber;

        if (seatNumber < 1 || seatNumber > numberOfSeats) {
            return next(createCustomError(`Seat number ${seatNumber} is not valid. It should be in the range of 1 to ${numberOfSeats}.`, 400));
        }

        if (bookedSeatNumbers.includes(seatNumber)) {
            return next(createCustomError(`Seat number ${seatNumber} is already booked.`, 400));
        }
    }

    const existingReservationId = screening.reservations[reservationIndex]._id;

    await Screening.findOneAndUpdate(
        { _id: screeningID, 'reservations._id': existingReservationId },
        { $set: { 'reservations.$': { ...newReservationData, _id: existingReservationId } } }
    );

    const sortedSeatNumbers = newReservationData.seats
        .map(seat => seat.seatNumber)
        .sort((a, b) => a - b);

    const seatsString = sortedSeatNumbers.join(', ');

    function formatDateTime(date) {
        const formattedDate = new Date(date);

        const year = formattedDate.getFullYear();
        const month = ('0' + (formattedDate.getMonth() + 1)).slice(-2);
        const day = ('0' + formattedDate.getDate()).slice(-2);
        const hours = ('0' + formattedDate.getHours()).slice(-2);
        const minutes = ('0' + formattedDate.getMinutes()).slice(-2);

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    try {
        await sendEmail({
            name: `${reservations[reservationIndex].client.firstName} ${reservations[reservationIndex].client.lastName}`,
            email: reservations[reservationIndex].client.email
        }, "Modyfikacja miejsc na seansie", null, null, `<!doctype html>\n` +
            "<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\"\n" +
            "      xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n" +
            "\n" +
            "<head>\n" +
            "    <title>\n" +
            "\n" +
            "    </title>\n" +
            "    <!--[if !mso]><!-- -->\n" +
            "    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n" +
            "    <!--<![endif]-->\n" +
            "    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">\n" +
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
            "    <style type=\"text/css\">\n" +
            "        #outlook a {\n" +
            "            padding: 0;\n" +
            "        }\n" +
            "\n" +
            "        .movie {\n" +
            "            margin-top: 1.5rem;\n" +
            "            border: 1.2px solid #7F8FA4;\n" +
            "            border-radius: 5px;\n" +
            "            padding: 1rem;\n" +
            "        }\n" +
            "\n" +
            "        .movie span {\n" +
            "            margin-top: 0.5rem;\n" +
            "            display: block;\n" +
            "        }\n" +
            "\n" +
            "        .movie span:first-child {\n" +
            "            margin-top: 0;\n" +
            "        }\n" +
            "\n" +
            "        .ReadMsgBody {\n" +
            "            width: 100%;\n" +
            "        }\n" +
            "\n" +
            "        .ExternalClass {\n" +
            "            width: 100%;\n" +
            "        }\n" +
            "\n" +
            "        .ExternalClass * {\n" +
            "            line-height: 100%;\n" +
            "        }\n" +
            "\n" +
            "        body {\n" +
            "            margin: 0;\n" +
            "            padding: 0;\n" +
            "            -webkit-text-size-adjust: 100%;\n" +
            "            -ms-text-size-adjust: 100%;\n" +
            "        }\n" +
            "\n" +
            "        table,\n" +
            "        td {\n" +
            "            border-collapse: collapse;\n" +
            "            mso-table-lspace: 0pt;\n" +
            "            mso-table-rspace: 0pt;\n" +
            "        }\n" +
            "\n" +
            "        img, svg {\n" +
            "            border: 0;\n" +
            "            height: auto;\n" +
            "            line-height: 100%;\n" +
            "            outline: none;\n" +
            "            text-decoration: none;\n" +
            "            -ms-interpolation-mode: bicubic;\n" +
            "        }\n" +
            "\n" +
            "        p {\n" +
            "            display: block;\n" +
            "            margin: 13px 0;\n" +
            "        }\n" +
            "    </style>\n" +
            "    <!--[if !mso]><!-->\n" +
            "    <style type=\"text/css\">\n" +
            "        @media only screen and (max-width: 480px) {\n" +
            "            @-ms-viewport {\n" +
            "                width: 320px;\n" +
            "            }\n" +
            "            @viewport {\n" +
            "                width: 320px;\n" +
            "            }\n" +
            "        }\n" +
            "    </style>\n" +
            "    <!--<![endif]-->\n" +
            "    <!--[if mso]>\n" +
            "    <xml>\n" +
            "        <o:OfficeDocumentSettings>\n" +
            "            <o:AllowPNG/>\n" +
            "            <o:PixelsPerInch>96</o:PixelsPerInch>\n" +
            "        </o:OfficeDocumentSettings>\n" +
            "    </xml>\n" +
            "    <![endif]-->\n" +
            "    <!--[if lte mso 11]>\n" +
            "    <style type=\"text/css\">\n" +
            "        .outlook-group-fix {\n" +
            "            width: 100% !important;\n" +
            "        }\n" +
            "    </style>\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <style type=\"text/css\">\n" +
            "        @media only screen and (min-width: 480px) {\n" +
            "            .mj-column-per-100 {\n" +
            "                width: 100% !important;\n" +
            "            }\n" +
            "        }\n" +
            "    </style>\n" +
            "\n" +
            "\n" +
            "    <style type=\"text/css\">\n" +
            "    </style>\n" +
            "\n" +
            "</head>\n" +
            "\n" +
            "<body style=\"background-color:#f9f9f9;\">\n" +
            "\n" +
            "\n" +
            "<div style=\"background-color:#f9f9f9;\">\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    <table\n" +
            "            align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;\" width=\"600\"\n" +
            "    >\n" +
            "        <tr>\n" +
            "            <td style=\"line-height:0px;font-size:0px;mso-line-height-rule:exactly;\">\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <div style=\"background:#f9f9f9;background-color:#f9f9f9;Margin:0px auto;max-width:600px;\">\n" +
            "\n" +
            "        <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "               style=\"background:#f9f9f9;background-color:#f9f9f9;width:100%;\">\n" +
            "            <tbody>\n" +
            "            <tr>\n" +
            "                <td style=\"border-bottom:#333957 solid 5px;direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;\">\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    <table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n" +
            "\n" +
            "                        <tr>\n" +
            "\n" +
            "                        </tr>\n" +
            "\n" +
            "                    </table>\n" +
            "                    <![endif]-->\n" +
            "                </td>\n" +
            "            </tr>\n" +
            "            </tbody>\n" +
            "        </table>\n" +
            "\n" +
            "    </div>\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    </td>\n" +
            "    </tr>\n" +
            "    </table>\n" +
            "\n" +
            "    <table\n" +
            "            align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;\" width=\"600\"\n" +
            "    >\n" +
            "        <tr>\n" +
            "            <td style=\"line-height:0px;font-size:0px;mso-line-height-rule:exactly;\">\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <div style=\"background:#fff;background-color:#fff;Margin:0px auto;max-width:600px;\">\n" +
            "\n" +
            "        <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "               style=\"background:#fff;background-color:#fff;width:100%;\">\n" +
            "            <tbody>\n" +
            "            <tr>\n" +
            "                <td style=\"border:#dddddd solid 1px;border-top:0px;direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;\">\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    <table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n" +
            "\n" +
            "                        <tr>\n" +
            "\n" +
            "                            <td\n" +
            "                                    style=\"vertical-align:bottom;width:600px;\"\n" +
            "                            >\n" +
            "                    <![endif]-->\n" +
            "\n" +
            "                    <div class=\"mj-column-per-100 outlook-group-fix\"\n" +
            "                         style=\"font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:bottom;width:100%;\">\n" +
            "\n" +
            "                        <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "                               style=\"vertical-align:bottom;\" width=\"100%\">\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\" style=\"font-size:0px;padding:10px 25px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "                                           style=\"border-collapse:collapse;border-spacing:0px;\">\n" +
            "                                        <tbody>\n" +
            "                                        <tr>\n" +
            "                                            <td style=\"width:64px;\">\n" +
            "\n" +
            "                                                <svg style=\"border:0;display:block;outline:none;text-decoration:none;width:100%;\"\n" +
            "                                                     enable-background=\"new 0 0 91 91\" height=\"auto\" id=\"Layer_1\"\n" +
            "                                                     version=\"1.1\" viewBox=\"0 0 91 91\" width=\"91px\" xml:space=\"preserve\"\n" +
            "                                                     xmlns=\"http://www.w3.org/2000/svg\"\n" +
            "                                                     xmlns:xlink=\"http://www.w3.org/1999/xlink\"><g><path d=\"M2.776,82.355c9.909,0.493,19.864,0.474,29.785,0.675c4.745,0.096,9.491,0.192,14.236,0.289   c4.266,0.088,8.71,0.533,12.947-0.112c5.219-0.794,7.587-4.099,8.733-8.277c5.639,2.646,11.217,5.551,16.513,8.796   c2.229,1.366,4.858-0.429,4.974-2.854c0.6-12.705,1.109-25.559,0.538-38.273c-0.119-2.633-2.789-4.175-5.129-2.943   c-4.98,2.626-10.757,4.983-15.659,8.17C69.66,46.556,69.6,45.282,69.527,44c-0.083-1.503-1.197-2.745-2.762-2.763   c-1.384-0.015-2.768-0.044-4.151-0.063c6.359-3.657,10.901-10.495,10.446-18.095c-0.318-5.311-3.085-10.052-7.46-13.059   C60.25,6.346,53.666,6.367,47.451,6.877c-3.608,0.297-4.903,3.281-4.257,5.765c-4.441,2.589-8.013,6.445-9.174,11.454   c-0.71-3.47-2.85-6.56-5.808-8.536c-4.253-2.841-9.419-2.818-14.321-2.421c-2.886,0.233-3.913,2.631-3.378,4.613   c-4.341,2.521-7.654,6.531-7.629,11.875c0.022,4.417,2.598,8.021,6.14,10.307c-1.642,0.024-3.28,0.068-4.91,0.159   C0.094,40.318,0,45.797,3.699,46.475C2.823,57.563,1.154,68.648,0.141,79.721C0.007,81.189,1.46,82.289,2.776,82.355z    M62.79,75.273c-1.683,3.313-6.137,2.772-9.281,2.717c-15.992-0.289-32.028-0.98-48.026-0.914   C5.749,66.959,5.75,56.777,6.235,46.671c9.681,0.56,19.595-0.043,29.273-0.036c9.551,0.007,19.103,0.03,28.654,0.112   c0.373,6.491,0.7,12.979,0.045,19.471C63.918,69.068,64.117,72.656,62.79,75.273z M83.681,47.916   c0.01,9.057,0.073,18.098-0.146,27.154c-4.364-2.729-13.597-8.698-13.898-8.805c0.276-4.265,0.338-8.479,0.262-12.711   C72.776,52.668,81.92,48.717,83.681,47.916z M39.096,26.115c0.532-4.416,3.713-7.801,7.6-10.17c0.595,0.11,1.255,0.127,1.984,0.01   c6.434-1.03,16.544-1.124,17.253,7.675c0.579,7.199-5.986,13.501-12.848,14.088C46.634,38.268,38.208,33.489,39.096,26.115z    M33.868,30.115c0.858,4.525,3.912,8.25,7.859,10.693c-2.073-0.043-4.146-0.083-6.219-0.128c-3.112-0.068-6.25-0.2-9.396-0.336   C29.905,38.096,32.828,34.394,33.868,30.115z M7.201,28.596c0.342-3.598,2.951-6.334,6.114-8.242   c0.466,0.084,0.982,0.096,1.553,0.004c5.275-0.837,13.589-0.764,13.738,6.58c0.114,5.564-4.898,10.26-10.234,10.735   C13.316,38.124,6.65,34.391,7.201,28.596z\"></path></g></svg>\n" +
            "\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "                                        </tbody>\n" +
            "                                    </table>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\"\n" +
            "                                    style=\"font-size:0px;padding:10px 25px;padding-bottom:40px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:38px;font-weight:bold;line-height:1;text-align:center;color:#555;\">\n" +
            "                                        Sukces!\n" +
            "                                    </div>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\"\n" +
            "                                    style=\"font-size:0px;padding:10px 25px;padding-bottom:40px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;line-height:1;text-align:center;color:#555;\">\n" +
            "                                        Zaktualizowaliśmy miejsca, które zajmiesz na seansie.\n" +
            "                                    </div>\n" +
            "                                    <div class=\"movie\"\n" +
            "                                         style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;line-height:1;text-align:center;color:#555;\">\n" +
            "                                        <span><b>Film:</b> " + screening.movie.title + "</span>\n" +
            "                                        <span><b>Data:</b> " + formatDateTime(screening.date) + "</span>\n" +
            "                                        <span><b>Miejsca:</b> " + seatsString + "</span>\n" +
            "                                    </div>\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\" style=\"font-size:0px;padding:10px 25px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "                                           style=\"border-collapse:collapse;border-spacing:0px;\">\n" +
            "                                        <tbody>\n" +
            "                                        <tr>\n" +
            "                                            <td style=\"width:128px;\">\n" +
            "\n" +
            "                                                <img height=\"auto\" src=\"https://vps.kotika.pl/~vue/successIMG.png\"\n" +
            "                                                     style=\"border:0;display:block;outline:none;text-decoration:none;width:400px;\"\n" +
            "                                                     width=\"328\"/>\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "                                        </tbody>\n" +
            "                                    </table>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\"\n" +
            "                                    style=\"font-size:0px;padding:10px 25px;padding-bottom:40px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:20px;text-align:center;color:#7F8FA4;\">\n" +
            "                                        Ta wiadomość została wysłana automatycznie.\n" +
            "                                    </div>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                        </table>\n" +
            "\n" +
            "                    </div>\n" +
            "\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    </td>\n" +
            "\n" +
            "                    </tr>\n" +
            "\n" +
            "                    </table>\n" +
            "                    <![endif]-->\n" +
            "                </td>\n" +
            "            </tr>\n" +
            "            </tbody>\n" +
            "        </table>\n" +
            "\n" +
            "    </div>\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    </td>\n" +
            "    </tr>\n" +
            "    </table>\n" +
            "\n" +
            "    <table\n" +
            "            align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;\" width=\"600\"\n" +
            "    >\n" +
            "        <tr>\n" +
            "            <td style=\"line-height:0px;font-size:0px;mso-line-height-rule:exactly;\">\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <div style=\"Margin:0px auto;max-width:600px;\">\n" +
            "\n" +
            "        <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"width:100%;\">\n" +
            "            <tbody>\n" +
            "            <tr>\n" +
            "                <td style=\"direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;\">\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    <table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n" +
            "\n" +
            "                        <tr>\n" +
            "\n" +
            "                            <td\n" +
            "                                    style=\"vertical-align:bottom;width:600px;\"\n" +
            "                            >\n" +
            "                    <![endif]-->\n" +
            "\n" +
            "                    <div class=\"mj-column-per-100 outlook-group-fix\"\n" +
            "                         style=\"font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:bottom;width:100%;\">\n" +
            "\n" +
            "                        <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\">\n" +
            "                            <tbody>\n" +
            "                            <tr>\n" +
            "                                <td style=\"vertical-align:bottom;padding:0;\">\n" +
            "\n" +
            "                                    <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\">\n" +
            "\n" +
            "                                        <tr>\n" +
            "                                            <td align=\"center\" style=\"font-size:0px;padding:0;word-break:break-word;\">\n" +
            "\n" +
            "                                                <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:300;line-height:1;text-align:center;color:#575757;\">\n" +
            "                                                    Kino Screenix Sp z.o.o <br><br>\n" +
            "                                                    Łódź 91-002, ul. Drewnowska 58\n" +
            "                                                </div>\n" +
            "\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "\n" +
            "                                        <tr>\n" +
            "                                            <td align=\"center\"\n" +
            "                                                style=\"font-size:0px;padding:10px;word-break:break-word;\">\n" +
            "\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "\n" +
            "                                    </table>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "                            </tbody>\n" +
            "                        </table>\n" +
            "\n" +
            "                    </div>\n" +
            "\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    </td>\n" +
            "\n" +
            "                    </tr>\n" +
            "\n" +
            "                    </table>\n" +
            "                    <![endif]-->\n" +
            "                </td>\n" +
            "            </tr>\n" +
            "            </tbody>\n" +
            "        </table>\n" +
            "\n" +
            "    </div>\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    </td>\n" +
            "    </tr>\n" +
            "    </table>\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "</div>\n" +
            "\n" +
            "</body>\n" +
            "\n" +
            `</html>`);

    } catch (error) {
        console.error("Błąd wysyłania e-maila:", error);
        return next(createCustomError(error, 500))
    }

    res.status(200).json({ message: 'Reservation updated successfully' });
};


const deleteReservation = async (req, res, next) => {
    const { id: screeningID, reservationID } = req.params

    const screening = await Screening.findOne({ _id: screeningID })

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    const reservationIndex = screening.reservations.findIndex(reservation => String(reservation._id) === reservationID)

    if (reservationIndex === -1) {
        return next(createCustomError(`No reservation with ID: ${reservationID}`, 404))
    }

    try {
        await sendEmail({
            name: `${screening.reservations[reservationIndex].client.firstName} ${screening.reservations[reservationIndex].client.lastName}`,
            email: screening.reservations[reservationIndex].client.email
        }, "Twoje zamówienie zostało anulowane.", null, null, `<!doctype html>\n` +
            "<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\"\n" +
            "      xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n" +
            "\n" +
            "<head>\n" +
            "    <title>\n" +
            "\n" +
            "    </title>\n" +
            "    <!--[if !mso]>\n" +
            "    <-- -->\n" +
            "    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n" +
            "    <!--<![endif]-->\n" +
            "    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">\n" +
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
            "    <style type=\"text/css\">\n" +
            "        #outlook a {\n" +
            "            padding: 0;\n" +
            "        }\n" +
            "\n" +
            "        .movie {\n" +
            "            margin-top: 1.5rem;\n" +
            "            border: 1.2px solid #7F8FA4;\n" +
            "            border-radius: 5px;\n" +
            "            padding: 1rem;\n" +
            "        }\n" +
            "\n" +
            "        .movie span {\n" +
            "            margin-top: 0.5rem;\n" +
            "            display: block;\n" +
            "        }\n" +
            "\n" +
            "        .movie span:first-child {\n" +
            "            margin-top: 0;\n" +
            "        }\n" +
            "\n" +
            "        .ReadMsgBody {\n" +
            "            width: 100%;\n" +
            "        }\n" +
            "\n" +
            "        .ExternalClass {\n" +
            "            width: 100%;\n" +
            "        }\n" +
            "\n" +
            "        .ExternalClass * {\n" +
            "            line-height: 100%;\n" +
            "        }\n" +
            "\n" +
            "        body {\n" +
            "            margin: 0;\n" +
            "            padding: 0;\n" +
            "            -webkit-text-size-adjust: 100%;\n" +
            "            -ms-text-size-adjust: 100%;\n" +
            "        }\n" +
            "\n" +
            "        table,\n" +
            "        td {\n" +
            "            border-collapse: collapse;\n" +
            "            mso-table-lspace: 0pt;\n" +
            "            mso-table-rspace: 0pt;\n" +
            "        }\n" +
            "\n" +
            "        img, svg {\n" +
            "            border: 0;\n" +
            "            height: auto;\n" +
            "            line-height: 100%;\n" +
            "            outline: none;\n" +
            "            text-decoration: none;\n" +
            "            -ms-interpolation-mode: bicubic;\n" +
            "        }\n" +
            "\n" +
            "        p {\n" +
            "            display: block;\n" +
            "            margin: 13px 0;\n" +
            "        }\n" +
            "    </style>\n" +
            "    <!--[if !mso]><!-->\n" +
            "    <style type=\"text/css\">\n" +
            "        @media only screen and (max-width: 480px) {\n" +
            "            @-ms-viewport {\n" +
            "                width: 320px;\n" +
            "            }\n" +
            "            @viewport {\n" +
            "                width: 320px;\n" +
            "            }\n" +
            "        }\n" +
            "    </style>\n" +
            "    <!--<![endif]-->\n" +
            "    <!--[if mso]>\n" +
            "    <xml>\n" +
            "        <o:OfficeDocumentSettings>\n" +
            "            <o:AllowPNG/>\n" +
            "            <o:PixelsPerInch>96</o:PixelsPerInch>\n" +
            "        </o:OfficeDocumentSettings>\n" +
            "    </xml>\n" +
            "    <![endif]-->\n" +
            "    <!--[if lte mso 11]>\n" +
            "    <style type=\"text/css\">\n" +
            "        .outlook-group-fix {\n" +
            "            width: 100% !important;\n" +
            "        }\n" +
            "    </style>\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <style type=\"text/css\">\n" +
            "        @media only screen and (min-width: 480px) {\n" +
            "            .mj-column-per-100 {\n" +
            "                width: 100% !important;\n" +
            "            }\n" +
            "        }\n" +
            "    </style>\n" +
            "\n" +
            "\n" +
            "    <style type=\"text/css\">\n" +
            "    </style>\n" +
            "\n" +
            "</head>\n" +
            "\n" +
            "<body style=\"background-color:#f9f9f9;\">\n" +
            "\n" +
            "\n" +
            "<div style=\"background-color:#f9f9f9;\">\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    <table\n" +
            "            align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;\" width=\"600\"\n" +
            "    >\n" +
            "        <tr>\n" +
            "            <td style=\"line-height:0px;font-size:0px;mso-line-height-rule:exactly;\">\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <div style=\"background:#f9f9f9;background-color:#f9f9f9;Margin:0px auto;max-width:600px;\">\n" +
            "\n" +
            "        <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "               style=\"background:#f9f9f9;background-color:#f9f9f9;width:100%;\">\n" +
            "            <tbody>\n" +
            "            <tr>\n" +
            "                <td style=\"border-bottom:#333957 solid 5px;direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;\">\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    <table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n" +
            "\n" +
            "                        <tr>\n" +
            "\n" +
            "                        </tr>\n" +
            "\n" +
            "                    </table>\n" +
            "                    <![endif]-->\n" +
            "                </td>\n" +
            "            </tr>\n" +
            "            </tbody>\n" +
            "        </table>\n" +
            "\n" +
            "    </div>\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    </td>\n" +
            "    </tr>\n" +
            "    </table>\n" +
            "\n" +
            "    <table\n" +
            "            align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;\" width=\"600\"\n" +
            "    >\n" +
            "        <tr>\n" +
            "            <td style=\"line-height:0px;font-size:0px;mso-line-height-rule:exactly;\">\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <div style=\"background:#fff;background-color:#fff;Margin:0px auto;max-width:600px;\">\n" +
            "\n" +
            "        <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "               style=\"background:#fff;background-color:#fff;width:100%;\">\n" +
            "            <tbody>\n" +
            "            <tr>\n" +
            "                <td style=\"border:#dddddd solid 1px;border-top:0px;direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;\">\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    <table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n" +
            "\n" +
            "                        <tr>\n" +
            "\n" +
            "                            <td\n" +
            "                                    style=\"vertical-align:bottom;width:600px;\"\n" +
            "                            >\n" +
            "                    <![endif]-->\n" +
            "\n" +
            "                    <div class=\"mj-column-per-100 outlook-group-fix\"\n" +
            "                         style=\"font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:bottom;width:100%;\">\n" +
            "\n" +
            "                        <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "                               style=\"vertical-align:bottom;\" width=\"100%\">\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\" style=\"font-size:0px;padding:10px 25px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "                                           style=\"border-collapse:collapse;border-spacing:0px;\">\n" +
            "                                        <tbody>\n" +
            "                                        <tr>\n" +
            "                                            <td style=\"width:64px;\">\n" +
            "\n" +
            "                                                <svg style=\"border:0;display:block;outline:none;text-decoration:none;width:100%;\"\n" +
            "                                                     enable-background=\"new 0 0 91 91\" height=\"auto\" id=\"Layer_1\"\n" +
            "                                                     version=\"1.1\" viewBox=\"0 0 91 91\" width=\"91px\" xml:space=\"preserve\"\n" +
            "                                                     xmlns=\"http://www.w3.org/2000/svg\"\n" +
            "                                                     xmlns:xlink=\"http://www.w3.org/1999/xlink\"><g><path d=\"M2.776,82.355c9.909,0.493,19.864,0.474,29.785,0.675c4.745,0.096,9.491,0.192,14.236,0.289   c4.266,0.088,8.71,0.533,12.947-0.112c5.219-0.794,7.587-4.099,8.733-8.277c5.639,2.646,11.217,5.551,16.513,8.796   c2.229,1.366,4.858-0.429,4.974-2.854c0.6-12.705,1.109-25.559,0.538-38.273c-0.119-2.633-2.789-4.175-5.129-2.943   c-4.98,2.626-10.757,4.983-15.659,8.17C69.66,46.556,69.6,45.282,69.527,44c-0.083-1.503-1.197-2.745-2.762-2.763   c-1.384-0.015-2.768-0.044-4.151-0.063c6.359-3.657,10.901-10.495,10.446-18.095c-0.318-5.311-3.085-10.052-7.46-13.059   C60.25,6.346,53.666,6.367,47.451,6.877c-3.608,0.297-4.903,3.281-4.257,5.765c-4.441,2.589-8.013,6.445-9.174,11.454   c-0.71-3.47-2.85-6.56-5.808-8.536c-4.253-2.841-9.419-2.818-14.321-2.421c-2.886,0.233-3.913,2.631-3.378,4.613   c-4.341,2.521-7.654,6.531-7.629,11.875c0.022,4.417,2.598,8.021,6.14,10.307c-1.642,0.024-3.28,0.068-4.91,0.159   C0.094,40.318,0,45.797,3.699,46.475C2.823,57.563,1.154,68.648,0.141,79.721C0.007,81.189,1.46,82.289,2.776,82.355z    M62.79,75.273c-1.683,3.313-6.137,2.772-9.281,2.717c-15.992-0.289-32.028-0.98-48.026-0.914   C5.749,66.959,5.75,56.777,6.235,46.671c9.681,0.56,19.595-0.043,29.273-0.036c9.551,0.007,19.103,0.03,28.654,0.112   c0.373,6.491,0.7,12.979,0.045,19.471C63.918,69.068,64.117,72.656,62.79,75.273z M83.681,47.916   c0.01,9.057,0.073,18.098-0.146,27.154c-4.364-2.729-13.597-8.698-13.898-8.805c0.276-4.265,0.338-8.479,0.262-12.711   C72.776,52.668,81.92,48.717,83.681,47.916z M39.096,26.115c0.532-4.416,3.713-7.801,7.6-10.17c0.595,0.11,1.255,0.127,1.984,0.01   c6.434-1.03,16.544-1.124,17.253,7.675c0.579,7.199-5.986,13.501-12.848,14.088C46.634,38.268,38.208,33.489,39.096,26.115z    M33.868,30.115c0.858,4.525,3.912,8.25,7.859,10.693c-2.073-0.043-4.146-0.083-6.219-0.128c-3.112-0.068-6.25-0.2-9.396-0.336   C29.905,38.096,32.828,34.394,33.868,30.115z M7.201,28.596c0.342-3.598,2.951-6.334,6.114-8.242   c0.466,0.084,0.982,0.096,1.553,0.004c5.275-0.837,13.589-0.764,13.738,6.58c0.114,5.564-4.898,10.26-10.234,10.735   C13.316,38.124,6.65,34.391,7.201,28.596z\"></path></g></svg>\n" +
            "\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "                                        </tbody>\n" +
            "                                    </table>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\"\n" +
            "                                    style=\"font-size:0px;padding:10px 25px;padding-bottom:40px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:38px;font-weight:bold;line-height:1;text-align:center;color:#555;\">\n" +
            "                                        Anulowano zamówienie.\n" +
            "                                    </div>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\"\n" +
            "                                    style=\"font-size:0px;padding:10px 25px;padding-bottom:40px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;line-height:1;text-align:center;color:#555;\">\n" +
            "                                        Twoje zamówienie zostało anulowane. Zwrot kosztów zakupu biletów nastąpi w ciągu 48h.\n" +
            "\n" +
            "                                    </div>\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\" style=\"font-size:0px;padding:10px 25px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\"\n" +
            "                                           style=\"border-collapse:collapse;border-spacing:0px;\">\n" +
            "                                        <tbody>\n" +
            "                                        <tr>\n" +
            "                                            <td style=\"width:128px;\">\n" +
            "\n" +
            "                                                <img height=\"auto\" src=\"https://vps.kotika.pl/~vue/sweet-cinema.png\"\n" +
            "                                                     style=\"border:0;display:block;outline:none;text-decoration:none;width:230px;\"\n" +
            "                                                     width=\"328\"/>\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "                                        </tbody>\n" +
            "                                    </table>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                            <tr>\n" +
            "                                <td align=\"center\"\n" +
            "                                    style=\"font-size:0px;padding:10px 25px;padding-bottom:40px;word-break:break-word;\">\n" +
            "\n" +
            "                                    <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:20px;text-align:center;color:#7F8FA4;\">\n" +
            "                                        Ta wiadomość została wysłana automatycznie.\n" +
            "                                    </div>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "\n" +
            "                        </table>\n" +
            "\n" +
            "                    </div>\n" +
            "\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    </td>\n" +
            "\n" +
            "                    </tr>\n" +
            "\n" +
            "                    </table>\n" +
            "                    <![endif]-->\n" +
            "                </td>\n" +
            "            </tr>\n" +
            "            </tbody>\n" +
            "        </table>\n" +
            "\n" +
            "    </div>\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    </td>\n" +
            "    </tr>\n" +
            "    </table>\n" +
            "\n" +
            "    <table\n" +
            "            align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;\" width=\"600\"\n" +
            "    >\n" +
            "        <tr>\n" +
            "            <td style=\"line-height:0px;font-size:0px;mso-line-height-rule:exactly;\">\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "    <div style=\"Margin:0px auto;max-width:600px;\">\n" +
            "\n" +
            "        <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"width:100%;\">\n" +
            "            <tbody>\n" +
            "\n" +
            "            <tr>\n" +
            "                <td style=\"direction:ltr;font-size:0px;padding:20px 0;text-align:center;vertical-align:top;\">\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    <table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n" +
            "\n" +
            "                        <tr>\n" +
            "\n" +
            "                            <td\n" +
            "                                    style=\"vertical-align:bottom;width:600px;\"\n" +
            "                            >\n" +
            "                    <![endif]-->\n" +
            "\n" +
            "                    <div class=\"mj-column-per-100 outlook-group-fix\"\n" +
            "                         style=\"font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:bottom;width:100%;\">\n" +
            "\n" +
            "                        <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\">\n" +
            "                            <tbody>\n" +
            "                            <tr>\n" +
            "                                <td style=\"vertical-align:bottom;padding:0;\">\n" +
            "\n" +
            "                                    <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\">\n" +
            "\n" +
            "                                        <tr>\n" +
            "                                            <td align=\"center\" style=\"font-size:0px;padding:0;word-break:break-word;\">\n" +
            "\n" +
            "                                                <div style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:300;line-height:1;text-align:center;color:#575757;\">\n" +
            "                                                    Kino Screenix Sp z.o.o <br><br>\n" +
            "                                                    Łódź 91-002, ul. Drewnowska 58\n" +
            "                                                </div>\n" +
            "\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "\n" +
            "                                        <tr>\n" +
            "                                            <td align=\"center\"\n" +
            "                                                style=\"font-size:0px;padding:10px;word-break:break-word;\">\n" +
            "\n" +
            "                                            </td>\n" +
            "                                        </tr>\n" +
            "\n" +
            "                                    </table>\n" +
            "\n" +
            "                                </td>\n" +
            "                            </tr>\n" +
            "                            </tbody>\n" +
            "                        </table>\n" +
            "\n" +
            "                    </div>\n" +
            "\n" +
            "                    <!--[if mso | IE]>\n" +
            "                    </td>\n" +
            "\n" +
            "                    </tr>\n" +
            "\n" +
            "                    </table>\n" +
            "                    <![endif]-->\n" +
            "                </td>\n" +
            "            </tr>\n" +
            "            </tbody>\n" +
            "        </table>\n" +
            "\n" +
            "    </div>\n" +
            "\n" +
            "\n" +
            "    <!--[if mso | IE]>\n" +
            "    </td>\n" +
            "    </tr>\n" +
            "    </table>\n" +
            "    <![endif]-->\n" +
            "\n" +
            "\n" +
            "</div>\n" +
            "\n" +
            "</body>\n" +
            "\n" +
            `</html>`);

    } catch (error) {
        console.error("Błąd wysyłania e-maila:", error);
        return next(createCustomError(error, 500))
    }

    screening.reservations.splice(reservationIndex, 1);
    await screening.save()

    res.status(200).json({ message: 'Reservation deleted successfully' })
}

module.exports = {
    getAllScreenings,
    getScreening,
    updateScreening,
    deleteScreening,
    createScreening,
    getAllReservations,
    getReservation,
    createReservation,
    updateReservation,
    deleteReservation,
}