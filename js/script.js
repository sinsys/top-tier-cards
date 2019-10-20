/************* GLOBAL STORED INFO ***************/

const STORE = {
	apiUrl: "https://arcane-ocean-08754.herokuapp.com/"
}


/************* COMMONLY USED DATA CALCULATION FUNCTIONS ***************/

const helpers = {
	// Return how many items are in a given array
	getCount: function(arr, set){
		return arr.filter(len => set.has(len)).length
	},
	// Sort multiple arrays utilizing getCount
	sortOnCount: function(data, arr){
		let set = new Set(arr);
		return data.slice(0).sort((a,b) => helpers.getCount(b, set) - helpers.getCount(a, set))
	},
	// Converting an object that used the card ID as keys to an array for sorting purposes
	convertToArray: function(obj){
		const arr = [];
		for(let card in obj){
			if(obj[card].useRate > 1){ arr.push(obj[card]); }
		}
		return arr;
	},
	// Sort an array of numbers (used for any numeric sorts we need to do)
	sortArr: function(arr, sortBy){
		arr.sort(function(a,b){
			return b[sortBy] - a[sortBy];
		})
	},
	// Calculates the win and usage percentages based on the current data provided
	calcPercs: function(data, battles){
		for(let card in data){
			data[card].winPerc = ((data[card].winCount / data[card].useRate) * 100).toFixed(2);
			data[card].useRate = ((data[card].useRate / battles) * 100).toFixed(2);
		}
		return data;
	},
	// Convert large response into small array of player tags
	setPlayerArr: function(players){
		let playerArr = [];
		players.forEach(player => {
			if(basePlayers < base){
				playerArr.push(player.tag);
			}
		})
		return playerArr;
	},
	// Convert deck link into array of card IDs and sort the numerical values
	// Might need debugging for different ID lengths
	makeDeckStorage: function(deck){
		return deck.split("deck=")[1].split(";").sort().map(card => Number(card));
	},
	// Finds all decks that contain a specific card
	findDecks: function(card, decks){
		let tmpDecks = [];
		decks.forEach(deck => {
			if(deck.includes(card)) { tmpDecks.push(deck) }
		})
		return tmpDecks;
	},
	// Remove duplicates from large storage of deck links
	removeDeckDupes: function(data){
		return Array.from(new Set(data.map(JSON.stringify)), JSON.parse);
	}
}

// Sorting array based on common values
// console.log(helpers.sortOnCount(data, arr));


/************* API CALLS AND EXTERNAL QUERIES ***************/

// Queries the top 1000 players in the game (within last 10 minutes)
function queryPlayers() {
	// Admin log to ensure function is called
	console.log("Querying top players...");
	return fetch(STORE.apiUrl)
		.then(res => { 
			if(res.ok){ return res.json() }
			else { // insert 3 attempt call here then throw catch
			}
		})
		.then(playerTags => { 
			// Top 1000 players returned
			return playerTags;
		})
		.catch(err => console.log(err))
}

// Queries an individual player's last 25 battles
function queryPlayerData(player){
	// Admin log to ensure function is called
	// console.log("Querying player " + player + "...");
	return fetch(STORE.apiUrl + "battles/" + player)
		.then(res => {
			if(res.ok){ return res.json() }
			else { // insert 3 attempt call here then throw catch}
			}
		})
		.then(playerData => {
			// Player battle data returned
			return playerData;
		})
		.catch(err => console.log(err));
}

/************* DATA CALCULATIONS FOR DOM PURPOSES ***************/

