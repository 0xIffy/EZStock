const express = require("express");
let router = express.Router();
const mongoose = require("mongoose");
const Subscription = require("../models/subscriptionModel");
const Stock = require("../models/stockModel");
const Order = require("../models/orderModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");

router.get("/", queryParser, loadStocks, sendStocks);

router.get("/:symbol", queryParser, loadStock, loadUser, sendStock);

router.post("/:symbol/order", validateUser, express.json(), verifyOrderData, createOrder);

router.get("/:symbol/history", validateUser, queryParser, loadOrders, sendOrders);

router.get("/:symbol/:oid", validateUser, loadOrder, sendOrderSummary);

router.post("/:symbol/subscribe", validateUser, express.json(), loadUser, loadStock, subscribe);
router.post("/:symbol/watch", validateUser, express.json(), loadUser, addToWatchlist);


function subscribe(req,res,next){
	let changePct = req.body.change;
	let index;

	Subscription.findOne({symbol: req.params.symbol}).exec(function(err, result){
		if(result){
			res.status(401).json({msg: "You are already subsribed to this stock."});
		} else{
		
			s = new Subscription({
				symbol: req.params.symbol,
				change: changePct, 
				active: true,
				user: res.user.username,
				startValue: res.stock.currentPrice,
				triggered: false
			});
	
			s.save(function(err, result){
				if(err){
					console.log(err);
					return;
				}
	
				res.status(200).send();
			});
		}
	})

	
}

function validateUser(req,res,next){
	if(req.session.loggedin){
		next();
	} else{
		res.status(401).send("You must be logged in to complete this action.");
	}
}

function addToWatchlist(req,res,next){
	let watchlistName = req.body.watchlist;
	let symbol = req.params.symbol;
	let listI;
	let isNew = false;

	let listExists = res.user.watchlists.some((list, i) => {
		listI = i;

		return list.name === watchlistName;
	});

	if(!listExists){
		isNew = true;
		listI = res.user.watchlists.length;
		res.user.watchlists.push({name: watchlistName, stocks: []});
	}

	if(res.user.watchlists[listI].stocks.includes(symbol)){
		res.status(401).json({msg: watchlistName + " already includes this stock."});
	} else{
		res.user.watchlists[listI].stocks.push(symbol);

		res.user.save(function(err,result){
			if(err){
				console.log(err);
				return;
			}

			res.status(200).json({isNew, name: watchlistName});
		});
	}
}


function createOrder(req,res,next){
	let o = new Order(res.orderInfo);

	if(o.type == "Buy"){
		o.buyers.push(res.user.username);
	} else{
		o.sellers.push(res.user.username);
	}

	o.openDate = req.app.locals.day;
	o.complete = false;
	o.cancelled = false;

	o.save(function(err2,order){
		if(err2){
			console.log(err2);
			return;
		}

		if(o.type == "Sell"){
			let i = 0;

			//Remove shares to be sold from sellers portfolio
			res.user.shares.some(share => {
				if(share.stock === o.stock){
					res.user.shares[i].amount -= o.amount;
					res.user.save();
				}
				i++;

				return share.stock === o.stock;
			});

			//Add order to asks array for stock
			res.stock.currentAsks.push({amount: order.amount, price: order.sharePrice, orderID: order._id, user: res.user.username});
			res.stock.available.sellers += o.amount;
			res.stock.set({available: res.stock.available});

			res.stock.save(function(err,s){
				if(err){
					console.log(err);
					return;
				}

				req.app.locals.io.of("/"+req.params.symbol).emit("updateAsks", JSON.stringify({asks: res.stock.currentAsks, stock: req.params.symbol}));

				console.log(order);

				//See if order can be completed (partially or completely)
				fulfillOrder(order, req.app.locals);

				res.status(200).json({id: order._id});
			});
		} else{
			//Remove money from user's account
			res.user.balance -= o.amount * o.sharePrice;
			res.user.save();

			//Add order to bids array for stock
			res.stock.currentBids.push({amount: order.amount, price: order.sharePrice, orderID: order._id, user: res.user.username});
					
			res.stock.save(function(err,s){
				if(err){
					console.log(err);
					return;
				}
				
				req.app.locals.io.of("/"+req.params.symbol).emit("updateBids", JSON.stringify({bids: res.stock.currentBids, stock: req.params.symbol}));

				console.log(order);

				//See if order can be completed (partially or completely)
				fulfillOrder(order, req.app.locals);

				res.status(200).json({id: order._id});
			});
		}
	});
}

