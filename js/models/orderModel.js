const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let orderModel = new Schema({
	sellers: [String],
	buyers: [String],
	stock: {
		type: String, //Schema.Types.ObjectId,
		required: true
	},
	amount: {
		type: Number,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	sharePrice: {
		type: Number,
		required: true
	},
	partFulfilled: [Number],
	openDate: {
		type: Number,
		required: true
	},
	completedDate: Number,
	complete: {
		type: Boolean,
		required: true
	},
	expires: {
		type: Boolean,
		required: true
	},
	cancelled: {
		type: Boolean,
		required: true
	}
});

module.exports = mongoose.model("Order", orderModel);