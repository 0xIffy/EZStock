const fs = require("fs");

let stocks = [];

let data = fs.readFileSync("./symbols.txt", "utf8");

let symbols = data.split("\n");

symbols.forEach(symbol => {
	let stock = {};
	stock.symbol = symbol;
	stock.currentPrice = Number(((Math.random() * 80) + 20).toFixed(2));
	stock.closingPrice = [];
	stock.total = 100;
	stock.currentBids = [];
	stock.currentAsks = [];
	stock.dailyHigh = [stock.currentPrice];
	stock.dailyLow = [stock.currentPrice];
	stock.sharesTraded = [0];
	stock.available = {
		ipo: 100,
		sellers: 0
	};
	
	stocks.push(stock);
});

module.exports = stocks;