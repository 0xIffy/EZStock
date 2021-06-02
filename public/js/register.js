function register(){
	let url = "http://localhost:3000/";
	let username = document.getElementById("username").value;
	let password = document.getElementById("password").value;
	let confimation = document.getElementById("passwordConf").value;

	if(password == confimation){
		let xhttp = new XMLHttpRequest;
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4 && this.status == 200){
				let userId = JSON.parse(this.responseText).id;
				window.location.href = "/users/"+userId;
			}
		}
		xhttp.open("POST",window.location.href,true);
		xhttp.setRequestHeader("Content-Type","application/json");
		xhttp.send(JSON.stringify({username,password}));
	} else{

	}
}