function verifyOrderData(req,res,next){
	let orderInfo = req.body;

	User.findById(req.session.userId).exec(function(err,user){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load user.");
			return;
		}

		let userShares = user.shares.filter(obj => {
			return obj.stock === req.params.symbol;
		})[0];

		res.user = user;
		res.orderInfo = orderInfo;

		Stock.findOne({symbol: req.params.symbol}).exec(function(err,stock){
			if(err){
				console.log(err);
				res.status(500).send("Cannot load stock.");
				return;
			}

			res.stock = stock;

			if(orderInfo.type === "Sell"){
				if(userShares && userShares.amount >= orderInfo.amount){
					
					next();
				} else{
					res.status(406).send("You do not own enough shares of this stock to complete this transaction.")
				}
			} else{
				if(user.balance >= orderInfo.amount * orderInfo.sharePrice){
					
					next();
				} else{
					res.status(406).send("Your current balance is too low to complete this transaction.")
				}
			}
		});

	});
}

function loadOrder(req,res,next){
	Order.findById(req.params.oid).exec(function(err,order){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load order.");
			return;
		}

		res.order = order;
		next();
	});
}

function sendOrderSummary(req,res,next){
	res.render("./pages/orderSummary", {order: res.order, session: req.session});
}

function loadOrders(req,res,next){
	let symbol = req.params.symbol;
	let dateConstraints = res.startDay ? {$gte: res.startDay, $lte: res.endDay} : req.app.locals.day;

	Order.find({ stock: new RegExp(symbol, "i"), complete: true, completeDate: dateConstraints }).exec(function(err,result){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load orders for this stock.");
			return;
		}

		res.orders = result;
		next();
	});
}

function sendOrders(req,res,next){
	res.format({
		"text/html": () => { res.render("./pages/stockHistory", { orders: res.orders, session: req.session }); },
		"application/json": () => { res.status(200).json(res.orders); }
	});
}

function loadUser(req,res,next){
	let userId = req.session.userId;

	User.findById(userId).exec(function(err,user){
		if(err){
			console.log(err);
			return;
		}

		// let index = user.shares.indexOf()
		res.user = user;
		// console.log(res.user);

		next();
	});
}

function loadStock(req,res,next){
	let symbol = req.params.symbol;

	Stock.findOne({symbol: new RegExp(symbol, "i")}).exec(function(err,stock){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load stock.");
			return;
		}

		let dayIndex = req.app.locals.day - 1;

		if(res.startDay){
			res.days = [];
			for(let i = res.startDay - 1; i < res.endDay; i++){
				let day = {};
				day.day = i + 1;
				day.high = stock.dailyHigh[i];
				day.low = stock.dailyLow[i];
				day.shares = stock.sharesTraded[i];
				if(res.endDay === dayIndex + 1){
					day.closing = stock.currentPrice;
				} else{
					day.closing = stock.closingPrice[i];
				}
				res.days.push(day);
			}
		} else{
			res.days = {
				high: stock.dailyHigh[dayIndex],
				low: stock.dailyLow[dayIndex],
				shares: stock.sharesTraded[dayIndex],
				closing: stock.currentPrice
			}
		}

		res.stock = stock;
		next();
	});
}

function sendStock(req,res,next){
	res.format({
		"text/html": () => { res.render("./pages/stock", { days: res.days, stock: res.stock, session: req.session, user: res.user }); },
		"application/json": () => { res.status(200).json({days: res.days }); }
	});
}

function queryParser(req,res,next){
	res.symbol = req.query.symbol ? req.query.symbol : "";
	res.minPrice = Number(req.query.minprice) ? Number(req.query.minprice) : 0;
	res.maxPrice = Number(req.query.maxprice) ? Number(req.query.maxprice) : null;

	let startDay = req.query.startday;
	let endDay = req.query.endday;

	if(startDay || endDay){
		res.startDay = startDay && Number(startDay) >= 1 ? startDay : 1;
		res.endDay = endDay && Number(endDay) <= req.app.locals.day ? endDay : req.app.locals.day;
	}

	next();
}

