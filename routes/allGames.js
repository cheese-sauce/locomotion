/**
 * Created by Jack on 18-Sep-16.
 */
var express = require('express');
var router = express.Router();
var passport = require('passport');
var request = require('request');

router.get('/', function(req, res){
    if (!req.user) {
        //user isnt logged in and they shouldnt be here. take them to index so they can log in
        res.redirect('/');
    } else {
        var ownedGamesCallback = function(error, response, body) {
            if (!error && response.statusCode == 200) {
                var games = JSON.parse(body).response.games;
                res.render('allGames', { user: req.user, games: games});
            }
        }

        //first request: sends request for the users owned games. response is received and processed in the owned games callback
        //starts sting of methods that request the information needed and then render the page
        request('http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=E4EEB1FEFC85B481BC46C5B3711C1374&steamid=' + req.user.id + '&format=json&include_appinfo=1&include_played_free_games=1', ownedGamesCallback);
    }
});

router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

module.exports = router;
