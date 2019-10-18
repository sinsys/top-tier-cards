function queryPlayers() {
	console.log("Querying players...");
	return fetch("https://arcane-ocean-08754.herokuapp.com")
		.then(res => { 
			if(res.ok){ return res.json() }
			else { // insert 3 attempt call here then throw catch
			}
		})
		.then(playerTags => { 
			console.log(playerTags);
			return playerTags;
		})
		.catch(err => console.log(err))
}

function queryPlayerData(player){
	console.log("Querying player " + player + "...");
	return fetch("https://arcane-ocean-08754.herokuapp.com/battles/" + player)
		.then(res => {
			if(res.ok){ 

				return res.json() 
			}
		})
		.then(playerData => {
			console.log(playerData);
			return playerData;
		})
		.catch(err => console.log(err));
}

function calculateNewData(data){
	let battles = 0;
	const CARDS = {};
	const DECKS = [];
	data.forEach(battle => {
		if(battle.mode.name == "Ladder"){
			battles++;
			DECKS.push(makeDeckStorage(battle.team[0].deckLink));
			battle.team[0].deck.forEach(card => {
				!(card.id in CARDS) && (CARDS[card.id] = { 
					useRate: 0,
					winCount: 0,
					winPerc: 0
				})
				CARDS[card.id].name = card.name;
				CARDS[card.id].cardImg = card.icon;
				CARDS[card.id].useRate+=1;
				CARDS[card.id].id = card.id;
				if(battle.winner == 1){
					CARDS[card.id].winCount+=1;
				}
			})
		}
	})
	calcPercs(CARDS, battles);
	let cardsArr = convertToArray(CARDS);
	sortArr(cardsArr, "winPerc");
	console.log(cardsArr);

	console.log(removeDeckDupes(DECKS));
	$renderCards(cardsArr);
}

function convertToArray(obj){
	const arr = [];
	for(let card in obj){
		if(obj[card].useRate > 1){ arr.push(obj[card]); }
	}
	return arr;
}

function sortArr(arr, sortBy){
	arr.sort(function(a,b){
		return b[sortBy] - a[sortBy];
	})
}

function calcPercs(data, battles){
	for(let card in data){
		data[card].winPerc = ((data[card].winCount / data[card].useRate) * 100).toFixed(2);
		data[card].useRate = ((data[card].useRate / battles) * 100).toFixed(2);
	}
	return data;
}
function $renderCards(cards){
	let counter = 16;
	$('#clash-cards').empty();
	cards.forEach(card => {
		if(counter > 0){
			let $card = $('<div class="card">');
			$card.append(`<h4>${card.name}</h4>`);
			$card.append(`<img src="${card.cardImg}" alt="${card.name}">`);
			$card.append(`<p class="percent">${card.winPerc}%</p>`);
			$card.append(`<p class="use-rate">${card.useRate}%</p>`);

			$('#clash-cards').append($card);
			counter--;
		}

	})
}
function setPlayerArr(players, base){
	let playerArr = [];
	let basePlayers = 0;
	players.forEach(player => {
		if(basePlayers < base){
			playerArr.push(player.tag);
			basePlayers++;
		}
	})
	return playerArr;
}
function makeDeckStorage(deck){
	return deck.split("deck=")[1].split(";").sort();
}
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
function $refreshData(data, total){
	calculateNewData(data);
	$('.current-battle-data').text(`Displaying ${total} battles. More battles will be calculated in the background. You can use the refresh button at any time to refresh the page with updated info.`);
}

function queryData(){
	$('.status-message').text("Querying top players...");
	queryPlayers().then(data => {
		let allBattles = []; 
		let allDecks = [];
		let max = 30;
		let completedQueries = 0;
		let current = 0;
		let initRender = false;
	    let playerQueryLimiting = setInterval(function () {
	    	if(current < max){
	    		$('.status-message').text(`Querying player #${data[current].tag}...`);
		        queryPlayerData(data[current].tag)
		        	.then(battleData => {
		        		battleData.forEach(battle => {
		        			allBattles.push(battle)
		        		})
		        		$('.total-battle-data').text('Total data collected: ' + allBattles.length);
		        		completedQueries++;
		        		updateProgressBar(completedQueries*10);
				        if(!initRender && completedQueries >= 10){
				        	console.log("Initial Complete");
				        	initRender = true;
				        	$refreshData(allBattles, allBattles.length);
				        }
		        })
	    	} else {
	    		$('.status-message').text("All queries sent");
	    		clearTimeout(playerQueryLimiting);
	    	}
	        current++;
	    }, 1000);
	    $('#refresh-data-btn').on('click', function(){
	    	$refreshData(allBattles, allBattles.length);
	    	console.log(allDecks);
	    })
	})
}
function calculateProgressPercent(total){

}
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

