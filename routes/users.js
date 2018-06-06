const express = require('express');
const router = express.Router();
const Joi = require('joi');
const passport = require('passport');
const randomstring = require('randomstring');
const mailer = require('../misc/mailer');
const bcrypt = require('bcryptjs');

const User = require('../models/user');

const Order = require('../models/order');

const Cart = require('../models/cart');

// Validator Schema
const userSchema = Joi.object().keys({
  email: Joi.string().email().required(),
  username: Joi.string().required(),
  password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
  confirmationPassword: Joi.any().valid(Joi.ref('password')).required()
});

// Authorization
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    req.flash('error', 'Sorry but you must be registered first!');
    res.redirect('/', {
      error: error
    });
  }
};

const isNotAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    req.flash('error', 'Sorry but you are already logged in!');
    res.redirect('/');
  } else {
    return next();
  }
};

router.route('/register')
  .get(isNotAuthenticated, (req, res) => {
    res.render('register');
  })
  .post(async (req, res, next) => {
    try {
      const result = Joi.validate(req.body, userSchema);

      if (result.error) {
        req.flash('error', 'Data is not valid. Please try again.');
        res.redirect('/users/register');
        return;
      }

      // Checking if email is already taken
      const user = await User.findOne({
        'email': result.value.email
      });
      if (user) {
        req.flash('error', 'Email is already in use.');
        res.redirect('/users/register');
        return;
      }

      // Checking if Username is already taken
      const username = await User.findOne({
        'username': result.value.username
      });
      if (username) {
        req.flash('error', 'Username is already in use.');
        res.redirect('/users/register');
        return;
      }

      // Hash the password
      const hash = await User.hashPassword(result.value.password);

      // Generate secret token
      const secretToken = randomstring.generate();
      result.value.secretToken = secretToken;

      // Set the account as inactive
      result.value.active = false;

      // Save user to DB
      delete result.value.confirmationPassword;
      result.value.password = hash;

      const newUser = await new User(result.value);
      console.log('newUser', newUser);
      await newUser.save();

      // Compose an email
      const html = `Hi there,
      <br/>
      Thank you for registering!
      <br><br>
      Please verify your email by typing the following token:
      <br>
      On the following:
      <a href="http://localhost:3000/users/verify/${secretToken}">Link</a>
      <br><br>
      Have a pleasent day!`;

      // Send the email
      await mailer.sendEmail('admin@site.com', result.value.email, 'Please verify your email', html);

      req.flash('success', 'Please check your email.');
      res.redirect('/users/login');
    } catch (error) {
      next(error);
    }
  });

router.route('/login')
  .get(isNotAuthenticated, (req, res) => {
    res.render('login');
  })
  .post(passport.authenticate('local', {
    failureRedirect: "/users/login",
    failureFlash: true
  }), function(req, res, next) {
    if (req.session.oldUrl) {
      res.redirect(req.session.oldUrl);
      req.session.oldUrl = null;
    } else {
      res.redirect('/users/dashboard');
    }
  });

router.route('/dashboard')
  .get(isAuthenticated, (req, res) => {
    Order.find({
      user: req.user
    }, function(err, orders) {
      if (err) {
        console.log(err);
      }
      var cart;
      orders.forEach(function(order) {
        cart = new Cart(order.cart);
        order.items = cart.generateArray();
      });
      res.render('dashboard', {
        orders: orders,
        user: req.user
      });
    });
  });

router.route('/verify/:secretToken')
  .get(isNotAuthenticated, async (req, res, next) => {
    try {
      // Find the account that matches the secret token
      const user = await User.findOne({
        'secretToken': req.params.secretToken
      });

      if (user) {
        user.active = true;
        user.secretToken = '';
        await user.save();
        req.flash('success', 'You have successfully verified your email adress. Now You may login');
        res.redirect('/users/login');
      } else {
        req.flash('error', 'No user found');
        res.redirect('/users/register');
      }
    } catch (error) {
      next(error);
    }
  })

router.route('/logout')
  .get(isAuthenticated, (req, res) => {
    req.logout();
    req.flash('success', 'Successfully logged out. Hope to see you soon!');
    res.redirect('/');
  });

router.route('/resetpassword')
  .get(isNotAuthenticated, (req, res) => {
    res.render('resetpassword');
  })
  .post(async (req, res, next) => {
    try {
      // Generate secret token
      const secretToken = randomstring.generate();
      req.body.secretToken = secretToken;

      // Checking if email is already taken
      const user = await User.findOne({
        'email': req.body.email
      });
      if (user) {
        const newUserresetpassword = {};
        newUserresetpassword.email = req.body.email;
        newUserresetpassword.secretToken = req.body.secretToken;
        console.log('newUserresetpassword', newUserresetpassword);
        User.findByIdAndUpdate(user._id, newUserresetpassword, {}, function(err, newUserresetpassword) {
          if (err) {
            console.log(err);
          } else {
            // Compose an email
            const html = `Hi there,
            <br/>
            Thank you for registering!
            <br><br>
            Please verify your email by typing the following token:
            <br>
            On the following:
            <a href="http://localhost:3000/users/setnewpassword/${secretToken}">Link</a>
            <br><br>
            Have a pleasent day!`;

            // Send the email
            mailer.sendEmail('admin@site.com', req.body.email, 'Please verify your email', html);

            req.flash('success', 'Please check your email.');
            res.redirect('/users/login');
          }
        })
      } else {
        req.flash('error', 'Email does not exists.');
        res.redirect('/users/resetpassword');
        return;
      }
    } catch (error) {
      next(error);
    }
  });

router.route('/setnewpassword/:secretToken')
  .get(isNotAuthenticated, (req, res) => {
    res.render('setnewpassword', {
      secretToken: req.params.secretToken
    })
  })
  .post(async (req, res, next) => {
    try {
      // Checking if token exists
      const userset = await User.findOne({
        'secretToken': req.body.secretToken
      });
      if (userset) {
        const newUsersetpassword = {};
        newUsersetpassword.password = await User.hashPassword(req.body.password);
        newUsersetpassword.secretToken = '';
        await User.findByIdAndUpdate(userset._id, newUsersetpassword, {}, function(err, newUsersetpassword) {
          if (err) {
            console.log(err);
          } else {
            req.flash('success', 'You successfully changed your password.');
            res.redirect('/users/login');
          }
        })
      } else {
        req.flash('error', 'Secret Token does not exsits!');
        res.redirect('/users/setnewpassword/:token');
        return;
      }
    } catch (error) {
      next(error);
    }
  })


module.exports = router;