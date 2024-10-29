const { CustomApiError } = require('../errors/custom-error');

const errorHandlerMiddleware = async (err, req, res, next) => {
    console.log(err);

    if (err.name === 'ValidationError' && err.errors) {
        const errorMessage = `${err.name}: ${err.message}`;

        return res.status(400).json({ error: errorMessage });
    }

    if (err instanceof CustomApiError) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    return res
        .status(500)
        .json({ error: "Something went wrong, please try again" });
};

module.exports = errorHandlerMiddleware;