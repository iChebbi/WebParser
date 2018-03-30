#!/usr/bin/env nodejs

const express = require('express');
const WebQuery = require('./WebQuery/index');


const app = express();
const PORT = process.env.SERVER_PORT || 8080;

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
	next();
})

app.use('/query', WebQuery);

app.listen(PORT);
console.log(`Started server: http://localhost:${PORT}`);