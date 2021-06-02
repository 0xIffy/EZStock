const port = 3000;
const express = require("express");
const fs = require("fs");
const http = require("http");
const mongoose = require("mongoose");
const graphql = require("graphql");
const { graphqlHTTP } = require("express-graphql");
const schema = require("./graphqlSchema");
const cors = require("cors");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const User = require("./models/userModel");
const Stock = require("./models/stockModel");
const Notification = require("./models/notificationModel");
const Order = require("./models/orderModel");
const Subscription = require("./models/subscriptionModel");

const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const store = new MongoDBStore({
	uri: "mongodb://localhost:27017/tokens",
	collection: "sessions"
});

const THREE_HOURS = 60 * 60 * 3 * 1000;


const app = express();

app.locals.day = 1;

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(session({
	secret: "wTdw6C7fOSJp",
	store: store,
	resave: true,
	saveUninitialized: false,
	cookie: {
		maxAge: THREE_HOURS
	}
}));

//Keeps track of the current day in the session variable, probably a better way to do this
app.use(function(req,res,next){
	req.session.day = req.app.locals.day;
	// req.session.port = port;
	next();
});

app.use(express.static("./public"));

let userRouter = require("./routers/userRouter");
app.use("/users", userRouter);

let stockRouter = require("./routers/stockRouter");
app.use("/stocks", stockRouter.router);

app.use(cors());

// Used for graphql api, not currently used
app.use("/graphql", graphqlHTTP({
	schema,
	graphiql: true
}));

app.use(function(req, res, next){
	if(req.session.loggedin){
		const now = Date.now();

		if(now > req.session.createdAt + THREE_HOURS){
			logout(req, res);

			res.render("./pages/kick");
			return;
		}
	}

	next();
});

//Main server routes
app.get("/", function(req,res){
	res.render("./pages/index", { session: req.session, day: req.app.locals.day });
});

app.get("/day", function(req,res,next){
	res.status(200).json({day: req.app.locals.day});
});

app.get("/session", function(req,res,next){
	// res.setHeader("Access-Control-Allow-Origin", "http://localhost:4000");
	res.status(200).json({session: req.session});
})

app.get("/login", function(req,res){
	if(!req.session.loggedin){
		res.render("./pages/login", { session: req.session });
	} else{
		res.redirect("/users/" + req.session.userId);
	}
});

app.post("/login", express.json(), function(req,res){
	let username = req.body.username;
	let password = req.body.password;

	User.findOne().where("username").equals(username).exec(function(err,user){
		if(err){
			console.log(err);
			res.status(401).send("Invalid username or password");
			return;
		}

		res.setHeader("Access-Control-Allow-Origin", "http://localhost:4000");
		if(user){
			bcrypt.compare(password, user.passwordHash, function(err,result){
				if(result){
					req.session.loggedin = true;
					req.session.userId = user._id;
					req.session.isAdmin = user.isAdmin;
					req.session.createdAt = Date.now();

					Notification.find({user: user._id, read: false}).exec(function(e, notifs){
						if(e){
							console.log(e);
							return;
						}

						req.session.notifs = notifs;
		
						res.status(200).json({id: user._id});
					});
				} else{
					res.status(401).send("Invalid username or password");
				}
			});
		}
	});
});

app.get("/register", function(req,res){
	if(!req.session.loggedin){
		res.render("./pages/register", { session: req.session });
	} else{
		res.redirect("/users/" + req.session.userId);
	}
});

app.post("/register",express.json(), function(req,res){
	let username = req.body.username;
	let password = req.body.password;

	User.findOne().where("username").equals(username).exec(function(err,user){
		if(err){
			console.log(err);
			res.status(401).send("Invalid username or password");
			return;
		}

		if(user){
			res.status(401).send("A user with this username already exists in the database.");
		}	else{
			let u = new User();

			u.username = username;
			u.isAdmin = false;
			u.balance = 0;
			u.shares = [];
			u.watchlists = [];
			// u.subscriptions = [];
			// u.transactions = [];
			bcrypt.genSalt(saltRounds, function(err,salt){
				bcrypt.hash(password,salt,function(err,hash){
					u.passwordHash = hash;

					u.save(function(err,result){
						if(err){
							console.log(err);
							res.status(401).send("Invalid username or password");
							return;
						}

						console.log(result);

						req.session.loggedin = true;
						req.session.userId = result._id;
						req.session.isAdmin = result.isAdmin;
						req.session.createdAt = Date.now();
						req.session.notifs = [];

						res.status(200).json({id: result._id});
					});
				});
			});
		}	
	});
});

