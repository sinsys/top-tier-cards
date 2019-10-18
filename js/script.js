// Queries the top 1000 players in the game (within last 10 minutes)
function queryPlayers() {
	// Admin log to ensure function is called
	console.log("Querying players...");
	return fetch("https://arcane-ocean-08754.herokuapp.com")
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
	console.log("Querying player " + player + "...");
	return fetch("https://arcane-ocean-08754.herokuapp.com/battles/" + player)
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

// Main function to do calculations on all of the data we received
function calculateNewData(data){
	// We will be tracking all battles, all decks, and all cards used in those decks
	let battles = 0;
	const CARDS = {};
	const DECKS = [];
	// What to do with each battle
	data.forEach(battle => {
		// Ensure only ladder battles are calculated. Many other modes exist that would skew the results
		if(battle.mode.name == "Ladder"){
			// Increase total battle count for UI use
			battles++;
			/* Utilize a function to strip the deck link into an array of just card IDs
			   We sort these IDs to avoid the same decks in a different order
			   We delete the duplicates of the same decks after the sort */
			DECKS.push(makeDeckStorage(battle.team[0].deckLink));
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
	calcPercs(CARDS, battles);
	// Sort cards based on the winRate
	let cardsArr = convertToArray(CARDS);
	sortArr(cardsArr, "winPerc");
	// Remove duplicates and sort the decks that won
	removeDeckDupes(DECKS);
	console.log(DECKS);
	// Display the cards to the DOM
	$renderCards(cardsArr);
}

// Converting an object that used the card ID as keys to an array for sorting purposes
function convertToArray(obj){
	const arr = [];
	for(let card in obj){
		if(obj[card].useRate > 1){ arr.push(obj[card]); }
	}
	return arr;
}

// Sort an array of numbers (used for any numeric sorts we need to do)
function sortArr(arr, sortBy){
	arr.sort(function(a,b){
		return b[sortBy] - a[sortBy];
	})
}

// Calculates the percentages based on the current data provided
function calcPercs(data, battles){
	for(let card in data){
		data[card].winPerc = ((data[card].winCount / data[card].useRate) * 100).toFixed(2);
		data[card].useRate = ((data[card].useRate / battles) * 100).toFixed(2);
	}
	return data;
}

// Displays the card icons
function $renderCards(cards){
	// Number of top cards to display
	let counter = 16;
	// Empty the container in case we refresh
	$('#clash-cards').empty();
	// Loop through the array of cards to render applicable data
	cards.forEach(card => {
		// If the counter hits 0, stop displaying cards
		if(counter > 0){
			// Basic DOM object we create and appending info to it
			let $card = $('<div class="card">');
			$card.append(`<h4>${card.name}</h4>`);
			$card.append(`<img src="${card.cardImg}" alt="${card.name}">`);
			$card.append(`<p class="percent">${card.winPerc}%</p>`);
			$card.append(`<p class="use-rate">${card.useRate}%</p>`);
			// Render the card to the DOM
			$('#clash-cards').append($card);
			// Remove one from the counter (if 0, stop rendering)
			counter--;
		}

	})
}

// Convert large response into small array of player tags
function setPlayerArr(players){
	let playerArr = [];
	players.forEach(player => {
		if(basePlayers < base){
			playerArr.push(player.tag);
		}
	})
	return playerArr;
}

// Convert deck link into array of card IDs and sort the numerical values
// Might need debugging for different ID lengths
function makeDeckStorage(deck){
	return deck.split("deck=")[1].split(";").sort();
}

// Remove duplicates from large storage of deck links
function removeDeckDupes(data){
	let tempArr = [];
	let compare = data.filter(function (i) {
	    if (tempArr.indexOf(i.toString()) < 0) {
	        tempArr.push(i.toString());
	        return i;
	    }
	});
	return tempArr;
}

// Update DOM on newest data
function $refreshData(data, total){
	calculateNewData(data);
	$('.current-battle-data').text(`Displaying ${total} battles. More battles will be calculated in the background. You can use the refresh button at any time to refresh the page with updated info.`);
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
		// This can be changed from 1-1000. Ideal is 200 for production
		let max = 30;
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
	    	if(current < max){
	    		// Update the status to let the user know queries are still occuring... even if no data is coming back
	    		$('.status-message').text(`Querying player #${data[current].tag}...`);
	    		// Query an individual player
		        queryPlayerData(data[current].tag)
		        	.then(battleData => {
		        		// Add all returned battles from a single player query to our allBattles
		        		battleData.forEach(battle => {
		        			allBattles.push(battle)
		        		})
		        		// Update UI to tell user how much data is collected
		        		$('.total-battle-data').text('Total data collected: ' + allBattles.length);
		        		// Increase our Promise resolution count
		        		completedQueries++;
		        		/* Update the progress bar (we assume 10 battles is enough to display data)
		        		   Hence we use the completed Promises * 10 to pass in 10% for every promose completed */
		        		updateProgressBar(completedQueries*10);
		        		// If the results aren't rendered AND the queries ARE 10 or more
				        if(!initRender && completedQueries >= 10){
				        	// We set this so this condition never happens until user hits Refresh
				        	initRender = true;
				        	// We render the data
				        	$refreshData(allBattles, allBattles.length);
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
	    	$refreshData(allBattles, allBattles.length);
	    	console.log(allDecks);
	    })
	})
}

// This controls the color, size, and progression of the progress bar
function updateProgressBar(percent){
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

// DOM is ready
// Need to translate this into other functions for readability
$(function(){
	$('#blue2').on('click', function(){
		$('.get-data-wrapper').fadeOut(500, function(){
			$('.app-status-wrapper').fadeIn(500);
			queryData();
			$(".meter > span").each(function() {
			  $(this)
			    .data("origWidth", $(this).width())
			    .width(0)
			    .animate({
			      width: $(this).data("origWidth") // or + "%" if fluid
			    }, 1200);
			});	
		})
	})
});

