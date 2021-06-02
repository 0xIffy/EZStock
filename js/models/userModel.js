const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let shareModel = new Schema({
	stock: String,
	amount: Number,
	avgPrice: [{
		amt: Number,
		prc: Number
	}]
});

let watchtlistModel = new Schema({
	name: String,
	stocks: [String]
});

let subscriptionModel = new Schema({
	stock: String,
	change: Number,
	active: Boolean
});

let userModel = new Schema({
	username: {
		type: String,
		required: true
	},
	passwordHash: {
		type: String,
		required: true
	},
	balance: {
		type: Number,
		required: true
	},
	isAdmin:{
		type: Boolean,
		required: true
	},
	shares: [shareModel],
	watchlists: [watchtlistModel],
	// subscriptions: [subscriptionModel]
});

userModel.methods.withdraw = function(amount, callback){
	if(this.balance >= amount && amount > 0){
		this.balance -= amount;
		this.save(callback);
		return this;
	}
	callback("Balance is too low to withdraw $" + amount + ".");
};

userModel.methods.deposit = function(amount, callback){
	if(amount > 0){
		this.balance += amount;
		this.save(callback);
		return this;
	}
	callback("You cannot deposit a negative amount.");
}

module.exports = mongoose.model("User", userModel);