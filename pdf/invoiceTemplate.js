const PDFDocument = require('pdfkit')
const { format } = require('date-fns')

const buildPDF = (dataCallback, endCallback, objectData) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    doc.on('data', dataCallback)
    doc.on('end', endCallback)

    generateHeader(doc)
    generateCustomerInformation(doc, objectData)
    generateInvoiceTable(doc, objectData)
    generateScreeningInformation(doc, objectData)
    generateFooter(doc, objectData)

    doc.end()
}

function generateHeader(doc) {
    doc
        .image("pdf/logo.png", 50, 35, { width: 50 })
        .fillColor("#111")
        .fontSize(20)
        .text("Screenix", 130, 57)
        .fontSize(11)
        .font("fonts/Poppins.ttf")
        .text("Screenix sp. z o.o.", 200, 50, { align: "right" })
        .text("ul. Drewnowska 58", 200, 65, { align: "right" })
        .text("Łódź, 91-002", 200, 80, { align: "right" })
        .moveDown()
}

function generateCustomerInformation(doc, invoice) {
    doc.fillColor("#444444").fontSize(20).text("Faktura", 50, 165)

    generateHr(doc, 190)

    const customerInformationTop = 200

    doc
        .fontSize(11)
        .font("fonts/Poppins.ttf")
        .text("ID: ", 50, customerInformationTop)
        .text(invoice.reservation.id, 150, customerInformationTop)
        .text("Data:", 50, customerInformationTop + 45)
        .text(formatDate(new Date()), 150, customerInformationTop + 45)
        .text("Klient: ", 50, customerInformationTop + 15)
        .text("E-mail: ", 50, customerInformationTop + 30)
        .font("fonts/Poppins Bold.ttf")
        .text(invoice.client.name, 150, customerInformationTop + 15)
        .font("fonts/Poppins.ttf")
        .text(invoice.client.email, 150, customerInformationTop + 30)
        .moveDown()

    generateHr(doc, 272)
}

function generateScreeningInformation(doc, invoice) {
    doc.fillColor("#444444").fontSize(20).text("Informacje o seansie", 50, 490)

    generateHr(doc, 515)

    const customerInformationTop = 530

    const seats = [...new Set(invoice.seats.map(seat => seat.seatNumber))].sort((a, b) => a - b);
    let seatsString = ""
    seats.forEach(seat => {
        seatsString += `${seat}, `
    })
    seatsString = seatsString.slice(0, -2);

    doc
        .fontSize(11)
        .font('fonts/Poppins.ttf')
        .text("Film:", 50, customerInformationTop)
        .font('fonts/Poppins Bold.ttf')
        .text(invoice.screening.movie, 200, customerInformationTop)
        .font('fonts/Poppins.ttf')
        .text("Miejsca:", 50, customerInformationTop + 75)
        .text(seatsString, 200, customerInformationTop + 75)
        .text("Data:", 50, customerInformationTop + 15)
        .text("Czas rozpoczęcia:", 50, customerInformationTop + 30)
        .text(formatDateDay(invoice.screening.date), 200, customerInformationTop + 15)
        .text("Czas zakończenia:", 50, customerInformationTop + 45)
        .text(addMinutesToTime(invoice.screening.date, invoice.screening.duration), 200, customerInformationTop + 45)
        .text("Długość reklam:", 50, customerInformationTop + 60)
        .text(`${invoice.screening.advertisementsDuration} min`, 200, customerInformationTop + 60)
        .font('fonts/Poppins.ttf')
        .text(formatTime(invoice.screening.date), 200, customerInformationTop + 30)
        .text("Sala:", 50, customerInformationTop + 90)
        .font('fonts/Poppins.ttf')
        .text(invoice.screening.room, 200, customerInformationTop + 90)
        .font('fonts/Poppins.ttf')
        .moveDown()
}

function generateInvoiceTable(doc, invoice) {
    let i
    const invoiceTableTop = 330

    doc.font("Helvetica-Bold")
    generateTableRow(
        doc,
        invoiceTableTop,
        "Produkt",
        "Opis",
        "Cena jednostkowa",
        "Ile",
        "Razem"
    )
    generateHr(doc, invoiceTableTop + 20)
    doc.font("Helvetica")

    for (i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i]
        const position = invoiceTableTop + (i + 1) * 30
        generateTableRow(
            doc,
            position,
            item.item,
            item.description,
            formatCurrency(item.amount),
            item.quantity,
            formatCurrency(item.amount * item.quantity)
        )

        generateHr(doc, position + 20)
    }

    const totalPostion = invoiceTableTop + (i + 1) * 30 + 10

    doc.font("Helvetica-Bold")
    generateTableRow(
        doc,
        totalPostion,
        "",
        "",
        "",
        "Podsumowanie",
        formatCurrency(calculateTotalSum(invoice))
    )
    doc.font("Helvetica")
}

function generateFooter(doc) {
    doc
        .fontSize(12)
        .fill("#b30000")
        .text(
            "Niniejszy dokument to Twój bilet.",
            50,
            750,
            { align: "center", width: 500 }
        )
}

function generateTableRow(
    doc,
    y,
    item,
    description,
    unitCost,
    quantity,
    lineTotal
) {
    doc
        .fontSize(10)
        .text(item, 50, y)
        .text(description, 150, y)
        .text(unitCost, 280, y, { width: 90, align: "right" })
        .text(quantity, 370, y, { width: 90, align: "right" })
        .text(lineTotal, 0, y, { align: "right" })
}

function generateHr(doc, y) {
    doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke()
}

function formatCurrency(money) {
    return (money / 100).toFixed(2) + " PLN"
}

function formatDate(date) {
    let day = date.getDate()
    if (day < 10) day = '0' + day
    let month = date.getMonth() + 1
    if(month < 10) month = '0' + month
    const year = date.getFullYear()
    let hour = date.getHours()
    if(hour < 10) hour = '0'+ hour
    let minutes = date.getMinutes()
    if(minutes < 10) minutes = '0'+ minutes
    let seconds = date.getSeconds()
    if(seconds < 10) seconds = '0' + seconds

    return year + "-" + month + "-" + day + " " + hour + ":" + minutes + ":" + seconds
}

function formatDateDay(dataString) {
    const dateObject = new Date(dataString);

    const year = dateObject.getFullYear();
    let month = (dateObject.getMonth() + 1).toString().padStart(2, '0');
    let day = dateObject.getDate().toString().padStart(2, '0');

    return year + "-" + month + "-" + day
}

function addMinutesToTime(startTimeString, minutesToAdd) {
    const startTime = new Date(startTimeString);
    const endTime = new Date(startTime.getTime() + minutesToAdd * 60000);
    const formattedEndTime = endTime.getHours().toString().padStart(2, '0') + ":" + endTime.getMinutes().toString().padStart(2, '0');
    return formattedEndTime;
}

function formatTime(dataString) {
    const dateObject = new Date(dataString);

    return format(dateObject, 'HH:mm')
}

const calculateTotalSum = (invoice) => {
    let TotalSum = 0

    invoice.items.forEach(item => {
        TotalSum += item.quantity * item.amount
    })

    return TotalSum
}

module.exports = { buildPDF }

