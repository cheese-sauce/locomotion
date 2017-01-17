var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');
var util = require('util');

//CODE FROM GITHUB USER 'welps' AT https://github.com/liamcurry/passport-steam
//couldnt get steam auth working with any of the avaliable npm modules so had to use a local module made by welps.
//this module is located in lib/passport-steam
var Strategy = require('./lib/passport-steam/strategy')

// Use the SteamStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new Strategy({
      returnURL: 'http://40.126.244.249:49160/auth/steam/return',
      realm: 'http://40.126.244.249:49160/',
      apiKey: 'E4EEB1FEFC85B481BC46C5B3711C1374'
    },
    function(identifier, profile, done) {
      // asynchronous verification, for effect...
      process.nextTick(function () {

        // To keep the example simple, the user's Steam profile is returned to
        // represent the logged-in user.  In a typical application, you would want
        // to associate the Steam account with a user record in your database,
        // and return that user instead.
        profile.identifier = identifier;
        return done(null, profile);
      });
    }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

//END CODE FROM welps

//define routes
var routes = require('./routes/index');
var authRoutes = require('./routes/auth');
var gameRoute = require('./routes/game');
var friendRoute = require('./routes/friend');
var allGamesRoute = require('./routes/allGames');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//user session for user sessions
app.use(session({
  secret: 'dogs',
  name: 'locomotion session',
  resave: true,
  saveUninitialized: true}));

//init passport for user sessions
app.use(passport.initialize());
app.use(passport.session());

//user the express routes defined above
app.use('/', routes);
app.use('/auth', authRoutes);
app.use('/game', gameRoute);
app.use('/friend', friendRoute);
app.use('/allGames', allGamesRoute);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;


