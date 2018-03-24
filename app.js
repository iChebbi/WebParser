#!/usr/bin/env nodejs

const express = require('express');
const WebQuery = require('./WebQuery/index');
const scraper = require('website-scraper');

const app = express();
const PORT = process.env.SERVER_PORT || 8080;

app.use('/query', WebQuery);

app.get('/scrape', (req, res) => {
	let options = {
		urls: ['https://publicwww.com/'],
		directory: `./scraped ${Math.random() * 100}`,
	}

	scraper(options).then((result) => {
		// res.setHeader('Content-Type', 'application/json');
		console.log(result[0].text);
		res.send(result);
	}).catch((err) => {
		res.send(err);
	});

});

app.listen(PORT);
console.log(`Started server: http://localhost:${PORT}`);