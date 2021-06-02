const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let notificationModel = new Schema({
	message: {
		type: String,
		required: true
	},
	user: {
		type: Schema.Types.ObjectId,
		required: true
	},
	read: {
		type: Boolean,
		required: true
	}
});

module.exports = mongoose.model("Notification", notificationModel);