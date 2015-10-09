"use strict";
var mongoose = require('mongoose')
  , fs = require('fs')
  , _ = require('underscore')
  , bluebird = require('bluebird');

var BaidupanFileSchema = new mongoose.Schema({
  fs_id: Number,
  isdir: Number,
  md5: String,
  path: String,
  created_at: Date,
  updated_at: Date,
  filename: String,
  size: Number,
  existed: {
    type: Boolean,
    default: false
  }
});

var ArticleStatus = {
  scraped_status: {
    type: String,
    enum: ['OK',
      'NO_PANFILES', // http://www.0daydown.com/10/436427.html
      'PANFILE_SHARING_CANCEL', // http://www.0daydown.com/12/282227.html
      '404_ERROR', // http://pan.baidu.com/s/1kTwvbcv
      'YUNDATA_MISSING'
    ]
  },
  scraped_at: {
    type: Date
  },
  download_status: {
    type: String,
    enum: ['UNDOWNLOAD', 'PENDING_DOWNLOAD', 'DOWNLOADING', 'DOWNLOADED']
  },
  download_at: {
    type: Date
  }
};

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
    f: [BaidupanFileSchema]
  }],
  status: ArticleStatus
}, {strict: false });

//static methods
ArticleSchema.statics = {
  updateFilesExistence: function(filenames, existed) {
    return this.find({baidupan: {$elemMatch: {f: {$elemMatch: {filename: {$in: filenames}}}}}}).exec().then(function(articles) {
      var saveList = [];
      _.each(articles, function(art) {
        _.each(art.baidupan, function(baidupan) {
          _.each(baidupan.f, function(baidupanFile) {
            baidupanFile.existed = existed;
          })
        })
        saveList.push(art.save());
      })
      return bluebird.all(saveList).then(function(resolved) {
        var childrenList = [];
        resolved.forEach(function(resolvedE) {
          childrenList = childrenList.concat(resolvedE);
        });
        return childrenList;
      });
    });
  },

  updateArticleDownloaded: function(url, downed){

  },

  isArticleDownloaded: function(url){
    //first check url,

    //then comp
  },

  findByBaidupanUrl: function(url) {
    return this.findOne({baidupan:{$elemMatch:{u: url}}}).exec();
  },

  findByBaidupanFilename: function(filename) {
    return this.find({baidupan: {$elemMatch: {f: {$elemMatch: {filename: filename}}}}}).exec();
  },

  findByBaidupanFilenames: function(filenames) {
    return this.find({baidupan: {$elemMatch: {f: {$elemMatch: {filename: {$in: filenames}}}}}}).exec();
  },

  findByTitle: function(title){
    return this.find({title:new RegExp(title, 'i')}).exec();
  },

  findByTitleOrContent: function(text){
    return this.find({
      $or: [{title: new RegExp(text, 'i')}, {content: new RegExp(text, 'i')}]
    }).exec();
  },

  findByCategory: function(category){
    return this.find({category:category}).exec();
  },

  findArticlesWithoutBaidupanFiles: function(){
    return this.find({
      $or:[{'baidupan.0': {$exists: false}}, {'baidupan.f.0': {$exists: false}}]
    }).exec();
  },

  findInvalidArticles: function() {
    return this.find({
      $and: [{'baidupan.0': {$exists: true}}, {'baidupan.f.0': {$exists: false }}],
      category: {$ne: 'Music/音乐'}
    }).exec();
  }
}

module.exports = mongoose.model('Article', ArticleSchema);
