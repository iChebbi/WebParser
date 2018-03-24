#!/usr/bin/env nodejs

const { resetDB, loadWebsitesFromFile, updateWebCache, formatSec } = require('./WebScraper/helpers');

if (process.argv.length < 3) {
	console.log("run WebScraper --load filePath: to load WebSites into Database");
	console.log("run WebScraper --reset : to reset Database");
	console.log("run WebScraper --scrape | [fetchInterval (sec) ] : to start Scraper");
	console.log("run WebScraper --scrape | [--once]: to run scraper once");
	return;
}

if (process.argv[2] === '--reset') {
	resetDB();
} else if (process.argv[2] === '--load') {
	if (process.argv[3] !== undefined) {
		loadWebsitesFromFile(process.argv[3]);
		return;
	} else {
		console.log("run WebScraper --load filePath: to load WebSites into Database");
		return;
	}
} else if (process.argv[2] === '--scrape') {
	if (process.argv[3] === '--once') {
		console.log('runnig once');
		updateWebCache();
	} else {
		const fetchInterval = parseInt(process.argv[3]) * 1000 || 604800 * 1000; //1 Week default
		console.log(`Started scraper with ${formatSec(fetchInterval)} fetch interval`);
		updateWebCache();
		setInterval(updateWebCache, fetchInterval);
	}
}