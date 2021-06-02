const mongo = require("mongodb");
const MongoClient = mongo.MongoClient;
const bcrypt = require("bcrypt");
const saltRounds = 10;
// const User = require("./userModel");
// const Stock = require("./stockModel");

let db;
let stocks = require("./stockReader");
let users = [];

let salt, hash;

salt = bcrypt.genSaltSync(saltRounds);
hash = bcrypt.hashSync("pass1234",salt);
users.push({
	username: "admin",
	passwordHash: hash,
	balance: 1000,
	isAdmin: true,
	shares: [],
	watchlists: [],
	// subscriptions: []
});

usernames = ["BenjiG","MarketMat","TristanTrades"];

usernames.forEach(username => {
	salt = bcrypt.genSaltSync(saltRounds)
	hash = bcrypt.hashSync(username,salt);
	let user = {};
	user.username = username;
	user.passwordHash = hash;
	user.balance = 0;
	user.isAdmin = false;
	user.shares = [];
	user.watchlists = [];
	// user.subscriptions = [];
	users.push(user);
});


MongoClient.connect("mongodb://localhost:27017/", function(err, client){
	if(err){
	 console.log(err);
	}	

	db = client.db('stocksDB');
	
	db.listCollections().toArray(function(err, result){
		if(result.length == 0){
			db.collection("stocks").insertMany(stocks, function(err2,result2){
				if(err2){
					console.log(err2);
					return;
				}

				console.log(result2.insertedCount + " stocks added.");

				db.collection("users").insertMany(users, function(err3,result3){
					if(err3){
						console.log(err3);
						return;
					}
	
					console.log(result3.insertedCount + " users added.");
					client.close();
				});
			});

			return;
		} 

		let numDropped = 0;
	 	let toDrop = result.length;
		result.forEach(collection => {
			db.collection(collection.name).drop(function(err, delOK){
				if(err){
					console.log(err);
					return;
				}

				console.log("Dropped collection: " + collection.name);
				numDropped++;
				
				if(numDropped == toDrop){
					db.collection("stocks").insertMany(stocks, function(err2,result2){
						if(err2){
							console.log(err2);
							return;
						}
		
						console.log(result2.insertedCount + " stocks added.");
		
						db.collection("users").insertMany(users, function(err3,result3){
							if(err3){
								console.log(err3);
								return;
							}
			
							console.log(result3.insertedCount + " users added.");
							client.close();
						});
					});
				}
			});
		});
	});
});