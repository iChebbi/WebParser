const mongo = require('mongodb').MongoClient;
const { mongoUri } = require('../config/db');

//Find all occurence of a substring in a string
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

//remove duplicate from an array
const removeDuplicate = (inArr) => {
	return inArr.filter((elem, pos, arr) => {
		return arr.indexOf(elem) == pos;
	});
}

//Query search string from cached websites source code in the databae
const queryWebsite = async (keyword, contentType) => {
	try {
		let client = await mongo.connect(mongoUri);
		const sites = client.db('webparser').collection('sites');

		let data = await sites.find({ '$text': { '$search': keyword } }).toArray(); //return all site including containing keyword (in html, css and js fields) using mongo built-in search features

		if (data.length === 0) {
			client.close();
			return { "msg": "No result found" };
		}

		//Return query result 
		let indexes = data.map((site, i) => {
			const content = site[`${contentType}`];
			let occurences = findAll(keyword, content);
			if (occurences.length !== 0) {
				const obj = {};
				obj[site.url] = removeDuplicate(occurences.map((occ, i) => {
					return "..." + content.substring(occ - 20, occ + (2 * 20)) + "...";
				}));
				return obj;
			};
		});
		client.close();
		return indexes[0] !== undefined ? indexes : { "msg": "No result found" };

	} catch (err) {
		console.log(err.stack);
	}
}
module.exports = { queryWebsite };