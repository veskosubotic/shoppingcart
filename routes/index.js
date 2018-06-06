const express = require('express');
const router = express.Router();
const Cart = require('../models/cart');
const Article = require('../models/article');
const Order = require('../models/order');

// Authorization
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    req.session.oldUrl = req.url;
    req.flash('error', 'Sorry but you must be registered first!');
    res.redirect('/users/login');
  }
};

router.get('/', (req, res) => {
  Article.find({}, (error, articles) => {
    if (error) {
      console.log(err);
    } else {
      res.render('index', {
        articles: articles
      });
    }
  }).limit(3).sort([
    ["createdAt", -1]
  ]);
});

router.get('/add-to-cart/:id', function(req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});
  Article.findById(productId, function(err, article) {
    if (err) {
      return res.redirect('/');
    } else {
      cart.add(article, article.id);
      req.session.cart = cart;
      req.flash('success', 'Product is successfully added to the cart')
      res.redirect('/');
    }
  })
});

router.get('/shopping-cart', isAuthenticated, function(req, res, next) {
  if (!req.session.cart || req.session.cart.totalPrice == 0) {
    return res.render('shopping-cart', {
      articles: null
    });
  }
  const cart = new Cart(req.session.cart);
  res.render('shopping-cart', {
    articles: cart.generateArray(),
    totalPrice: cart.totalPrice,
    email: req.user.email
  });
});

router.get('/checkout', isAuthenticated, function(req, res, next) {
  if (!req.session.cart || req.session.cart.totalPrice == 0) {
    return res.redirect('/shoping-cart');
  } else {
    const cart = new Cart(req.session.cart);
    res.render('checkout', {
      total: cart.totalPrice,
      email: req.user.email
    });
  }
})

// Charge Route
router.post('/charge', (req, res, next) => {
  if (!req.session.cart || req.session.cart.totalPrice == 0) {
    return res.redirect('/shoping-cart');
  } else {
    const stripe = require('stripe')('sk_test_1D6PgYAhcF7zARrfLUAGhdln');
    const cart = new Cart(req.session.cart);
    const amount = cart.totalPrice * 100;
    stripe.customers.create({
        email: req.body.stripeEmail,
        source: req.body.stripeToken
      })
      .then(customer => stripe.charges.create({
        amount,
        description: 'Web Development Ebook',
        currency: 'usd',
        customer: customer.id
      }, function(err, charge) {
        if (err) {
          console.log(err);
        } else {
          const order = new Order({
            user: req.user,
            cart: cart,
            adress: req.body.stripeShippingAddressLine1,
            name: req.body.stripeShippingName,
            paymentId: charge.id
          });
          order.save(function(err, result) {
            if (err) {
              console.log(err)
            } else {
              req.flash('success', 'You have successfully buy our products');
              req.session.cart = undefined;
              res.redirect('/');
            }
          })
        }
      }));
  }
});

router.get('/reduce/:id', function(req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.reduceByOne(productId);
  req.session.cart = cart;
  res.redirect('/shopping-cart');
});

router.get('/increase/:id', function(req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.increaseByOne(productId);
  req.session.cart = cart;
  res.redirect('/shopping-cart');
});

router.get('/remove/:id', function(req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.removeItem(productId);
  req.session.cart = cart;
  res.redirect('/shopping-cart');
});

module.exports = router;