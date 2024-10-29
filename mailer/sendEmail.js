const transporter = require('./createTransporter')

const sendEmail = async (recipient, subject, text, attachments, html) => {
    try {
        const to = `"${recipient.name}" ${recipient.email}`

        const info = await transporter.sendMail({
            from: '"Kino Screenix" info@kino-screenix.pl',
            to,
            subject,
            text,
            attachments,
            html
        })

        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        throw Error(error)
    }
};

module.exports = sendEmail;
