let socket = io();
socket.on("dayChange", incrementDay);

function nextDay(){
	let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function(){
		if(this.readyState == 4 && this.status == 200){
			// incrementDay();
		}
	}
	xhttp.open("POST","http://localhost:3000/newday",true);
	xhttp.send();
}

function incrementDay(){
	let day = document.getElementById("day");
	day.innerHTML = Number(day.innerHTML)+1;
}