const fs = require('fs');
const express = require('express');
const request = require('request');

const app = express();
const PORT = 8080;

const findAll = (subs, str) => {
	let prev = 0
	let indexes = []

	while (true) {
		let r = str.indexOf(subs)
		if (r === -1) {
			return indexes
		}

		indexes.push(r + prev)
		prev = r + prev + 1
		str = str.slice(r + 1)
	}
}

app.get('/query', (req, res) => {
	let sub = req.query.sub;
	let url = req.query.url;

	if (sub == undefined || url === undefined) {
		res.setHeader('Content-Type', 'application/json');
		res.status(400);
		res.send('Params required');
	}

	request(url, (err, response, html) => {
		if (!err) {
			let occurences = [];
			occurences = findAll(sub, html);
			if (occurences.length !== 0) {
				let arr = {};
				occurences.map((occ, i) => {
					arr[i] = "... " + html.substring(occ - sub.length, occ + (2 * sub.length)) + " ...";
					console.log("... " + html.substring(occ - sub.length, occ + (2 * sub.length)) + " ...");
				})
				res.setHeader('Content-Type', 'application/json');
				res.status(200);
				res.send(JSON.stringify(arr));
			} else
				console.log("No substring found");
		}
	});
});

app.listen(PORT);
console.log('http://localhost:' + PORT + '/query?sub=jquery&url=https://paratise.development.tamismart.com/');