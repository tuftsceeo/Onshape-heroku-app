var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var authentication = require('./authentication');
var session = require('express-session');
var redis = require('redis');
var RedisStore = require('connect-redis')(session);
var passport = require('passport');
var http = require('http');
var uuid = require('uuid');

var api = require('./routes/api');
var index = require('./routes/index');
var tools = require('./routes/tools');
var activities = require('./routes/activities');
var resources = require('./routes/resources-page');
var cubeHole = require('./routes/cube-hole');
var cubeHolePlacemat = require('./routes/cube-hole-placemat');
var cubeHole2 = require('./routes/cube-hole2');
var cup = require('./routes/cup');
var cupPlacemat = require('./routes/cup-placemat');
var valentine = require('./routes/valentine');
var valentinePlacemat = require('./routes/valentine-placemat');
var dogCollar = require('./routes/dog-collar');
var dogCollarPlacemat = require('./routes/dog-collar-placemat');
var volcano = require('./routes/volcano');
var volcanoPlacemat = require('./routes/volcano-placemat');
var paperclip = require('./routes/paperclip');
var paperclipPlacemat = require('./routes/paperclip-placemat');
var spring = require('./routes/spring');
var springPlacemat = require('./routes/spring-placemat');
var hinge = require('./routes/hinge');
var hingePlacemat = require('./routes/hinge-placemat');
var grantDenied = require('./routes/grantDenied');

var client;
if (process.env.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  client = require("redis").createClient(rtg.port, rtg.hostname);

  client.auth(rtg.auth.split(":")[1]);
} else if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  client = require("redis").createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
} else {
  client = redis.createClient();
}

var app = express();

authentication.init();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('hbs').__express);
app.set('view engine', 'html');

var env = process.env.NODE_ENV || 'development';
app.locals.ENV = env;
app.locals.ENV_DEVELOPMENT = env == 'development';

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use('/signin', express.static(path.join(__dirname, '..', 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new RedisStore({
    'client': client
  }),
  secret: 'app-stl-server',
  saveUninitialized: false,
  resave: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api', api);

app.get('/', index.renderPage);
app.get('/tools', tools.renderPage);
app.get('/activities', activities.renderPage);
app.get('/resources-page', resources.renderPage);
app.get('/cube-hole', cubeHole.renderPage);
app.get('/cube-hole-placemat', cubeHolePlacemat.renderPage);
app.get('/cube-hole2', cubeHole2.renderPage);
app.get('/cup', cup.renderPage);
app.get('/cup-placemat', cupPlacemat.renderPage);
app.get('/valentine', valentine.renderPage);
app.get('/valentine-placemat', valentinePlacemat.renderPage);
app.get('/dog-collar', dogCollar.renderPage);
app.get('/dog-collar-placemat', dogCollarPlacemat.renderPage);
app.get('/volcano', volcano.renderPage);
app.get('/volcano-placemat', volcanoPlacemat.renderPage);
app.get('/paperclip', paperclip.renderPage);
app.get('/paperclip-placemat', paperclipPlacemat.renderPage);
app.get('/spring', spring.renderPage);
app.get('/spring-placemat', springPlacemat.renderPage);
app.get('/hinge', hinge.renderPage);
app.get('/hinge-placemat', hingePlacemat.renderPage);
app.get('/grantDenied', grantDenied.renderPage);


// GET /oauthSignin
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Onshape authentication will involve redirecting
//   the user to onshape.com.  After authorization, Onshape will redirect the user
//   back to this application at /oauthRedirect
app.use('/oauthSignin', storeExtraParams,
  function(req, res){
    // The request will be redirected to Onshape for authentication, so this
    // function will not be called.
  }
);

var StateMap = {};

function storeExtraParams(req, res) {
    var docId = req.query.documentId;
    var workId = req.query.workspaceId;
    var elId = req.query.elementId;

     var state = {
        documentId : docId,
        workspaceId : workId,
        elementId : elId
    };

    var stateString = JSON.stringify(state);
    var uniqueID = "state" + passport.session();

    // Save the d/w/e to Redis instead of a global
    client.set(uniqueID, stateString);

    var id = uuid.v4(state);

    StateMap[id] = state;

    return passport.authenticate("onshape", {state: id})(req, res);
}

// GET /oauthRedirect
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   signin page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.use('/oauthRedirect',
  passport.authenticate('onshape', { failureRedirect: '/grantDenied' }),
    function(req, res) {
      var uniqueID = "state" + passport.session();
      client.get(uniqueID, function(err, reply) {
          // reply is null when the key is missing
          if (reply != null) {
              var newParams = JSON.parse(reply);
              var url = '/?' + 'documentId=' + newParams.documentId + '&workspaceId=' + newParams.workspaceId + '&elementId=' + newParams.elementId;
              res.redirect(url);
          }
      });
    });

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace

if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        console.log('****** Error ' + err.status, err.message);

        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            title: 'error'
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    console.log('****** Error ' + err.status, err.message);

    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        title: 'error'
    });
});


module.exports = app;
