const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
}).single('imgPath');

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only');
  }
}

const Article = require('../models/article');

const User = require('../models/user');

const Rating = require('../models/rating');

const Cart = require('../models/cart');


// Authorization
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    req.flash('error', 'Sorry but you must be registered first!');
    res.redirect('/');
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

// Validator Schema
const articleSchema = Joi.object().keys({
  title: Joi.string().required(),
  message: Joi.string().required(),
  author: Joi.string().required(),
  imgPath: Joi.string().required(),
  price: Joi.string().required()
});

router.get('/page/:page', function(req, res, next) {
  var perPage = 10
  var page = req.params.page || 1

  Article
    .find({})
    .skip((perPage * page) - perPage)
    .limit(perPage)
    .exec(function(err, products) {
      Article.count().exec(function(err, count) {
        if (err) return next(err)
        res.render('articles', {
          products: products,
          current: page,
          pages: Math.ceil(count / perPage)
        })
      })
    })
})

router.route('/article/:id')
  .get((req, res) => {
    Article.findById(req.params.id, (err, article) => {
      User.findById(article.author, function(err, user) {
        Rating.find({
          article_id: req.params.id
        }).exec(function(err, rating) {
          Rating.count({
            article_id: req.params.id
          }).exec(function(err, count) {
            if (err) {
              req.flash('error', 'Artile does not exsits.');
              res.redirect('/articles');
            } else {
              const userloggedin = req.user;
              res.render('article', {
                article: article,
                author: user.username,
                id: user.id,
                userloggedin: userloggedin,
                count: count,
                rating: rating
              })
            }
          })
        })
      })
    })
  });

router.route('/article/:id/:rating')
  .get(async (req, res, next) => {
    try {
      const rated = await Rating.findOne({
        user_id: req.user.id,
        article_id: req.params.id
      })
      if (!rated) {
        const ratings = {};
        ratings.article_id = req.params.id;
        ratings.user_id = req.user.id;
        ratings.rating = req.params.rating;
        const rating = new Rating(ratings);
        rating.save(function(err, rating) {
          if (err) {
            console.log(err);
          } else {
            req.flash('success', 'You are successfully rated this item');
            res.redirect('/articles/article/' + req.params.id);
          }
        });
      } else {
        req.flash('error', 'You have already rated this product');
        res.redirect('/articles/article/' + req.params.id);
      }
    } catch (error) {
      next(error);
    }
  });

router.route('/article/:id/add-to-cart/:id')
  .get((req, res) => {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    Article.findById(productId, function(err, article) {
      if (err) {
        return res.redirect('/');
      } else {
        cart.add(article, article.id);
        req.session.cart = cart;
        req.flash('success', 'Product is successfully added to the cart')
        res.redirect('/articles/article/' + req.params.id);
      }
    })
  })
router.route('/edit/:id')
  .get(isAuthenticated, (req, res) => {
    if (req.user.username == 'vesko') {
      Article.findById(req.params.id, (err, article) => {
        if (err) {
          req.flash('error', 'Article does not exists.');
          res.redirect('/articles');
        } else {
          res.render('edit-article', {
            article: article
          });
        }
      })
    } else {
      req.flash('error', 'You need premission to access this page');
      res.redirect('/');
    }
  })
  .post((req, res) => {
    const article = {};
    article.title = req.body.title;
    article.author = req.body.author;
    article.message = req.body.message;
    article.price = req.body.price;

    const query = {
      _id: req.params.id
    }
    Article.update(query, article, (err) => {
      if (err) {
        console.log(err);
      } else {
        req.flash('success', 'Article Updated');
        res.redirect('/articles');
      }
    })
  })

router.delete('/:id', (req, res) => {
  const query = {
    _id: req.params.id
  }
  Article.findById(req.params.id, (err, article) => {
    Article.remove(query, (err) => {
      if (err) {
        console.log(err);
      } else {
        res.send('Success');
      }
    })
  })
})

router.route('/add/article')
  .get(isAuthenticated, (req, res) => {
    if (req.user.username == 'vesko') {
      res.render('add-article', {
        user_id: req.user._id
      })
    } else {
      req.flash('error', 'You must have premission to access this page')
      res.redirect('/');
    }
  })
  .post((req, res, err) => {
    upload(req, res, (err) => {
      if (err) {
        req.flash('error', 'Images Only');
        res.redirect('/articles/add/article');
      } else {
        if (req.file == undefined) {
          req.flash('error', 'No File Selected');
          res.redirect('/articles/add/article');
        } else {
          console.log(req.file);
          const results = {};
          results.title = req.body.title;
          results.author = req.body.author;
          results.message = req.body.message;
          results.imgPath = req.file.filename;
          results.price = req.body.price;
          const articleAdd = new Article(results);
          articleAdd.author = req.user._id;
          articleAdd.save();
          req.flash('success', 'Article Added');
          res.redirect('/articles/page/1');
        }
      }
    })
  });

router.route('/page/:page/add-to-cart/:id')
  .get((req, res) => {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    Article.findById(productId, function(err, article) {
      if (err) {
        return res.redirect('/');
      } else {
        cart.add(article, article.id);
        req.session.cart = cart;
        req.flash('success', 'Product is successfully added to the cart')
        res.redirect('/articles/page/' + req.params.page);
      }
    })
  })


router.route('/page/:page/search')
  .get((req, res) => {
    const regex = new RegExp(escapeRegEx(req.query.search), 'gi');
    if (req.query.search) {
      var perPage = 10
      var page = req.params.page || 1

      Article
        .find({
          title: regex
        })
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, articles) {
          Article.count({
            title: regex
          }).exec(function(err, count) {
            if (err) {
              return next(err);
            } else {
              if (articles.length < 1) {
                req.flash('error', 'No Producst match that query');
                res.redirect('/');
              }
              res.render('search', {
                articles: articles,
                current: page,
                pages: Math.ceil(count / perPage),
                search: req.query.search,
                perPage: perPage,
                count: count
              });
            }
          })
        })
    } else {
      var perPage = 10
      var page = req.params.page || 1
      Article
        .find({})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, articles) {
          Article.count().exec(function(err, count) {
            if (err) {
              return next(err);
            } else {
              if (articles.length < 1) {
                req.flash('error', 'No Producst match that query');
                res.redirect('/');
              }
              res.render('search', {
                articles: articles,
                current: page,
                pages: Math.ceil(count / perPage),
                search: req.query.search,
                perPage: perPage,
                count: count
              });
            }
          })
        })
    }
  });

function escapeRegEx(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

module.exports = router;