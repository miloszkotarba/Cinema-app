const notFound = (req, res) => {
    res.status(404).json({ Status: 404, Error: "Not Found" })
}

module.exports = notFound