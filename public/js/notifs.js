function readNotif(notifID){
	let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				let n = document.getElementById(notifID);
				n.parentNode.removeChild(n);
			} 
		} 
	}

	xhttp.open("PUT","/notifs",true);
	xhttp.setRequestHeader("Content-Type","application/json");
	xhttp.setRequestHeader("Accept","application/json");
	xhttp.send(JSON.stringify({notifID}));
}

function getNotifs(){
	console.log("hey");
	let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				let notifs = JSON.parse(this.responseText).notifs;

				let div = document.getElementById("notifs");

				div.innerHTML = '';

				if(notifs.length > 0){
					notifs.forEach(notif => {
						let a = document.createElement("a");
						a.setAttribute("class", "dropdown-item");
						a.setAttribute("id", notif._id);
						a.onclick = function(){ readNotif(notif._id); };
						a.innerHTML = notif.message;

						div.appendChild(a);
					});
				} else{
					let p = document.createElement("p");
					p.setAttribute("class", "dropdown-item");
					p.innerHTML = "You have no new notifications";

					div.appendChild(p);
				}
			} 
		} 
	}
	xhttp.open("GET","/notifs",true);
	xhttp.setRequestHeader("Content-Type","application/json");
	xhttp.setRequestHeader("Accept","application/json");
	xhttp.send();
}

setInterval(getNotifs,5 * 3600 * 1000);