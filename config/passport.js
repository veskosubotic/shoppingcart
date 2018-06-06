const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');

module.exports = function(passport) {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: false
  }, async (email, password, done) => {
    try {
      // Check if the user exists
      const user = await User.findOne({
        'email': email
      });
      if (!user) {
        return done(null, false, {
          message: "Unknown User"
        });
      }
      // Check if the password is correct
      const isValid = await User.comparePasswords(password, user.password);
      if (!isValid) {
        return done(null, false, {
          message: "Unknown Password"
        });
      }
      // Check if the account has been verified
      if (!user.active) {
        return done(null, false, {
          message: "You need to verify email first"
        });
      }
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
}