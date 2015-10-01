var mongoose = require('mongoose');

var ArticleSchema = new mongoose.Schema({ 
  url: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    default: '',
    trim: true
  },
  category: String,
  content: String,
  baidupan: [{
    u: String,
    p: String,
    uk:String,
    shareid:String,
    f: [{
      fs_id: Number,
      isdir: Number,
      md5: String,
      path: String,
      created_at: Date,
      updated_at: Date,
      filename: String,
      size: Number
    }]
  }],
  scraped_at: {
    type: Date,
    default: Date.now
  }
}, {strict: false });

//static methods
ArticleSchema.statics = {
  findByBaidupanUrl: function(url) {
    return this.findOne({baidupan:{$elemMatch:{u: url}}}).exec();
  },

  findByBaidupanFilename: function(filename) {
    return this.findOne({baidupan:{$elemMatch:{u: url}}}).exec();
  }
}

module.exports = mongoose.model('Article', ArticleSchema);;