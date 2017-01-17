/**
 * Created by Jack on 14-Sep-16.
 */
var express = require('express');
var router = express.Router();
var passport = require('passport');
var https = require('http');
var request = require('request');
var striptags = require('striptags');
var plotly = require('plotly')("jackchappell10", "t34rm89o4m");

router.get('/', function(req, res){
    if (!req.user) {
        //user isnt logged in and they shouldnt be here. take them to index so they can log in
        res.redirect('/');
    } else if (req.query.gameid == null) {
        //no query was submitted, take them back to the index page
        res.redirect('/');
    } else {
        //user is logged in and has a query, let the magic begin
        var gameId = req.query.gameid;
        var userOwnsThisGame = false;

        //jason object to be sent to jade renderer
        var gameSchema;
        var game;
        var gameNotOwned;
        var gameNews;
        var globalAchievementProgress;
        var userAchievementProgress;
        var twitchGameSearch;
        var twitchStreams;
        var graphs = {currentViews: '', totalViews: '', followers: '', progress: ''};

        //arrays for graph information
        var streamsXAxis = [];
        var currentViewersYAxis = [];
        var totalViewersYAxis = [];
        var followersYAxis = [];
        var unlocked = [];

        var graphCounter = 0;
        var graphsToDraw;

        ////
        //renderCallback
        //receives the response for the twitch streams request. then process information needed for plotly graphs, make the graphs and finaly render the page
        ////
        var StreamsNotOwnedCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                twitchStreams = JSON.parse(body);

                graphsToDraw = 3;
                getGraphInfo();

                //when the last graph response is received the page will be rendered
                createFollowersGraph();
                createTotalViewsGraph();
                createCurrentViewersGraph();
            }
        };

        ////
        //renderCallback
        //receives the response for the twitch streams request. then process information needed for plotly graphs, make the graphs and finaly render the page
        ////
        var StreamsCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                twitchStreams = JSON.parse(body);
                getGraphInfo();
                getUnlockedAchievements();
                graphsToDraw = 4;
                //when the last graph response is received the page will be rendered
                createProgressGraph();
                createFollowersGraph();
                createTotalViewsGraph();
                createCurrentViewersGraph();
            }
        };

        ////
        //streamsCallback
        //receives the response for the twitch game search, and then sends request for the twitch streams
        ////
        var twitchGamesCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                twitchGameSearch = JSON.parse(body);
                //7th request:sends request for the twitch streams for this game. response is received and processed in the render callback
                if(userOwnsThisGame == true) {
                    request('https://api.twitch.tv/kraken/streams?game=' + game.name + '&client_id=ay41sw3oome8qdnjolnd9s1ixmd7ode&stream_type=live&limit=4',StreamsCallback);
                } else {
                    request('https://api.twitch.tv/kraken/streams?game=' + gameNotOwned.name + '&client_id=ay41sw3oome8qdnjolnd9s1ixmd7ode&stream_type=live&limit=4',StreamsNotOwnedCallback);
                }
            }
        };

        ////
        //gameNewsCallback
        //receives the response for the game news, and then sends request for the games global achievement progress
        ////
        var gameNewsCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                gameNews = JSON.parse(body);
                for (i = 0; i < gameNews.appnews.newsitems.length; i++) {
                    //the news returned by steam api tends to have html tags in them so use the striptags module to remove them
                    gameNews.appnews.newsitems[i].contents = striptags(gameNews.appnews.newsitems[i].contents);
                }
                //fourth request:sends request for the global achievement progress for this game. response is received and processed in the global achievement progress callback
                if(userOwnsThisGame == true) {
                    request('https://api.twitch.tv/kraken/search/games?q=' + game.name + '&type=suggest&client_id=ay41sw3oome8qdnjolnd9s1ixmd7ode', twitchGamesCallback);
                } else {
                    request('https://api.twitch.tv/kraken/search/games?q=' + gameNotOwned.name + '&type=suggest&client_id=ay41sw3oome8qdnjolnd9s1ixmd7ode', twitchGamesCallback);
                }
            }
        };

        ////
        //searchTwitchGamesCallback
        //receives the response for the users achievement progress, and then sends request for the game on twitch
        /////
        var userAchievementCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                userAchievementProgress = JSON.parse(body);
                //6th request:sends request for the game on twitch. response is received and processed in the streams callback
                request('http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=' + gameId + '&count=3&maxlength=300&format=json', gameNewsCallback);
            }
        };



        ////
        //globalAchievementProgressCallback
        //receives the response for the games global achievement progress, and then sends request for the users achievement progress
        ////
        var globalAchievementProgressCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                globalAchievementProgress = JSON.parse(body);
                for(i = 0; i < globalAchievementProgress.achievementpercentages.achievements.length; i++){
                    //steam api gives percentages to 6+ decimal places so round them
                    globalAchievementProgress.achievementpercentages.achievements[i].percent = Math.round(globalAchievementProgress.achievementpercentages.achievements[i].percent);
                }
                //fifth request:sends request for the users achievement progress for this game. response is received and processed in the search stream games callback
                request('http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=' + gameId + '&key=E4EEB1FEFC85B481BC46C5B3711C1374&steamid=' + req.user.id, userAchievementCallback);
            }
        };



        ////
        //gameSchemaCallback
        //receives the response for the game schema, and then sends request for the games recent news
        ////
        var gameSchemaCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                gameSchema = JSON.parse(body);
                //third request:sends request for the current news for this game. response is received and processed in the game news callback
                request(' http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=' + gameId + '&format=json', globalAchievementProgressCallback);
            }
        };

        var gameNotOwnedCallback = function(error, response, body) {
            temp = JSON.parse(body);
            var a = Object.keys(temp)[0];
            gameNotOwned = temp[gameId].data;
            request('http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=' + gameId + '&count=3&maxlength=300&format=json', gameNewsCallback);
        };

        ////
        // ownedGamesCallback
        //receives the response for the users owned games, and then checks that the user owns the game this page is displaying. send request for the games schema
        ////
        var ownedGamesCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                var userOwnedGames = JSON.parse(body).response.games;
                //iterate through users owned games looking for this game
                for(i = 0; i < userOwnedGames.length; i++) {
                    if(gameId == userOwnedGames[i].appid) {
                        userOwnsThisGame = true;
                        game = userOwnedGames[i];
                        //steam gives play time in minutes to convert to hours
                        game.playtime_forever = convertToHours(game.playtime_forever);
                        game.playtime_2weeks = convertToHours(game.playtime_2weeks);
                        //game was found, end the for loop
                        i = userOwnedGames.length;
                    }
                }
                //if the user doesnt own this game the rest of the calls wont work and they should be shown a page without the game stats
                if(userOwnsThisGame == false) {
                    request('http://store.steampowered.com/api/appdetails?appids=' + gameId, gameNotOwnedCallback);
                } else {
                    //second request:sends request for the schema for this game. response is received and processed in the game schema callback
                    request('http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=E4EEB1FEFC85B481BC46C5B3711C1374&appid=' + gameId, gameSchemaCallback);
                }
            }
        };

        //first request: sends request for the users owned games. response is received and processed in the owned games callback
        //starts sting of methods that request the information needed and then render the page
        request('http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=E4EEB1FEFC85B481BC46C5B3711C1374&steamid=' + req.user.id + '&format=json&include_appinfo=1&include_played_free_games=1', ownedGamesCallback);
    }

    ////
    //render
    //
    ////
    render = function() {
        res.render('game',
            { user: req.user,
                owned: userOwnsThisGame,
                game: game,
                gameNotOwned: gameNotOwned,
                gameSchema: gameSchema,
                gameNews: gameNews,
                globalAchievementProgress: globalAchievementProgress,
                userAchievementProgress: userAchievementProgress,
                twitchStreams: twitchStreams,
                streamGraphs: graphs
            });
    }

    var createProgressGraph = function() {
        var data = [{values: unlocked, labels:['unlocked', 'locked'], type: 'pie'}];
        var layout = {fileopt : "overwrite", filename : "progress-graph"};
        plotly.plot(data, layout, function (err, msg) {
            if (err) {
                graphs.progress.error = 'error';
            } else {
                graphs.progress = msg;
            }
            graphCounter++;
            if (graphCounter == graphsToDraw) {
                render();
            }
        });
    }

    var createCurrentViewersGraph = function() {
        var data = [{x:streamsXAxis, y:currentViewersYAxis, type: 'bar'}];
        var layout = {fileopt : "overwrite", filename : "current-viewers-graph"};
        plotly.plot(data, layout, function (err, msg) {
            if (err) {
                graphs.progress.error = 'error';
            } else {
                graphs.currentViews = msg;
            }
            graphCounter++;
            if (graphCounter == graphsToDraw) {
                render();
            }
        });
    }

    var createTotalViewsGraph = function() {
        var data = [{x:streamsXAxis, y:totalViewersYAxis, type: 'bar'}];
        var layout = {fileopt : "overwrite", filename : "total-views-graph"};
        plotly.plot(data, layout, function (err, msg) {
            if (err) {
                graphs.progress.error = 'error';
            } else {
                graphs.totalViews = msg;
            }
            graphCounter++;
            if (graphCounter == graphsToDraw) {
                render();
            }
        });
    }

    var createFollowersGraph = function() {
        var data = [{x:streamsXAxis, y:followersYAxis, type: 'bar'}];
        var layout = {fileopt : "overwrite", filename : "followers-graph"};
        plotly.plot(data, layout, function (err, msg) {
            if (err) {
                graphs.progress.error = 'error';
            } else {
                graphs.followers = msg;
            }
            graphCounter++;
            if (graphCounter == graphsToDraw) {
                render();
            }
        });
    };

    ////
    //getGraphInfo
    //itterates through the twitch streams object to get values to be used in plotly graphs.
    ////
    var getGraphInfo = function() {
        for(i = 0; i < twitchStreams.streams.length; i++) {
            streamsXAxis.push(twitchStreams.streams[i].channel.display_name);
            currentViewersYAxis.push(twitchStreams.streams[i].viewers);
            totalViewersYAxis.push(twitchStreams.streams[i].channel.views);
            followersYAxis.push(twitchStreams.streams[i].channel.followers);
        }
    };

    ////
    //getUnlockedAchievements
    //iterates through the userAchievementProgress object counting how many achievements the user has unlocked for this game.
    // finally push the percentages fo locked and unlocked achievements to the unlocked array to be used in graphing
    ////
    var getUnlockedAchievements = function() {
        var unlockedCounter = 0;
        for(i = 0; i < userAchievementProgress.playerstats.achievements.length; i++) {
            if(userAchievementProgress.playerstats.achievements[i].achieved == 1) {
                unlockedCounter++;
            }
        }
        unlocked.push(Math.round((unlockedCounter / userAchievementProgress.playerstats.achievements.length)*100));
        unlocked.push(100 - unlocked[0]);
    };
});

////
//convertToHours
//takes a value in minutes and return it in hours
////
convertToHours = function(value) {
    return Math.round(parseInt(value) / 60);
}

router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

module.exports = router;