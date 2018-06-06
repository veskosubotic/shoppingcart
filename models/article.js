const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const articleSchema = new Schema({
  title: {
    type: String
  },
  author: {
    type: String
  },
  message: {
    type: String
  },
  imgPath: {
    type: String
  },
  price: {
    type: Number
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

const Article = mongoose.model('article', articleSchema);
module.exports = Article;