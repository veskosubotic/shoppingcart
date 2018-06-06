const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ratingSchema = new Schema({
  article_id: {
    type: String
  },
  user_id: {
    type: String
  },
  rating: {
    type: Number
  }
});

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;