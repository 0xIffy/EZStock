const mongoose = require("mongoose");
const Subscription = require("./models/subscriptionModel");
const User = require("./models/userModel");
const Order = require("./models/orderModel");
const Stock = require("./models/stockModel");

const graphql = require("graphql");
const { 
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLID,
	GraphQLString,
	GraphQLInt,
	GraphQLList,
	GraphQLFloat,
	GraphQLBoolean
} = graphql;

const SharesType = new GraphQLObjectType({
	name: "Shares",
	fields: () => ({
		stock: { type: GraphQLString },
		amount: { type: GraphQLInt },
		avgPrice: {type: GraphQLFloat }
	})
});

const WatchlistType = new GraphQLObjectType({
	name: "WatchList",
	fields: () => ({
		name: { type: GraphQLString },
		stocks: { type: GraphQLList(GraphQLString) },
	})
});

const UserType = new GraphQLObjectType({
	name: "User",
	fields: () => ({
		id: { type: GraphQLID },
		username: { type: GraphQLString },
		balance: { type: GraphQLFloat },
		isAdmin:{ type: GraphQLBoolean },
		shares: { type: GraphQLList(SharesType) },
		watchlists: { type: GraphQLList(WatchlistType) },
		subscriptions: {
			type: new GraphQLList(SubscriptionType),
			resolve(parent,args){
				return Subscription.find({user: parent.username});
			}
		},
		orders: {
			type: new GraphQLObjectType({
				name: "Orders",
				fields: () => ({
					buys: { type: GraphQLList(OrderType) },
					sells: { type: GraphQLList(OrderType) }
				})
			}),
			resolve(parent,args){
				let buys = Order.find({buyers: parent.username, type: "Buy"});
				let sells = Order.find({sellers: parent.username, type: "Sell"});
				return {buys: buys, sells: sells};
			}
		}
		// transactions: { type: GraphQLList }
	})
});

const OfferType = new GraphQLObjectType({
	name: "Offer",
	fields: () => ({
		price: { type: GraphQLFloat },
		amount: { type:GraphQLInt }
	})
});

const StockType = new GraphQLObjectType({
	name: "Stock",
	fields: () => ({
		id: { type: GraphQLID },
		symbol: { type: GraphQLString },
		currentPrice: { type: GraphQLFloat },
		total: { type: GraphQLInt },
		currentBids: { type: GraphQLList(OfferType) },
		currentAsks : { type: GraphQLList(OfferType) },
		closingPrice: { type: GraphQLList(GraphQLFloat) },
		dailyHigh: { type: GraphQLList(GraphQLFloat) },
		dailyLow: { type: GraphQLList(GraphQLFloat) },
		sharesTraded: { type: GraphQLList(GraphQLInt) }
	})	
});

const OrderType = new GraphQLObjectType({
	name: "Order",
	fields: () => ({
		id: { type: GraphQLID },
		sellers: { type: GraphQLList(GraphQLString) },
		buyers: { type: GraphQLList(GraphQLString) },
		stock: { type: GraphQLString },
		amount: { type: GraphQLInt },
		type: { type: GraphQLString },
		sharePrice: { type: GraphQLFloat },
		partFulfilled: { type: GraphQLList(GraphQLInt) },
		openDate: { type: GraphQLString },
		completedDate: {type: GraphQLString },
		complete: { type: GraphQLBoolean },
		expires: { type: GraphQLBoolean },
		cancelled: { type: GraphQLBoolean }
	})
});

const SubscriptionType = new GraphQLObjectType({
	name: "Subscription",
	fields: () => ({
		id: { type: GraphQLID },
		symbol: { type: GraphQLString },
		user: { type: GraphQLString },
		trigger: { type: GraphQLString },
		change: { type: GraphQLFloat },
		active: { type: GraphQLBoolean	},
		startValue: { type: GraphQLFloat },
		stock: { 
			type: StockType,
			resolve(parent,args){
				return StockType.findOne({symbol: parent.symbol});
			}
		 }
	})
});

const RootQuery = new GraphQLObjectType({
	name: "RootQueryType",
	fields: {
		user: {
			type: UserType,
			args: { 
				username: { type: GraphQLString },
				id: { type: GraphQLID }
			},
			resolve(parent, args){
				if(args.username){
					return User.findOne({username: args.username});
				} else if(args.id){
					return User.findById(args.id);
				}
			}
		},
		stocks: {
			type: GraphQLList(StockType),
			args: { 
				symbol: {	type: GraphQLString },
				minPrice: { type: GraphQLFloat },
				maxPrice: { type: GraphQLFloat }

			},
			resolve(parent,args){
				let priceConstraints = args.maxPrice ? {$gte: args.minPrice, $lte: args.maxPrice} : {$gte: args.minPrice};

				return Stock.find({symbol: new RegExp(args.symbol, "i"), currentPrice: priceConstraints});
			}
		},
		stock: {
			type: StockType,
			args: { 
				symbol: {	type: GraphQLString },
				startday: { type: GraphQLString },
				endday: { type: GraphQLString }
			},
			resolve(parent,args){
				return Stock.findOne({symbol: new RegExp(args.symbol, "i")});
			}
		}
	}
});

const Mutation = new GraphQLObjectType({
	name: "Mutation",
	fields: {
		deposit: {
			type: UserType,
			args: {
				uid: { type: GraphQLID },
				amount: { type: GraphQLFloat }
			},
			async resolve(parent, args){
				await User.findById(args.uid, function(err,u){
					u.deposit(args.amount);
				});
				return User.findById(args.uid);
			}
		},
		withdraw: {
			type: UserType,
			args: {
				uid: { type: GraphQLID },
				amount: { type: GraphQLFloat }
			},
			async resolve(parent, args){
				await User.findById(args.uid, function(err,u){
					u.withdraw(args.amount);
				});

				return User.findById(args.uid);
			}
		}
	}
})

module.exports = new GraphQLSchema({
	query: RootQuery,
	mutation: Mutation
});