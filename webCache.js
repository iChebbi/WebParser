const fs = require('fs');
const fetch = require("node-fetch");
const mongo = require('mongodb').MongoClient;
require('dotenv').config()

const url = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.AUTH_DB}`;

//Initialize and load sample websites list into database
const initDB = async (file) => {
	try {
		let client = await mongo.connect(url);
		console.log("Connected to database");
		const sites = client.db('webparser').collection('sites');

		sites.drop((err, res) => {
			if (err) console.log(err);
			console.log('Resetting Database');
		});

		// creates unique index in url field
		sites.createIndex({ url: 1, }, { unique: true }, (err, result) => {
			if (err) console.log(err);
			// console.log(result);
		});

		//create text index on content field
		sites.createIndex({ content: 'text', }, (err, result) => {
			if (err) console.log(err);
			// console.log(result);
		});

		let readStream = fs.createReadStream(file, 'utf-8');
		let data;
		readStream.on('data', (chunk) => {
			data += chunk;
		});

		// parse site from file
		let inSites = [];
		readStream.on('end', async () => {
			data = data.split('\n');

			data.forEach(url => {
				name = url.split(".")[0];
				(url.indexOf('http://') === -1) && (url = 'http://' + url);

				inSites.push({
					"name": name,
					"url": url,
					"content": ""
				});
			});

			//insert site list to the database
			try {
				let res = await sites.insertMany(inSites, { ordered: false });
				console.log(`Lines inserted : ${res.insertedCount}`);
				return res.insertedCount;
				client.close();
			} catch (err) {
				console.log(err.stack);
			}
		});
	} catch (err) {
		console.log(err.stack);
	}
}

//fetch only homepage sourcode for NOW
const fetchSourceCode = async (url) => {
	try {
		return await (await fetch(url)).text();
	} catch (err) {
		console.log("Error caching " + site.url);
	}
}

//update Websites Source Code in the Database
const updateWebCache = async () => {
	try {
		let client = await mongo.connect(url);
		console.log("Connected to database");
		const sites = client.db('webparser').collection('sites');
		let data = await sites.find({}).toArray();

		let batch = sites.initializeUnorderedBulkOp();
		let nCached = 0;

		console.log(`Caching in progress`);
		data.map(async (site, n) => {
			try {
				let content = await fetchSourceCode(site.url);
				batch.find({ "url": site.url }).updateOne({ $set: { content } })
				console.log("Caching Website n° " + n);

			} catch (err) {
				console.log("Errror caching : " + site.url);
			} finally {
				nCached++;
				if (nCached === data.length) {
					batch.execute((err, res) => {
						if (err) console.log(err);
						console.log(`${res.nModified || 0} websites cached`);
					});
				}
				client.close();
			}
		});
	} catch (err) {
		console.log(err.stack);
	}
}

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
const queryWebsite = async (keyword) => {
	try {
		keyword = keyword || "fuck";
		let client = await mongo.connect(url);
		console.log("Connected to database");
		const sites = client.db('webparser').collection('sites');
		let data = await sites.find({ '$text': { '$search': keyword } }).toArray();

		let indexes = data.map((site, i) => {
			let occurences = findAll(keyword, site.content);
			if (occurences.length !== 0) {
				const obj = {};
				obj[site.name] = occurences.map((occ, i) => {
					return "..." + site.content.substring(occ - 20, occ + (2 * 20)) + "...";
				})
				return obj;
			}
		});
		client.close();
		console.log(indexes);
		return indexes;

	} catch (err) {
		console.log(err.stack);
	}
}

module.exports = { initDB, updateWebCache, queryWebsite, fetchSourceCode };

initDB('./shopifyWebsites.txt');