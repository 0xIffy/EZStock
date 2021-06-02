const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let subscriptionModel = new Schema({
	symbol: {
		type: String,
		required: true
	},
	user: {
		type: String,
		required: true
	},
	triggered: {
		type: Boolean,
		required: true
	},
	change: {
		type: Number,
		required: true
	},
	active: {
		type: Boolean,
		required: true
	},
	startValue: {
		type: Number,
		required: true
	}
});

module.exports = mongoose.model("Subscription", subscriptionModel);