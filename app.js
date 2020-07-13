const express = require('express');
const multer = require('multer');
const path = require('path');
const helpers = require('./helpers');
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

const app = express();

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
app.use(express.static(__dirname + '/public'));

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
app.get('/grantDenied', grantDenied.renderPage);


// let runPy = new Promise(function(success, nosuccess) {

//   const { spawn } = require('child_process');
//   const pyprog = spawn('python3', ['image-to-onshape.py']);

//   pyprog.stdout.on('data', function(data) {

//       success(data);
//   });

//   pyprog.stderr.on('data', (data) => {

//       nosuccess(data);
//   });
// });

// app.get('/contour-script', (req, res) => {
//   res.write('running contour script... sending to Onshape\n');

//     runPy.then(function(fromRunpy) {
//         console.log(fromRunpy.toString());
//         res.end(fromRunpy);
//     });
// })

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


const storage = multer.diskStorage({
  destination: function(req, file, cb) {
      cb(null, 'uploads/');
  },

  // By default, multer removes file extensions so let's add them back
  filename: function(req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

app.listen(env, () => console.log(`Listening on port ${env}...`));

app.post('/upload-profile-pic', (req, res) => {
  // 'profile_pic' is the name of our file input field in the HTML form
  let upload = multer({ storage: storage, fileFilter: helpers.imageFilter }).single('profile_pic');

  upload(req, res, function(err) {
      // req.file contains information of uploaded file
      // req.body contains information of text fields, if there were any

      if (req.fileValidationError) {
          return res.send(req.fileValidationError);
      }
      else if (!req.file) {
          return res.send('Please select an image to upload');
      }
      else if (err instanceof multer.MulterError) {
          return res.send(err);
      }
      else if (err) {
          return res.send(err);
      }

      // Display uploaded image for user validation
      res.send(`You have uploaded this image: <hr/><img src="${req.file.path}" width="500"><hr /><a href="./">Upload another image</a>`);
  });
});