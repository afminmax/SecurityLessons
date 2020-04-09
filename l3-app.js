// level 3 security: hiding the secret key
require('dotenv').config();
// note on the use of this level 3, the user DB needs to refreshed so that the encryption key
// uses the new secret!
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// ------------------------- MONGODB DECLARATIONS ------------------------------------ //
mongoose.connect('mongodb://localhost:27017/usersDB', {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// encrypt the password in the db and put in an env, this is really enabling level 3
userSchema.plugin(encrypt, {
  secret: process.env.SECRET,
  encryptedFields: ['password'],
});

const User = mongoose.model('User', userSchema);
// ------------------------- MONGODB DECLARATIONS ------------------------------------ //

app.get('/', function (req, res) {
  res.render('home');
});

app.get('/login', function (req, res) {
  res.render('login');
});

app.get('/register', function (req, res) {
  res.render('register');
});

app.post('/register', function (req, res) {
  newUser = new User({
    email: req.body.username,
    password: req.body.password,
  });
  newUser.save(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.render('secrets');
    }
  });
});

app.post('/login', function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({ email: username }, function (err, foundUser) {
    if (err) {
      // if no user found, dump error
      console.log(err);
    } else {
      if (foundUser) {
        // if there was a found user, then...
        if (foundUser.password === password) {
          // check the users password
          res.render('secrets');
        }
      }
    }
  });
});

app.listen(3000, function () {
  console.log('...server has started on port 3000');
});