function loadStocks(req,res,next){
	let priceConstraints = res.maxPrice ? {$gte: res.minPrice, $lte: res.maxPrice} : {$gte: res.minPrice};

	Stock.find({symbol: new RegExp(res.symbol,"i"), currentPrice: priceConstraints}).exec(function(err,stocks){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load stocks");
			return;
		}

		// console.log(stocks);
		res.stocks = stocks;
		next();
	});
}

function sendStocks(req,res,next){
	res.format({
		"text/html": () => { res.render("./pages/stocks", { stocks: res.stocks, session: req.session, query: req.query }); },
		"application/json": () => { res.status(200).json(res.stocks); }
	});
}


//**** only works if you can use references for order and stock and user
/*
	This function is incredibly long and not very modular (my appologies).
	There is a lot of repeated code in this function, I will work on changing this before the final deadline
	Its purpsoe is to fulfill all or part of an order if it can and update all necessary value in the database
*/
function fulfillOrder(order,locals){
	if(order.complete || order.cancelled){
		return;
	}

	Stock.findOne({symbol: order.stock}).exec(async function(err,stock){
		if(order.type == "Buy"){
			User.findOne({username: order.buyers[0]}).exec(async function(er,user){
				
				//Checks if there are any available shares from the 'initial public offering' else must buy from another user
				if(stock.available.ipo > 0 && order.sharePrice >= stock.currentPrice){
					buyIPO(user, stock, order, locals);

					// user = data.user;
					// stock = data.stock;
					// order = data.order;
				}

				let buyAmt;

				//Process for buying shares from another user
				do{
					buyAmt = order.amount - order.partFulfilled.reduce((total, num) => {
						return total += num;
					},0);

					let lowestAsk = order.sharePrice;
					let askID;

					//Finds the sell offer for the least amount of money under the curent order price if it exists
					stock.currentAsks.forEach(ask => {
						if(ask.price < lowestAsk && ask.price <= order.sharePrice && order.buyers[0] != ask.user){
							askID = ask.orderID;
							lowestAsk = ask.price;
						}
					});

					//If no matching ask was found
					if(!askID){
						break;
					}

					//Finds the order associated with the ask
					let sellOrder = await Order.findById(askID).exec();
				
				
					// console.log(sellOrder);

					//Finds the user making the sale
					let seller = await User.findOne({username: sellOrder.sellers[0]});

					await userTransaction(order,sellOrder,user,seller,stock,locals);

				} while(stock.available.sellers > 0 && buyAmt > 0);

				// console.log("buy\n",order,stock);

				await stock.save();

				stock.newHigh();
				stock.newLow();

				//Emit socket io signals to update necessary pages
				locals.io.of("/"+stock.symbol).emit("updateAsks",JSON.stringify({asks: stock.currentAsks, stock: stock.symbol}));
				locals.io.of("/"+stock.symbol).emit("updateBids",JSON.stringify({bids: stock.currentBids, stock: stock.symbol}));
				locals.io.of("/"+stock.symbol).emit("sale",JSON.stringify({
					stock: stock.symbol,
					price: stock.currentPrice,
					high: stock.dailyHigh[locals.day-1],
					low: stock.dailyLow[locals.day-1],
					traded: stock.sharesTraded[locals.day-1]
				}));

				checkSubs(stock);
			});
		} else{
			//Sell order
			console.log(order);

			User.findOne({username: order.sellers[0]}).exec(async function(er,user){
				let sellAmt;


				//Process for selling share to another user
				do{
					sellAmt = order.amount - order.partFulfilled.reduce((total, num) => {
						return total += num;
					},0);

					let highestBid = 0;
					let bidID;

					//Finds bid for the most money over the given order price if one exists
					stock.currentBids.forEach(bid => {
						if(bid.price > highestBid && bid.price >= order.sharePrice && order.sellers[0] != bid.user){
							bidID = bid.orderID;
							highestBid = bid.price;
						}
					});

					//If no bid matched criteria
					if(!bidID){
						break;
					}

					//Order associated with bid
					let buyOrder = await Order.findById(bidID).exec();
				
				
					//User to buy the shares
					let buyer = await User.findOne({username: buyOrder.buyers[0]});

					await userTransaction(buyOrder,order,buyer,user,stock, locals);

					// console.log(buyOrder,order,buyer,user,stock);

				} while(stock.currentBids.length > 0 && sellAmt > 0);
				

				await stock.save();

				stock.newHigh();
				stock.newLow();

				//Emit socket io signals to update necessary pages
				locals.io.of("/"+stock.symbol).emit("updateAsks",JSON.stringify({asks: stock.currentAsks, stock: stock.symbol}));
				locals.io.of("/"+stock.symbol).emit("updateBids",JSON.stringify({bids: stock.currentBids, stock: stock.symbol}));
				locals.io.of("/"+stock.symbol).emit("sale",JSON.stringify({
					stock: stock.symbol,
					price: stock.currentPrice,
					high: stock.dailyHigh[locals.day-1],
					low: stock.dailyLow[locals.day-1],
					traded: stock.sharesTraded[locals.day-1]
				}));

				checkSubs(stock);
			});
		}
	});
}

