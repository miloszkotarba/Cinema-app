const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    host: "mail.kino-screenix.pl",
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
})

module.exports = transporter