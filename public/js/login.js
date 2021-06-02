function login(){
	let url = "http://localhost:3000/";
	let username = document.getElementById("username").value;
	let password = document.getElementById("password").value;

	let xhttp = new XMLHttpRequest;
	xhttp.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				let userId = JSON.parse(this.responseText).id;
				window.location.href = "/users/"+userId;
			} else{
				alert("wrong username or password.");
			}
		}
	}
	xhttp.open("POST",window.location.href,true);
	xhttp.setRequestHeader("Content-Type","application/json");
	xhttp.send(JSON.stringify({username,password}));
}