Name: Braeden Hall
Student #: 101143403
Project: Stock Market

Files:
- js/
	- models/
		- orderModel.js (structure of what an order looks like in the db)
		- stockModel.js (structure of what an stock looks like in the db)
		- subscriptionModel.js (structure of what an subscription looks like in the db)
		- userModel.js (structure of what an user looks like in the db)
		- notificationModel.js (structure of what an notification looks like in the db)
	- routes/
		- stockRouter.js (controls the logic of all routes throuh the api that start with /stock)
		- userRouter.js (controls the logic of all routes throuh the api that start with /user)
	- databaseInitializer.js (initializes the database and fills it with some dummy data)
	- server.js (handles the main server logic for the entire project)
	- stockReader.js (reads the symbols.txt file and creates a stock object for each symbol)
	- graphqlSchema.js (schema for how graphql queries work for the graphql api)
- public/
	- css/
		- navbar.css (contins all styling relevant to the navbar)
		- stocks.css (caontains all css relevant to the stock search page)
	- js/
		- index.js (contains functions to do with incrementing the day as an admin on the client side)
		- login.js (sends an AJAX post request to the server that allows a user to login)
		- register.js (same as login but allows user to create new account)
		- stock.js (contains functions associated with actions that can be done on an individual stock page)
		- stocks.js (sends AJAX get request to the server for an updated list of stocks based on search criteria)
		- user.js handles logic for all actions on the user profile page)
		- list.js (handles logic to do with updating watchlists)
		- notifs.js (handles logic for displaying notifications)
- views/
	- partials/
		- bootstrap.ejs (list of cdn's required for the use of bootstrap on pages)
		- header.ejs (div containg header information)
		- subscriptionModal.ejs (the subscription modal that appears on the user profile page)
	- pages/
		- index.ejs (html for rendering the index page)
		- login.ejs (html for rendering the login page)
		- register.ejs (html for rendering the registration page)
		- stock.ejs (html for rendering the stock page)
		- stock.ejs (html for rendering the stock page)
		- stocks.ejs (html for rendering the stock list page)
		- unauthorized.ejs (page rendered when user tries to access a page without proper authorization)
		- 404.ejs (page shown when a page cannot be found)
		- kick.ejs (page displayed when your session times out)
		- list.ejs (page rendered when view a specific watchlist)
		- unauthorized.ejs (page displayed if you try to acces a page you are not authorized to)

