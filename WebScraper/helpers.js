const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const mongo = require('mongodb').MongoClient;
const { mongoUri } = require('../config/db');
const _cliProgress = require('cli-progress');
const { promisify } = require('util');
const rmdir = promisify(require('rimraf'));
const scraper = require('website-scraper');

//convert seconds to Week, days, hours, minutes and secondes
const compoundDuration = (labels, intSeconds) =>
	weekParts(intSeconds)
		.map((v, i) => [v, labels[i]])
		.reduce((a, x) =>
			a.concat(x[0] ? [`${x[0]} ${x[1] || '?'}`] : []), []
		)
		.join(', '),
	weekParts = intSeconds => [0, 7, 24, 60, 60]
		.reduceRight((a, x) => {
			let r = a.rem,
				mod = x !== 0 ? r % x : r;

			return {
				rem: (r - mod) / (x || 1),
				parts: [mod].concat(a.parts)
			};
		}, {
				rem: intSeconds,
				parts: []
			})
		.parts;


const formatSec = (sec) => compoundDuration(["week", "day", "h", "m", "s"], sec / 1000);

//Initialize database
const resetDB = async () => {
	try {
		let client = await mongo.connect(mongoUri);
		console.log("Connected to database");
		const sites = client.db('webparser').collection('sites');

		sites.drop((err, res) => {
			err ? console.log('No collection to drop') : console.log('Resetting Database');
		});

		// creates unique index in url field
		sites.createIndex({ url: 1, }, { unique: true }, (err, result) => {
			if (err) console.log(err);
			// console.log(result);
		});

		//create text index on content field
		sites.createIndex({ html: 'text', css: 'text', js: 'text' }, (err, result) => {
			if (err) console.log(err);
			// console.log(result);
		});
		client.close();
		return;
	} catch (err) {
		console.log(err.stack);
	}
}

//Load sample websites list into database
const loadWebsitesFromFile = async (file) => {
	try {
		let client = await mongo.connect(mongoUri);
		file = path.basename(`${file}`);
		console.log("Connected to database");
		const sites = client.db('webparser').collection('sites');

		let readStream = fs.createReadStream(file, 'utf-8');
		let data = '';
		readStream.on('data', (chunk) => {
			data += chunk;
		});

		// parse site from file
		let inSites = [];
		readStream.on('end', async () => {
			data = data.split('\n');
			data.forEach(url => {
				name = url.split(".")[0];
				(url.indexOf('http') === -1) && (url = 'http://' + url);
				inSites.push({
					"name": name,
					"url": url,
					"html": "",
					"css": "",
					"js": ""
				});
			});

			//insert site list to the database
			try {
				let res = await sites.insertMany(inSites, { ordered: false });
				console.log(`Lines inserted : ${res.insertedCount}`);
				client.close();
			} catch (err) {
				console.log("Duplicate will be ignored");
				client.close();
			}
		});
	} catch (err) {
		console.log(err.stack);
	}
}



//fetch only homepage sourcode for NOW
const fetchSourceCode = async (url) => {
	try {
		const options = {
			urls: [url],
			directory: `./cache`,
			defaultFilename: 'index.html',
			maxDepth: 1,
			ignoreErrors: true,
			sources: [
				{ selector: 'img', attr: 'href' },
				{ selector: 'link[rel="stylesheet"]', attr: 'href' },
				{ selector: 'script', attr: 'src' }
			],
			subdirectories: [
				{ directory: 'html', extensions: ['.html'] },
				{ directory: 'js', extensions: ['.js'] },
				{ directory: 'css', extensions: ['.css'] }
			]
		}

		if (fs.existsSync('cache')) {
			await rmdir('cache');
		}

		const result = await scraper(options);
		const readfile = promisify(fs.readFile);

		if (fs.existsSync('cache/html')) {
			const htmlFiles = fs.readdirSync('cache/html/');
			var htmlPromise = htmlFiles.reduce(async (html, file) => await html + await readfile(`cache/html/${file}`, 'utf-8'), '');
		}
		if (fs.existsSync('cache/css')) {
			const cssFiles = fs.readdirSync('cache/css/');
			var cssPromise = cssFiles.reduce(async (css, file) => await css + await readfile(`cache/css/${file}`, 'utf-8'), '');
		}

		if (fs.existsSync('cache/js')) {
			const jsFiles = fs.readdirSync('cache/js/');
			var jsPromise = jsFiles.reduce(async (js, file) => await js + await readfile(`cache/js/${file}`, 'utf-8'), '');
		}

		const [html, css, js] = await Promise.all([htmlPromise, cssPromise, jsPromise]);
		rmdir('cache');
		return {
			html: html,
			css: css,
			js: js
		}

	} catch (err) {
		console.log(err.stack);
	}
}

//update Websites Source Code in the Database
const updateWebCache = async () => {
	try {
		let client = await mongo.connect(mongoUri);
		console.log("Connected to database");
		const sites = client.db('webparser').collection('sites');
		let data = await sites.find({}).toArray();

		let batch = sites.initializeUnorderedBulkOp();
		let nCached = 0;
		const cacheProgress = new _cliProgress.Bar({
			format: 'progress [{bar}] {percentage} % | {value}/{total}'
		}, _cliProgress.Presets.shades_classic);
		console.log(`Started Caching`);
		cacheProgress.start(data.length, 0);

		let errors = [];
		data.map(async (site) => {
			try {
				const { html, css, js } = await fetchSourceCode(site.url);
				// console.log("\ncss : " + css);
				batch.find({ "url": site.url }).updateOne({ $set: { html, css, js } })
			} catch (err) {
				console.log(err);
				errors.push(site.url);
			} finally {
				nCached++;
				cacheProgress.update(nCached);
				if (nCached === data.length) {
					batch.execute((err, res) => {
						if (err) console.log(err);
						cacheProgress.stop();
						console.log(`\nCached ${res.nModified || 0} websites`);
						if (errors.length !== 0) {
							console.log('Errror caching : ');
							console.log(errors);
						}
						console.log("Finished Caching");
					});
					client.close();
				}
			}
		});
	} catch (err) {
		console.log(err.stack);
	}
}

// (async () => {
// 	console.log((await fetchSourceCode('https://publicwww.com/css/display/')).css);
// })();

module.exports = { resetDB, loadWebsitesFromFile, updateWebCache, formatSec }