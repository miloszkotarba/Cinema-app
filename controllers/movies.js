require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs')

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const Movie = require('../models/Movie')
const generateTags = require('../gemini/generateTags')
const { createCustomError } = require('../errors/custom-error')

const getAllMovies = async (req, res) => {
    const movies = await Movie.find({}).sort({ title: 1 })
    res.status(200).json({ total: movies.length, movies })
}

const getMovie = async (req, res, next) => {
    const { id: movieID } = req.params;
    const movie = await Movie.findOne({ _id: movieID });

    if (!movie) {
        return next(createCustomError(`No movie with ID: ${movieID}`, 404));
    }

    try {
        let generatedTags = await generateTags(movie.title, movie.description);

        const tagsArr = [];
        tagsArr.push(...generatedTags.split(',').map(tag => tag.trim().replace(/\./g, ''))); // trim whitespace and remove dots

        const responseMovie = {
            ...movie.toObject(),
            tags: tagsArr
        };

        return res.status(200).json(responseMovie);
    } catch (error) {
        console.error("Error: ", error);
        return next(createCustomError(error, 500));
    }
}

const createMovie = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nie przesłano pliku obrazu' });
    }

    const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path);

    const movie = await Movie.create({
        ...req.body,
        posterUrl: secure_url,
        posterPublicId: public_id,
    });

    if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
    }

    res.status(201).json(movie);
};

const updateMovie = async (req, res, next) => {
    const { id: movieID } = req.params
    const movie = await Movie.findOneAndUpdate({ _id: movieID }, req.body, {
        new: true,
        runValidators: true
    })

    if (!movie) {
        return next(createCustomError(`No movie with ID: ${movieID}`, 404))
    }

    res.status(200).json(movie)
}

const deleteMovie = async (req, res, next) => {
    const { id: movieID } = req.params
    const movie = await Movie.findOneAndDelete({ _id: movieID })

    if (!movie) {
        return next(createCustomError(`No movie with ID: ${movieID}`, 404))
    }

    res.status(200).json(movie)
}

module.exports = { getAllMovies, getMovie, createMovie, updateMovie, deleteMovie }