/**
 * Created by Jack on 14-Sep-16.
 */
var express = require('express');
var router = express.Router();
var passport = require('passport');
var request = require('request');

router.get('/', function(req, res){
    if (!req.user) {
        //user isnt logged in and they shouldnt be here. take them to index so they can log in
        res.redirect('/');
    } else if (req.query.userid == null) {
        //no query was submitted, take them back to the index page
        res.redirect('/');
    } else {
        var userId = req.query.userid;
        var friend;

        //callback that gets the recent game for this friend
        var recentGamesCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                var games = JSON.parse(body).response;
                if(games.total_count == 0) {
                    res.render('friend', { user: req.user, userRecentGames: games});
                } else {
                    for(i = 0; i < games.games.length; i++) {
                        games.games[i].playtime_forever = convertToHours(games.games[i].playtime_forever);
                    }
                    res.render('friend', { user: req.user, friend: friend, userRecentGames: games.games});
                }
            }
        };
        //callback that gets the friends information
        var friendCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                friend = JSON.parse(body);
                request('http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=E4EEB1FEFC85B481BC46C5B3711C1374&steamid=' + userId + '&format=json', recentGamesCallback);
            }
        };

        request('http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E4EEB1FEFC85B481BC46C5B3711C1374&steamids=' + userId, friendCallback);
    }
});

router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

////
//convertToHours
//takes a value in minutes and return it in hours
////
var convertToHours = function(value) {
    return Math.round(parseInt(value) / 60);
};

module.exports = router;
