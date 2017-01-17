var express = require('express');
var router = express.Router();
var passport = require('passport');
var request = require('request');

/* GET home page. */
router.get('/', function(req, res){
    if (!req.user) {
        res.render('index');
    } else {
        //user is logged in. let the magic begin
        var userRecentGames;
        var userFriendsListIds;
        var userFriendsList;

        ////
        //friendsInfoCallback
        //receives the response for the friends information, converts the online status to strings and then renders the page
        ////
        var friendsInfoCallback = function (error, response, body) {
            userFriendsList = JSON.parse(body);
            //for each friend convert their status to the right string
            for (i = 0; i < userFriendsList.response.players.length; i++) {
               userFriendsList.response.players[i].personastate = convertToUserStatus(userFriendsList.response.players[i].personastate);
            }
            res.render('index', { user: req.user, userRecentGames: userRecentGames, userFriendsList: userFriendsList});
        };

        ////
        //friendsIdsCallback
        //receives the response fot the friends list request, creates a string of all the ids to be used in the url and then sends request for the friends information
        ////
        var friendsIdsCallback = function (error, response, body) {
            if (!error && response.statusCode == 200) {
                userFriendsListIds = JSON.parse(body);
                if(userFriendsListIds.friendslist.friends.length != 0) {
                    var idsString = "";
                    for(i = 0; i < userFriendsListIds.friendslist.friends.length; i++) {
                        idsString = idsString + userFriendsListIds.friendslist.friends[i].steamid + ',';
                    }
                    idsString = idsString.slice(0, -1);
                    request(" http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=E4EEB1FEFC85B481BC46C5B3711C1374&steamids=" + idsString, friendsInfoCallback);
                } else {
                    //if the user has no friends there is no need for the next callback and the page can just be rendered
                    res.render('index', { user: req.user, userRecentGames: userRecentGames, userFriendsList: userFriendsList});
                }
            }
        };

        ////
        //recentGamesCallback
        //receives the response fot the recent games request, rounds the play hours of the games and then sends request for users friend
        ////
        var recentGamesCallback = function (error, response, body) {
            if (!error && response.statusCode == 200) {
                userRecentGames = JSON.parse(body);
                if (userRecentGames.response.total_count != 0) {
                    for (i = 0; i < userRecentGames.response.games.length; i++) {
                        userRecentGames.response.games[i].playtime_forever = Math.round(parseInt(userRecentGames.response.games[i].playtime_forever) / 60);
                    }
                }
                request(" http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=E4EEB1FEFC85B481BC46C5B3711C1374&steamid=" + req.user.id + "&relationship=friend", friendsIdsCallback);
            }
        };
        // first request to get the users recently played games. response is processed in
        request('http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=E4EEB1FEFC85B481BC46C5B3711C1374&steamid=' + req.user.id + '&format=json', recentGamesCallback);
    }
});

////
//convertToUserStatus
//takes an int for a steam users online status and converts it to the corrisponding string.
//there is no way to have the api return these strings
////
var convertToUserStatus = function(status) {
    switch(status) {
        case 0:
            return "Offline";
            break;
        case 1:
            return "Online";
            break;
        case 2:
            return "Busy";
            break;
        case 3:
            return "Away";
            break;
        case 4:
            return "Snooze";
            break;
        case 5:
            return "Looking to trade";
            break;
        case 6:
            return "looking to play";
            break;
    }
};

router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

module.exports = router;
