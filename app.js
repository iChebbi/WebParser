const express = require('express');
const scraper = require('website-scraper');
const { initDB, updateWebCache } = require('./webCache');

const app = express();
const PORT = process.env.SERVER_PORT || 8080;

app.get('/query', (req, res) => {

	res.setHeader('Content-Type', 'application/json');

	let sub = req.query.sub;
	let url = req.query.url;

	if (sub == undefined || url === undefined) {
		res.status(400);
		res.send('Params required');
		return;
	}

});

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

app.get('/init', async (req, res) => {
	try {
		let lines = await initDB('./shopifyWebsites.txt');
		console.log(lines);
		res.setHeader('Content-Type', 'application/json');
		res.status(200);
		res.send({ lines });
	} catch (err) {
		console.log(err.stack);
	}
});

app.listen(PORT);
console.log(`Started server: http://localhost:${PORT}`);