async function userTransaction(buyOrder, sellOrder, buyer, seller, stock, locals){
	let x = -1;
	let y = -1;
	let i;

	let sellAmt = sellOrder.amount - sellOrder.partFulfilled.reduce((total, num) => {
		return total += num;
	},0);

	stock.currentAsks.some(obj => {
		x++;
		return String(obj.orderId) === String(sellOrder._id);
	});

	
	//Remaing part of order not yet fulfilled
	let buyAmt = buyOrder.amount - buyOrder.partFulfilled.reduce((total, num) => {
		return total += num;
	},0);

	//Finds index of bid associated with buy order
	stock.currentBids.some(obj => {
		y++;
		return String(obj.orderId) === String(buyOrder._id);
	});

	//Checks if buyer has any shares in portfolio already
	let shareExists = buyer.shares.some((obj,index) => {
		i = index;		

		return obj.stock === stock.symbol;
	});

	//creates/sets share object to be stored in buyer doc
	let share = shareExists ? buyer.shares[i] : {stock: stock.symbol, amount: 0, avgPrice: []};

	//Process transaction	
	buyOrder.sellers.push(seller.username);
	sellOrder.buyers.push(buyer.username);

	let nB;
	let nS;

	if(buyAmt <= sellAmt){
		share.amount += buyAmt;
		share.avgPrice.push({amt: buyAmt, prc: buyOrder.sharePrice});
		
		seller.balance += buyOrder.sharePrice * buyAmt;
		
		sellOrder.partFulfilled.push(buyAmt);
		buyOrder.partFulfilled.push(buyAmt);
		buyOrder.complete = true;

		sellAmt -= buyAmt;

		stock.available.sellers -= buyAmt;
		stock.set({available: stock.available});

		stock.sharesTraded[locals.day - 1] += buyAmt;
		stock.sharesTraded.set(locals.day-1,stock.sharesTraded[locals.day - 1]);

		stock.currentBids.pull(stock.currentBids[y]._id);
		stock.currentAsks[x].amount -= buyAmt;
		stock.currentAsks.set(x, stock.currentAsks[x]);

		nB = new Notification({
			user: buyer._id,
			read: false,
			message: "Your buy order for "+ stock.symbol +" has been complete."
		});

		nS = new Notification({
			user: seller._id,
			read: false,
			message: "Part of your sell order for "+ stock.symbol +" has been fulfilled."
		});
	} else{
		share.amount += sellAmt;
		share.avgPrice.push({amt: buyAmt, prc: buyOrder.sharePrice});

		seller.balance += buyOrder.sharePrice * sellAmt;

		sellOrder.partFulfilled.push(sellAmt);
		sellOrder.complete = true;
		buyOrder.partFulfilled.push(sellAmt);

		stock.available.sellers -= sellAmt;
		stock.set({available: stock.available});

		stock.sharesTraded[locals.day - 1] += sellAmt;
		stock.sharesTraded.set(locals.day-1,stock.sharesTraded[locals.day - 1]);

		stock.currentBids[y].amount -= sellAmt;
		stock.currentBids.set(y, stock.currentBids[y]);
		stock.currentAsks.pull(stock.currentAsks[x]._id);

		sellAmt = 0;

		nB = new Notification({
			user: buyer._id,
			read: false,
			message: "Part of your buy order for "+ stock.symbol +" has been fulfilled."
		});

		nS = new Notification({
			user: seller._id,
			read: false,
			message: "Your sell order for "+ stock.symbol +" has been complete."
		});
	}

	if(shareExists){
		buyer.shares[i] = share;
	} else{
		buyer.shares.push(share);
	}

	stock.currentPrice = buyOrder.sharePrice;

	nS.save();
	nB.save();

	//Save data before advancing to next iteration of loop
	await buyer.save();
	await buyOrder.save();
	await seller.save();
	await sellOrder.save();

	// console.log(buyOrder,sellOrder,buyer,seller,stock);
}