app.get("/logout", logout);

function logout(req,res){
	req.session.loggedin = false;
	req.session.userId = null;
	req.session.isAdmin = null;
	res.redirect("/");
}

app.post("/newday", function(req,res){
	if(req.session.isAdmin){
		dailyStockUpdate();
		res.status(200).send("Success");
	} else{
		res.status(401).send("You are not authorized to perform this action.");
	}
});

app.get("/notifs", function(req,res,next){
	if(req.session.loggedin){
		Notification.find({user: req.session.userId, read: false}).exec(function(err, notifs){
			if(err){
				console.log(err);
				res.status(500).send("Bad");
				return;
			}

			req.session.notifs = notifs;

			res.status(200).json({notifs: notifs});
		});	
	} else{
		res.status(401).send("Unauthorized");
	}
});

app.put("/notifs", express.json(), function(req,res,next){
	let id = req.body.notifID;

	Notification.findById(id).exec(function(err,result){
		result.read = true;

		req.session.notifs.some((notif, i) => {
			if(String(result._id) === String(notif._id)){
				req.session.notifs.splice(i,1);

			}

			return String(result._id) === String(notif._id);
		});

		result.save(function(e, n){
			res.status(200).json({id: n._id});
		});
	});
});


//Connects to database and creates server on success
mongoose.connect("mongodb://localhost/stocksDB", { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true});
	
	let db = mongoose.connection;
	db.on("error", console.error.bind(console, "connection error: "));
	db.on("open", function(){

		const server = http.createServer({
			// key: fs.readFileSync("./server.key"),
			// cert: fs.readFileSync("./server.cert")
		}, app).listen(port, function(){
			console.log("Server listening at http://localhost:"+port+"/");
		});

		const io = require("socket.io")(server);
		app.locals.io = io;
		
		io.on("connection", socket => {

		});
});


//Calculates milliseconds until 12 am the next day for tracking daily stock data
function calcMillisTillTmr(){
	let now = new Date();
	let millisTilltmr = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1) - now;

	return millisTilltmr;
}

//Updates the required daily info for the stock
function dailyStockUpdate(){
	Stock.find().exec(function(err,stocks){
		if(err){
			console.log(err);
			return;
		}
		let count = 0;

		stocks.forEach(stock => {
			stock.closingPrice.push(stock.currentPrice);
			stock.dailyHigh.push(stock.currentPrice);
			stock.dailyLow.push(stock.currentPrice);
			stock.sharesTraded.push(0);

			stock.save(function(err2,result){
				if(err2){
					console.log(err2);
					return;
				}

				count++;
				// console.log("success ",count);

				if(count === stocks.length){
					app.locals.day += 1;
					app.locals.io.emit("dayChange");
				}
			});
		});
	});

	Order.find({cancelled: false, complete: false}).exec(function(err, orders){
		if(err){
			console.log(err);
			return;
		}

		orders.forEach(order => {
			stockRouter.fulfillOrder(order, app.locals);
			
			if(order.expires){
				let u = order.type == "Buy" ? order.buyers[0] : order.sellers[0];

				User.findOne({username: u}).exec(function(e, user){
					let options = {
						host: "localhost",
						port: 3000,
						path: "/users/"+user._id+"/cancelOrder",
						method: 'PUT',
						headers: {
							"Content-type": "application/json"
						}
					};
					
					let req = http.request(options, function(res) {
						// console.log('STATUS: ' + res.statusCode);
						// console.log('HEADERS: ' + JSON.stringify(res.headers));
						res.setEncoding('utf8');
						res.on('data', function (chunk) {
							console.log('BODY: ' + chunk);
						});
					});
					
					req.on('error', function(e) {
						console.log('problem with request: ' + e.message);
					});
					
					// write data to request body
					req.write(JSON.stringify({orderID: order._id}));
					req.end();
				});
			}
		});
	});

	Subscription.find({triggered: true}).exec(function(err, subs){
		if(err){
			console.log(err);
			return;
		}

		subs.forEach(sub => {
			sub.triggered = false;

			sub.save();
		});
	});
}

//Schedules the next daily update
setTimeout(dailyStockUpdate, calcMillisTillTmr());

//Reschedules the update every 24 hours
setInterval(function(){
	setTimeout(dailyStockUpdate, calcMillisTillTmr());
}, 86400000);