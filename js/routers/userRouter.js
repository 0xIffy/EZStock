const express = require("express");
let router = express.Router();
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const User = require("../models/userModel");
const Subscription = require("../models/subscriptionModel");
const Stock = require("../models/stockModel");
const Order = require("../models/orderModel");


router.get("/:uid", loadUser, loadStocks1, loadSubcriptions, loadOrders, sendUser);

router.get("/:uid/:listName", loadUser, loadList, loadStocks2, sendList);
router.put("/:uid/:listName/remove", loadUser, loadList, express.json(), removeStock);

router.put("/:uid/delSub", loadUser, verifyUser, express.json(), delSub);
router.put("/:uid/delList", loadUser, verifyUser,  express.json(), delList);
router.put("/:uid/deposit", loadUser, verifyUser,  express.json(), depositAmt);
router.put("/:uid/withdraw", loadUser, verifyUser,  express.json(), withdrawAmt);
router.put("/:uid/updateSub", loadUser, verifyUser,  express.json(), updateSub);
router.put("/:uid/cancelOrder", loadUser,  express.json(), cancelOrder);

function verifyUser(req,res,next){
	if(String(res.user._id) == String(req.session.userId)){
		next();
	} else{
		res.status(401).send("You are not authorized to complete this action.");
	}
}

function cancelOrder(req,res,next){
	let id = req.body.orderID;

	Order.findById(id).exec(function(err,result){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load user");
			return;
		}
		
		result.cancelled = true;

		result.save(function(e,o){
			Stock.findOne({symbol: o.stock}).exec(function(er,stock){
				let index;
				let unfulfilled;
				let sell = false;

				unfulfilled = o.amount - o.partFulfilled.reduce((total, n) => {
					return total += n;
				}, 0);

				if(o.type == "Buy"){
					stock.currentBids.some((bid, i) => {
						index = i;

						return bid.orderID == id;
					});

					stock.currentBids.pull(stock.currentBids[index]._id);

					res.user.balance += (unfulfilled * o.sharePrice);
				} else{
					sell = true;

					stock.currentAsks.some((ask, i) => {
						index = i;

						return ask.orderID == id;
					});

					stock.currentAsks.pull(stock.currentAsks[index]._id);

					res.user.shares.some((share, i) => {
						if(share.stock == o.stock){
							res.user.shares[i].amount += unfulfilled;
						}

						return share.stock == o.stock;
					});
				}

				stock.save(function(re,s){
					res.user.save(function(ree,u){
						res.status(200).json({symbol: o.stock, amt: unfulfilled, sell: sell});
					});
				});
			});
		});
	});
}

function updateSub(req,res,next){
	let stock = req.body.stock;
	let change = req.body.change;
	let active = req.body.active;

	Subscription.findOne({symbol: stock}).exec(function(err,result){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load user");
			return;
		}

		result.active = active;
		result.change = change;

		result.save(function(e,result){
			if(e){
				console.log(err);
				res.status(500).send("Cannot load user");
				return;
			}

			res.status(200).send("Success");
		});
	});
}

function removeStock(req,res,next){
	let symbol = req.body.symbol;
	let index;

	if(symbol){
		res.list.stocks.some((stock, i) => {
			index = i;

			return stock === symbol;
		});

		res.list.stocks.splice(index, 1);

		res.user.watchlists[res.listIndex] = res.list;

		res.user.save(function(err,result){
			if(err){
				console.log(err);
				res.status(500).send("Cannot load user");
				return;
			}
	
			res.status(200).json({list: result.watchlists[res.listIndex]});
		});
	}
}

function delSub(req,res,next){
	let stock = req.body.stock;
	
	Subscription.findOneAndRemove({symbol: stock}).exec(function(err, result){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load user");
			return;
		}

		res.status(200).json({subs: result});
	});
}

function delList(req,res,next){
	let name = req.body.listName;
	let index;

	res.user.watchlists.some((list, i) => {
		index = i;

		return list.name === name;
	});

	res.user.watchlists.pull(res.user.watchlists[index]._id);

	res.user.save(function(err, result){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load user");
			return;
		}

		res.status(200).json({lists: result.watchlists});
	});
}

function loadList(req,res,next){
	let name = req.params.listName;
	let index;

	let lExts = res.user.watchlists.some((list,i) => {
		index = i;
		return list.name === name;
	});

	if(lExts){
		res.list = res.user.watchlists[index];
		res.listIndex = index;
		next();
	} else{
		res.status(404).render("./pages/404", {message: "This page does not exist."});
	}
}

function sendList(req,res,next){
	res.format({
		"text/html": () => { res.render("./pages/list", { user: res.user, session: req.session, list: res.list, stocks: res.stocks }); },
		"application/json": () => { res.status(200).json(res.stocks); }
	});
}

function depositAmt(req,res,next){
	let amount = req.body.amount;

	res.user.deposit(amount, function(err,result){
		if(err){
			console.log(err);
			res.status(400).send(err);
		}

		res.status(200).json({balance: result.balance});
	});
}

function	withdrawAmt(req,res,next){
	let amount = req.body.amount;

	res.user.withdraw(amount, function(err,result){
		if(err){
			console.log(err);
			res.status(400).send(err);
		}

		res.status(200).json({balance: result.balance});
	});
}

function loadUser(req,res,next){
	let id = req.params.uid;

	if(id != req.session.userId && req.method == "GET"){
		res.status(401).render("./pages/unauthorized", {message: "You are not authorized to view this profile.", session: req.session});
	}

	User.findById(id).exec(function(err,user){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load user");
			return;
		}

		res.user = user;
		next();
	});
}

function loadOrders(req,res,next){
	Order.find({type: "Buy", buyers: res.user.username, cancelled: false, complete: false}).exec(function(err,buys){
		Order.find({type: "Sell", sellers: res.user.username, cancelled: false, complete: false}).exec(function(err2,sells){
			res.orders = {
				buys: buys,
				sells: sells
			};
			next();
		});
	});
}

function loadStocks1(req,res,next){
	if(res.user.shares.length > 0){
		for(let i = 0; i < res.user.shares.length; i++){
			Stock.findOne({symbol: res.user.shares[i].stock}).exec(function(err,stock){
				if(err){
					console.log(err);
					res.status(500).send("Cannot load user");
					return;
				}
		
				res.user.shares[i].price = (stock.currentPrice);

				if(i == res.user.shares.length-1){
					next();
				}
			});
		}
	} else{
		next();
	}
}

function loadStocks2(req,res,next){
	let stocks = [];

	if(res.list.stocks.length > 0){
		for(let i = 0; i < res.list.stocks.length; i++){
			Stock.findOne({symbol: res.list.stocks[i]}).exec(function(err,stock){
				if(err){
					console.log(err);
					res.status(500).send("Cannot load user");
					return;
				}
		
				stocks.push(stock);
				// res.user.shares[i].price = (stock.currentPrice);

				if(i == res.list.stocks.length-1){
					res.stocks = stocks;
					next();
				}
			});
		}
	} else{
		next();
	}
}

function loadSubcriptions(req,res,next){
	let username = res.user.username;

	Subscription.find({user: username}).exec(function(err,result){
		if(err){
			console.log(err);
			res.status(500).send("Cannot load user");
			return;
		}

		res.subscriptions = result;
		next();
	});
}

function sendUser(req,res,next){
	res.format({
		"text/html": () => { res.render("./pages/user", { user: res.user, session: req.session, subscriptions: res.subscriptions, orders: res.orders }); },
		"application/json": () => { res.status(200).json(res.user); }
	});
}


module.exports = router;