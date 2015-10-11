"use strict";
var mongoose = require('mongoose')
  , fs = require('fs')
  , _ = require('underscore')
  , bluebird = require('bluebird');

var ArticleStatus = {
  scraped_status: {
    type: String,
    enum: ['OK',
      'NO_PANFILES' // http://www.0daydown.com/10/436427.html
    ]
  },
  scraped_at: {
    type: Date
  }
};

var BaidupanStatus = {
  download_status: {
    type: String,
    enum: ['UNDOWNLOAD', 'PENDING_DOWNLOAD', 'DOWNLOADING', 'DOWNLOADED']
  },
  download_at: {
    type: Date
  },
  scraped_status: {
    type: String,
    enum: ['OK',
      'PANFILE_SHARING_CANCEL', // http://www.0daydown.com/12/282227.html
      '404_ERROR', // http://pan.baidu.com/s/1kTwvbcv
      'YUNDATA_MISSING'
    ]
  },
  scraped_at: {
    type: Date
  }
}
/*参数名称  类型  UrlEncode   描述
fs_id   uint64  否   文件或目录在PCS的临时唯一标识ID。
path  string  否   文件或目录的绝对路径。
ctime   uint  否   文件或目录的创建时间。
mtime   uint  否   文件或目录的最后修改时间。
block_list  string  否   文件所有分片的md5数组JSON字符串。
size  uint64  否   文件大小（byte）。
isdir   uint  否   是否是目录的标识符：

    “0”为文件
    “1”为目录
*/
var BaidupanFileSchema = new mongoose.Schema({
  fs_id: Number,
  path: String,
  created_at: Date,
  updated_at: Date,
  size: Number,
  isdir: Number,
  md5: String,
  filename: String,
  existed: {//existed on local disk
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
  category: [String],
  guid: String,
  author: String,
  pubDate: Date,
  //by fetchArticle job
  html: String,
  description: String,
  images: [Buffer],
  thumb: Buffer,
  //by fetchBaidupan job
  baidupan: [{
    u: String, //url
    p: String, //pass
    uk:String, //userkey
    shareid:String, //share id
    f: [BaidupanFileSchema],
    s: BaidupanStatus
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

  updateArticleStatus: function(url, status){

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
