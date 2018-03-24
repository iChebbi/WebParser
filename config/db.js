require('dotenv').config();

const mongoUri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.AUTH_DB}`;

module.exports = { mongoUri};