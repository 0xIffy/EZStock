let socket = null;

function joinNSP(symbol){
	socket = io("/"+symbol);

	socket.on("sale", updateStockData);
}

function updateStockData(dataStr){
	let data = JSON.parse(dataStr);
	let symbol = data.stock;

	let old =Number(document.getElementById(symbol+"Price").innerHTML);
	document.getElementById(symbol+"Price").innerHTML = data.price.toFixed(2);

	let port = document.getElementById("portVal").innerHTML;
	document.getElementById("portVal").innerHTML = port + (data.price - old);
}

function deposit(){
	let amount = Number(document.getElementById("deposit").value);

	if(!amount){
		alert("Amount entered must be a number.");
	} else{
		let xhttp = new XMLHttpRequest;
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4){
				if(this.status == 200){
					let bal = JSON.parse(this.responseText).balance;

					document.getElementById("balance").innerHTML = bal.toFixed(2);
					document.getElementById("deposit").value = "";
				} else{
					alert(this.responseText);
				}
			}
		}
		xhttp.open("PUT",window.location+"/deposit",true);
		xhttp.setRequestHeader("Content-Type","application/json");
		xhttp.setRequestHeader("Accept","application/json");
		xhttp.send(JSON.stringify({amount}));
	}
}

function withdraw(){
	let amount = Number(document.getElementById("withdraw").value);

	if(!amount){
		alert("Amount entered must be a number.");
	} else{
		let xhttp = new XMLHttpRequest;
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4){
				if(this.status == 200){
					let bal = JSON.parse(this.responseText).balance;

					document.getElementById("balance").innerHTML = bal.toFixed(2);
					document.getElementById("withdraw").value = "";
				} else{
					alert(this.responseText);
				}
			}
		}
		xhttp.open("PUT",window.location+"/withdraw",true);
		xhttp.setRequestHeader("Content-Type","application/json");
		xhttp.send(JSON.stringify({amount}));
	}
}

function delList(listName){
	if(confirm("Are you sure you want to delete the watchlist: " + listName + "?")){
		let xhttp = new XMLHttpRequest;
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4){
				if(this.status == 200){
					let row = document.getElementById(listName);
					row.parentElement.removeChild(row);
				} // else{
				// 	alert(this.responseText);
				// }
			}
		}

		xhttp.open("PUT",window.location+"/delList",true);
		xhttp.setRequestHeader("Content-Type","application/json");
		xhttp.send(JSON.stringify({listName}));
	}
}

function delSub(subStock){
	if(confirm("Are you sure you want to delete your subscription to " + subStock + "?")){
		let xhttp = new XMLHttpRequest;
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4){
				if(this.status == 200){
					let row = document.getElementById(subStock);
					row.parentElement.removeChild(row);
				} // else{
				// 	alert(this.responseText);
				// }
			}
		}

		xhttp.open("PUT",window.location+"/delSub",true);
		xhttp.setRequestHeader("Content-Type","application/json");
		xhttp.send(JSON.stringify({stock: subStock}));
	}
}

function updateModal(stock,active,change){
	document.getElementById("trigger").value = change;
	document.getElementById("stockSymbol").innerHTML = stock;

	if(active == "true"){
		document.getElementById("yes").checked = true;
	} else{
		document.getElementById("no").checked = true;
	}
}

function changeSub(){
	let change = document.getElementById("trigger").value;
	if(!Number(change) || Number(change) == 0){
		alert("Trigger % must be a number not equal to 0.");
		return;
	}

	let stock = document.getElementById("stockSymbol").innerHTML;
	let active = 	document.getElementById("yes").checked;

	let xhttp = new XMLHttpRequest;
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4){
				if(this.status == 200){
					document.getElementById(stock+"Btn").innerHTML = "<button class='btn btn-link' type='button' data-toggle='modal' data-target='#subscriptionModal' onclick='updateModal("+stock+", "+active+", "+change+")'>"+stock+"</button>";
					document.getElementById(stock+"Atv").innerHTML = active ? "Yes" : "No";
					document.getElementById(stock+"Change").innerHTML = change;
				} // else{
				// 	alert(this.responseText);
				// }
				$("#subscriptionModal").modal("hide");
			}
		}

		xhttp.open("PUT",window.location+"/updateSub",true);
		xhttp.setRequestHeader("Content-Type","application/json");
		xhttp.send(JSON.stringify({stock: stock, change: change, active: active}));
}

function cancelOrder(orderID){
	if(confirm("Are you sure you would like to cancel this order, this is a irreversible action?")){
		let xhttp = new XMLHttpRequest;
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4){
				if(this.status == 200){
					// let o = document.getElementById(orderID);
					// o.parentNode.removeChild(o);

					// let data = JSON.parse(this.responseText);

					// if(data.sell){
					// 	let num = document.getElementById(data.symbol).childNodes[3].childNodes[0];
					// 	num.innerHTML = Number(num.innerHTML) + data.amt;
					// }
					window.location.reload();
				} // else{
				// 	alert(this.responseText);
				// }
				// $("#subscriptionModal").modal("hide");
			}
		}	

		xhttp.open("PUT",window.location+"/cancelOrder",true);
		xhttp.setRequestHeader("Content-Type","application/json");
		xhttp.send(JSON.stringify({orderID}));
	}
}