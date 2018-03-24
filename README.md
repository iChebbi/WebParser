# WebParser

## WebQuery
```bash
./app.js
curl http://localhost:8081/query?key=bootstrap
```
## WebScraper
```bash
./WebScraper --load filePath: to load WebSites into Database
./WebScraper --reset : to reset Database
./WebScraper --scrape | [fetchInterval (sec) ] : to start Scraper
./WebScraper --scrape | [--once]: to run scraper once
```
## Prerequisites
 - MongoDB
 - NodeJS