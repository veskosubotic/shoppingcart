const express = require('express');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const mongoose = require('mongoose');
const passport = require('passport');
const MongoStore = require('connect-mongo')(session);
const stripe = require('stripe')('sk_test_1D6PgYAhcF7zARrfLUAGhdln');
const ejs = require('ejs');
const expressLayouts = require('express-ejs-layouts');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/shopping');

const app = express();
app.use(morgan('dev'));
app.use(expressLayouts);

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'codeworkrsecret',
  saveUninitialized: false,
  resave: false,
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  cookie: {
    maxAge: 180 * 60 * 1000
  }
}));

require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_messages = req.flash('success');
  res.locals.error_messages = req.flash('error');
  res.locals.isAuthenticated = req.user ? true : false;
  res.locals.session = req.session;
  res.locals.admin = req.user;
  next();
});

app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/articles', require('./routes/articles'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.render('notFound');
});

app.listen(3000, () => console.log('Server started listening on port 3000!'));