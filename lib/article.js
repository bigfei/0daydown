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
  scraped_at: {
    type: Date,
    default: Date.now
  }
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

  findByBaidupanUrl: function(url) {
    return this.findOne({baidupan:{$elemMatch:{u: url}}}).exec();
  },

  findByBaidupanFilename: function(filename) {
    return this.find({baidupan: {$elemMatch: {f: {$elemMatch: {filename: filename}}}}}).exec();
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
      $or:[{'baidupan.0': {$exists: false}}, {'baidupan.f.0':{$exists: false}}]
    }).exec();
  }
}

module.exports = mongoose.model('Article', ArticleSchema);
