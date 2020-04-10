// level 7 security: Oauth
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ------------------------- MONGODB DECLARATIONS ------------------------------------ //
mongoose.connect('mongodb://localhost:27017/usersDB', {
  useNewUrlParser: true,
});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

// ------------------------- PASSPORT JS DECLARATIONS ------------------- //
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// more generalized serializer-deserializer for both local and oauth2
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/secrets',
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

// ------------------------- PORT CONFIGURATION ------------------------------------ //
app.listen(3000, function () {
  console.log('...server has started on port 3000');
});

// ------------------------- ROUTE: HOME ------------------------------------ //
app.get('/', function (req, res) {
  res.render('home');
});

// ------------------------- ROUTES: REGISTER ------------------------------- //
app.get('/register', function (req, res) {
  res.render('register');
});

app.post('/register', function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (
    err,
    user
  ) {
    if (err) {
      console.log(err);
      res.redirect('/register');
    } else {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/secrets');
      });
    }
  });
});

// ------------------------- ROUTES: LOGIN ------------------------------------ //
app.get('/login', function (req, res) {
  res.render('login');
});

app.post('/login', function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/secrets');
      });
    }
  });
});

// ------------------------- ROUTES: GOOGLE OAUTH ------------------------------- //
app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get(
  '/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect to secrets
    res.redirect('/secrets');
  }
);

// ------------------------- ROUTES: LOGOUT ------------------------------------ //

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

// ------------------------- ROUTES: SECRETS ------------------------------------ //
// note: this will only let users post one secret. need to mod the db insert with
// a sublist or array if we want them to be able to post multiple secrets.
app.get('/secrets', function (req, res) {
  User.find({ secret: { $ne: null } }, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render('secrets', { usersWithSecrets: foundUsers });
      }
    }
  });
});

// ------------------------- ROUTES: SUBMIT ------------------------------------ //
app.get('/submit', function (req, res) {
  if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.redirect('/login');
  }
});

app.post('/submit', function (req, res) {
  const submittedSecret = req.body.secret;
  console.log('found user pass 1: ' + req.user.id);
  console.log('not so secret secret: ' + submittedSecret);
  user_id = req.user.id;

  User.findById(user_id, function (err, foundUser) {
    if (err) {
      console.log('an err not being trapped');
      console.log(err);
    } else {
      if (foundUser) {
        console.log('found user: ' + user_id);
        foundUser.secret = submittedSecret;
        foundUser.save(function () {
          res.redirect('/secrets');
        });
      }
    }
  });

  // res.render('login');
});
