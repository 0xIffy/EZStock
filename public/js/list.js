let sockets = {};

//socket.io functions:

function joinNSP(symbol){
	sockets[symbol] = io("/"+symbol);
	let socket = socket[symbol];

	socket.on("updateBids", updateBids);
	socket.on("updateAsks", updateAsks);
	socket.on("sale", updateStockData);
}

function updateBids(dataStr){
	let data = JSON.parse(dataStr);
	let bids = data.bids;
	let symbol = data.stock;

	$("#"+symbol+"Bids").empty();
	let bidList = document.getElementById(symbol+"Bids");

	bids.forEach(bid =>{
		let bidItem = document.createElement("li");
		bidItem.innerHTML = bid.amount +" shares for $" + bid.price.toFixed(2) +"/share";
		bidList.appendChild(bidItem);
	});
}

function updateAsks(dataStr){
	let data = JSON.parse(dataStr);
	let asks = data.bids;
	let symbol = data.stock;

	$("#"+symbol+"Asks").empty();
	let askList = document.getElementById(symbol+"Asks");

	asks.forEach(ask =>{
		let askItem = document.createElement("li");
		askItem.innerHTML = ask.amount +" shares for $" + ask.price.toFixed(2) +"/share";
		askList.appendChild(askItem);
	});
}

function updateStockData(dataStr){
	let data = JSON.parse(dataStr);
	let symbol = data.stock;

	document.getElementById(symbol+"Price").innerHTML = data.price.toFixed(2);
	// document.getElementById(symbol+"high").innerHTML = data.high.toFixed(2);
	// document.getElementById(symbol+"low").innerHTML = data.low.toFixed(2);
	document.getElementById(symbol+"Shares").innerHTML = data.traded;
}

function remStock(symbol){
	if(confirm("Are you sure you want to remove "+ symbol +" from this watchlist?")){
		let xhttp = new XMLHttpRequest;
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4){
				if(this.status == 200){
					let stock = document.getElementById(symbol);
					stock.parentElement.removeChild(stock);
				} // else{
				// 	alert(this.responseText);
				// }
			}
		}

		xhttp.open("PUT",window.location+"/remove",true);
		xhttp.setRequestHeader("Content-Type","application/json");
		xhttp.send(JSON.stringify({symbol}));
	}
}