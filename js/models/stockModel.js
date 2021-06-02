const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectID = Schema.Types.ObjectId;

let offerModel = new Schema({
	price: Number,
	amount: Number,
	orderID: ObjectID,
	user: String
});

let stockModel = new Schema({
	symbol: {
		type: String,
		required: true
	},
	currentPrice: {
		type: Number,
		required: true
	},
	total: {
		type: Number,
		required: true
	},
	available: {
		type: new Schema({
			ipo: { type: Number },
			sellers: { type: Number }
		}),
		required: true
	},
	currentBids: [offerModel],
	currentAsks : [offerModel],
	closingPrice: [Number],
	dailyHigh: [Number],
	dailyLow: [Number],
	sharesTraded: [Number]
}, { typePojoToMixed: false });

stockModel.methods.newHigh = function(callback){
	let i = this.dailyHigh.length - 1;
	if(this.currentPrice > this.dailyHigh[i]){
		this.dailyHigh.set(i, this.currentPrice);
		this.save();
		return this;
	}
	if(callback)
		callback("Price not changed.");
}

stockModel.methods.newLow = function(callback){
	let i = this.dailyHigh.length - 1;
	if(this.currentPrice < this.dailyLow[i]){
		this.dailyLow.set(i, this.currentPrice);
		this.save();
		return this;
	}

	if(callback)
		callback("Price not changed.");
}

module.exports = mongoose.model("Stock", stockModel);