function buyIPO(user, stock, order, locals){
	let share;
	let i;
	let x = -1;

	//Checks if users already has some shares of current stock
	let shareExists = user.shares.some((obj,index) => {
		i = index;		

		return obj.stock === stock.symbol;
	});

	//Finds bid associated with current order
	stock.currentBids.some(obj => {
		x++;
		return String(obj.orderId) === String(order._id);
	});

	//creates/sets share object to be added the user's portfolio
	share = shareExists ? user.shares[i] : {stock: stock.symbol, amount: 0, avgPrice: []};
	let buyAmt = order.amount - order.partFulfilled.reduce((total, num) => {
		return total += num;
	},0);

	if(stock.available.ipo < buyAmt){
		share.amount += stock.available.ipo;
		share.avgPrice.push({amt: stock.available.ipo, prc: stock.currentPrice});

		order.partFulfilled.push(stock.available.ipo);

		buyAmt -= stock.available.ipo;

		stock.sharesTraded[locals.day - 1] += stock.available.ipo;
		stock.sharesTraded.set(locals.day-1,stock.sharesTraded[locals.day - 1]);

		stock.currentBids[x].amount -= stock.available.ipo;
		stock.currentBids.set(x, stock.currentBids[x]);

		stock.available.ipo = 0;
		stock.set({available: stock.available});
	} else{
		share.amount += buyAmt;
		share.avgPrice.push({amt: buyAmt, prc: stock.currentPrice});

		order.partFulfilled.push(buyAmt);

		stock.sharesTraded[locals.day - 1] += buyAmt;
		stock.sharesTraded.set(locals.day-1,stock.sharesTraded[locals.day - 1]);

		stock.available.ipo -= buyAmt;
		stock.set({available: stock.available});

		buyAmt = 0;

		stock.currentBids.pull(stock.currentBids[x]._id);
	}

	let n;

	if(buyAmt == 0){
		order.complete = true;

		n = new Notification({
			user: user._id,
			read: false,
			message: "Your buy order for "+ stock.symbol +" has been complete."
		});
	} else{
		n = new Notification({
			user: user._id,
			read: false,
			message: "Part of your buy order for "+ stock.symbol +" has been fulfilled."
		});
	}

	n.save();

	if(shareExists){
		user.shares[i] = share;
	} else{
		user.shares.push(share);
	}

	user.save();
	order.save();

	// return {stock: stock, user: user, order: order};
}

function checkSubs(stock){
	Subscription.find({active: true, symbol: stock.symbol, triggered: false}).exec(function(err, subs){
		if(err){
			console.log(err);
			return;
		}

		let n;

		subs.forEach(sub => {
			User.findOne({username: sub.user}).exec(function(e, user){
				if(sub.change < 0){
					if(sub.startValue + (sub.startValue * sub.change) <= stock.currentPrice){
						n = new Notification({
							read: false,
							user: user._id,
							message: stock.symbol + " has fallen " + Math.abs(sub.change) + "% today, its current price is $" + stock.currentPrice + "."
						});

						sub.triggered = true;
						sub.startValue = stock.currentPrice;
					}
				} else{
					if(sub.startValue + (sub.startValue * sub.change) >= stock.currentPrice){
						n = new Notification({
							read: false,
							user: user._id,
							message: stock.symbol + " has risen " + Math.abs(sub.change) + "% today, its current price is $" + stock.currentPrice + "."
						});

						sub.triggered = true;
						sub.startValue = stock.currentPrice;
					}
				}

				n.save();
				sub.save();
			});
		});
	});
}


module.exports = {
	router: router,
	fulfillOrder: fulfillOrder,
	userTransaction: userTransaction,
	buyIPO: buyIPO
};