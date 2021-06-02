function searchStocks(){
	let symbol = document.getElementById("symbol").value;
	let minprice = document.getElementById("min").value;
	let maxprice = document.getElementById("max").value;

	window.location.href = "http://localhost:3000/stocks?symbol="+symbol+"&minprice="+minprice+"&maxprice="+maxprice;
}