// Main function to do calculations on all of the data we received
function calculateNewData(data){
	// We will be tracking all battles, all decks, and all cards used in those decks
	let battles = 0;
	let topCards = [];
	let CARDS = {};
	let DECKS = [];
	data.forEach(battle => {
		// Ensure only ladder battles are calculated. Many other modes exist that would skew the results
		if(battle.type == "PvP"){
			// Increase total battle count for UI use
			battles++;
			/* Utilize a function to strip the deck link into an array of just card IDs
			   We sort these IDs to avoid the same decks in a different order
			   We delete the duplicates of the same decks after the sort */
			DECKS.push(helpers.makeDeckStorage(battle.team[0].deckLink));
			// Look through all cards in each ladder deck
			battle.team[0].deck.forEach(card => {
				// If the card does not exist in our CARDS object, add it with relevant data
				!(card.id in CARDS) && (CARDS[card.id] = { 
					name: card.name,
					cardImg: card.icon,
					id: card.id,
					useRate: 0,
					winCount: 0,
					winPerc: 0
				})
				// If the card does exist, add useRate and winCount so we can calculate data later
				CARDS[card.id].useRate+=1;
				if(battle.winner == 1){
					CARDS[card.id].winCount+=1;
				}
			})
		}
	})
	// Calculate percentages for UI use of winRate and useRate
	helpers.calcPercs(CARDS, battles);
	// Sort cards based on the winRate
	let cardsArr = helpers.convertToArray(CARDS);
	helpers.sortArr(cardsArr, "winPerc");
	// Remove duplicates and sort the decks that won
	DECKS = helpers.removeDeckDupes(DECKS);
	// Display the cards to the DOM and store the top cards
	topCards = $renderCards(cardsArr);

	// Returning data to a semi global object for deck lookups

	return {
		decks: DECKS,
		cards: CARDS,
		topCards: topCards
	}
}


/************* ALL DOM RELATED FUNCTIONS ***************/

// Displays the card icons
function $renderCards(cards){
	// Number of top cards to display
	let counter = 16;
	let topCards = [];
	// Empty the container in case we refresh
	$('#clash-cards').empty();
	// Loop through the array of cards to render applicable data
	cards.forEach(card => {
		// If the counter hits 0, stop displaying cards
		if(counter > 0){
			topCards.push(card.id);
			// Basic DOM object we create and appending info to it
			let $card = $('<div class="card">');
			$card.append(`<h4>${card.name}</h4>`);
			$card.append(`<img class="app-card" data-id="${card.id}" src="${card.cardImg}" alt="${card.name}">`);
			$card.append(`<p class="percent">${card.winPerc}%</p>`);
			$card.append(`<p class="use-rate">${card.useRate}%</p>`);
			// Render the card to the DOM
			$('#clash-cards').append($card);
			// Remove one from the counter (if 0, stop rendering)
			counter--;
		}
	})
	return topCards;
}

// Update DOM on newest data
function $refreshData(data, total){
	$('.current-battle-data').text(`Displaying ${total} battles. More battles will be calculated in the background. You can use the refresh button at any time to refresh the page with updated info.`);
	return calculateNewData(data);
}

// This controls the color, size, and progression of the progress bar
function $updateProgressBar(percent){
	if(percent < 40) {
		$(".meter > span").each(function() {
		  $(this).css('width', percent + "%");
		  $(this).removeClass().addClass('orange');
		});				
	} else if (percent < 80){
		$(".meter > span").each(function() {
		  $(this).css('width', percent + "%");
		  $(this).removeClass().addClass('green');
		});				
	} else if (percent >= 100){
		$(".meter > span").each(function() {
		  $(this).addClass('green').css('width', '100%');
		});			
	}
}

function $renderDecks(decks, cardData){
	let counter = 10;
	let $allDecksWrapper = $('<div>').addClass('all-decks-wrapper');
	decks.forEach(deck => {
		if(counter > 0){
			let $deckWrapper = $('<div>').addClass('deck-wrapper');
			deck.forEach(card => {
				$deckWrapper.append(`<img class="card-thumb" src="${cardData[card].cardImg}">`);
			})
			let baseUrl = "https://link.clashroyale.com/deck/en?deck=";
			$deckWrapper.append(`<a href="${baseUrl + deck.join(";")}">Deck Link</a>`);
			$allDecksWrapper.append($deckWrapper);
			counter--;	
		}

	})
	return $allDecksWrapper;
}

