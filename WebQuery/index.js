const express = require('express');
const router = express.Router();
const { queryWebsite } = require('./helpers');

router.get('/', async (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	let key = req.query.key;
	let con = req.query.con;

	if (key === undefined || con === undefined) {
		res.status(400);
		res.send({ "msg": "Keyword required" });
		return;
	}
	try {
		let queryRes = await queryWebsite(key,con);
		res.status(200);
		res.send(JSON.stringify(queryRes));
	} catch (err) {
		console.log(err.stack);
	}

});

module.exports = router;