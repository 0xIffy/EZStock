let socket = null;

//socket.io functions:

function joinNSP(symbol){
	socket = io("/"+symbol);
	socket.on("updateBids", updateBids);
	socket.on("updateAsks", updateAsks);
	socket.on("sale", updateStockData);
}

function updateBids(bidStr){
	let bids = JSON.parse(bidStr).bids;
	$("#bids").empty();
	let bidList = document.getElementById("bids");

	bids.forEach(bid =>{
		let bidItem = document.createElement("li");
		bidItem.innerHTML = bid.amount +" shares for $" + bid.price.toFixed(2) +"/share";
		bidList.appendChild(bidItem);
	});
}

function updateAsks(askStr){
	let asks = JSON.parse(askStr).asks;
	$("#asks").empty();
	let askList = document.getElementById("asks");

	asks.forEach(ask =>{
		let askItem = document.createElement("li");
		askItem.innerHTML = ask.amount +" shares for $" + ask.price.toFixed(2) +"/share";
		askList.appendChild(askItem);
	});
}

function updateStockData(dataStr){
	let data = JSON.parse(dataStr);
	document.getElementById("price").innerHTML = data.price.toFixed(2);
	document.getElementById("high").innerHTML = data.high.toFixed(2);
	document.getElementById("low").innerHTML = data.low.toFixed(2);
	document.getElementById("shares").innerHTML = data.traded;
}

//client side functions:

function getStockHistory(){
	let startday = document.getElementById("startday").value;
	let endday = document.getElementById("endday").value;

	let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function(){
		if(this.readyState == 4 && this.status == 200){
			let days = JSON.parse(this.responseText).days;
			let div = document.getElementById("days");
			div.innerHTML = "Displaying information from day "+startday+" to day "+endday;

			let table = document.createElement("table");
			table.setAttribute("class", "table table-sm table-bordered");
			// table.setAttribute("")
			table.innerHTML = "<tr><th>Day</th><th>Closing Price</th><th>Shares Traded</th><th>High</th><th>Low</th></tr>";
			
			days.forEach(day => {
				table.innerHTML += `<tr><td>${day.day}</td><td>${day.closing}</td><td>${day.shares}</td><td>${day.high}</td><td>${day.low}</td></tr>`;
			});
			div.appendChild(table);
		}
	}
	xhttp.open("GET",window.location.href+"?startday="+startday+"&endday="+endday,true);
	xhttp.setRequestHeader("Accept","application/json");
	xhttp.send();
}

function submitOrder(){
	let stockSymbol = document.getElementById("symbol").innerHTML;
	let type = document.getElementById("orderType").value;
	let price = document.getElementById("orderPrice").value;
	let amount = document.getElementById("orderAmount").value;
	let expires = document.getElementById("orderExpires").checked;

	let confirmMessage = `Please review order information:\n- Stock: ${stockSymbol}\n- Order Type: ${type}\n- Amount: ${amount}\n- Price per share: ${price}\n`;
	confirmMessage += expires ? "(This order will expire at the end of the next trading day if it is not fully fulfilled).\n\n" : "(This order will remain active until fully fulfilled or cancelled).\n\n";
	
	if(Number(price) && Number(amount) > 0 && Number(price) > 0){
		if(confirm(confirmMessage+"Would you like to proceed with your order?")){
			let xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function(){
				if(this.readyState == 4){
					if(this.status == 200){
						let orderId = JSON.parse(this.responseText).id;
						location.reload();
					} else if(this.status == 406){
						alert(this.responseText);
					}
				} 
			}
			xhttp.open("POST",window.location.href+"/order",true);
			xhttp.setRequestHeader("Content-Type","application/json");
			xhttp.setRequestHeader("Accept","application/json");
			xhttp.send(JSON.stringify({stock: stockSymbol, type, sharePrice: price, amount, expires}));
		} else{
			alert("Order has been cancelled.");
		}
	} else{
		alert("You must fill out the entire order form to place an order.")
	}
}

function checkOption(){
	if(document.getElementById("watchlist").value == "Create new watchlist"){
		let body = document.getElementById("wmbody");

		let input = document.createElement("input");
		input.id = "watchlistName";
		input.type = "text";

		let label = document.createElement("label");
		label.for = "watchlistName";
		label.id = "wlNameLabel";
		label.innerHTML = "Name:"

		body.appendChild(label);
		body.appendChild(input);
	} else{
		let input = document.getElementById("watchlistName");
		input.parentNode.removeChild(input);
		let label = document.getElementById("wlNameLabel");
		label.parentNode.removeChild(label);
	}
}

function watchStock(){
	let watchlist = document.getElementById("watchlist").value;
	if(watchlist == "Create new watchlist"){
		watchlist = document.getElementById("watchlistName").value;
	}

	if(watchlist){
		let xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4){
				if(this.status == 200){
					let data = JSON.parse(this.responseText);

					$("#watchlistModal").modal("hide");
					
					if(data.isNew){
						let op = document.createElement("option");
						op.text = data.name;
						document.getElementById("watchlist").add(op, 1);
					}

					alert("Success");
				} else if(this.status == 401){
					alert(JSON.parse(this.responseText).msg);
				}

				document.getElementById("watchlist").selectedIndex = 0;
				checkOption();
			} 
		}
		xhttp.open("POST",window.location.href+"/watch",true);
		xhttp.setRequestHeader("Content-Type","application/json");
		xhttp.setRequestHeader("Accept","application/json");
		xhttp.send(JSON.stringify({watchlist}));
	}

	else{
		alert("Please enter a name for the watchlist.");
	}
}

function subscribe(){
	let pct = document.getElementById("triggerChange").value;

	if(!Number(pct) || Number(pct) == 0){
		alert("Change value must be a number not equal to 0.");
		return
	}

	let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				$("#subscriptionModal").modal("hide");

				alert("Success");
			} else if(this.status == 401){
				alert(JSON.parse(this.responseText).msg);
			}
		} 
	}
	xhttp.open("POST",window.location.href+"/subscribe",true);
	xhttp.setRequestHeader("Content-Type","application/json");
	xhttp.setRequestHeader("Accept","application/json");
	xhttp.send(JSON.stringify({change: pct}));
}