// Animates initial load of progress bar
function $animateProgressBar(){
	$(".meter > span").each(function() {
	  $(this)
	    .data("origWidth", $(this).width())
	    .width(0)
	    .animate({
	      width: $(this).data("origWidth") // or + "%" if fluid
	    }, 1200);
	});	
}






// CORE FUNCTION OF THIS APP
/* We will be calling almost all of our functions in this function
   This will only be called once and should execute everything we want to accomplish */
function queryData(){
	// Let user know the status (will convert this to a function)
	$('.status-message').text("Querying top players...");
	// We are finding all of the top 1000 players
	queryPlayers().then(data => {
		// Establish all "global" variables we'll need to define to use calculative data
		let allBattles = []; 
		let allDecks = [];
		let calcData = {};
		// This can be changed from 1-1000. Ideal is 200 for production
		let max = 200;
		// This tracks how many promises are returned
		let completedQueries = 0;
		// This is used as an index for the current call
		let current = 0;
		// This is a variable used for initial display of data
		// Once we hit a threshold, this turns false and the user is forced to press "refresh" for more data
		let initRender = false;
		/* We have rate limiting on our API of 50 req/sec
		   Considering we call the API 200 times, I set
		   an interval of 1 call per 1 second to avoid any
		   trouble in the future of multiple people accessing
		   the site */
	    let playerQueryLimiting = setInterval(function () {
	    	// If our current player query is less than the max we want to call
	    	console.log("Querying individual players...");
	    	if(current < max - 1){
	    		// Update the status to let the user know queries are still occuring... even if no data is coming back
	    		$('.status-message').text(`Querying player #${data[current].tag}...`);
	    		// Query an individual player
		        queryPlayerData(data[current].tag)
		        	.then(battleData => {
		        		// Add all returned battles from a single player query to our allBattles
		        		battleData.forEach(battle => {
		        			allBattles.push(battle)
		        			allDecks.push(helpers.makeDeckStorage(battle.team[0].deckLink))
		        		})
		        		// Update UI to tell user how much data is collected
		        		$('.total-battle-data').text('Total data collected: ' + allBattles.length);
		        		// Increase our Promise resolution count
		        		completedQueries++;
		        		/* Update the progress bar (we assume 10 battles is enough to display data)
		        		   Hence we use the completed Promises * 10 to pass in 10% for every promise completed */
		        		$updateProgressBar(completedQueries*10);
		        		// If the results aren't rendered AND the queries ARE 10 or more
				        if(!initRender && completedQueries >= 10){
				        	// We set this so this condition never happens until user hits Refresh
				        	initRender = true;
				        	// We render the data
				        	calcData = $refreshData(allBattles, allBattles.length);
				        }

	    	})
	    	} else {
	    		// We sent every query we wanted to. Alert the user
	    		$('.status-message').text("All queries sent");
	    		// We kill the setInterval so it stops querying
	    		clearTimeout(playerQueryLimiting);
	    	}
	    	// No matter what, the current should always increase if this function keeps getting called.
	        current++;
	    }, 1000);
	    // We have an event handler to allow a button click to utilize our allBattles and allDecks data
	    $('#refresh-data-btn').on('click', function(){
	    	calcData = $refreshData(allBattles, allBattles.length);
	    })
	    $('#clash-cards').on('click', '.app-card', function(){
	    	let validCards = calcData.topCards;
	    	let validDecks = calcData.decks;
	    	let sortedDecks = helpers.sortOnCount(validDecks, validCards);
	    	let deckLinks = helpers.findDecks($(this).data('id'), sortedDecks);
	    	$('#deck-links').empty().append($renderDecks(deckLinks, calcData.cards));
		});

	})
}


// DOM is ready
// Need to translate this into other functions for readability
$(function(){
	let STORE = {};

	$('#blue2').on('click', function(){
		$('.get-data-wrapper').fadeOut(500, function(){
			queryData();
			$('.app-status-wrapper').fadeIn(500);

		})
	})
});

