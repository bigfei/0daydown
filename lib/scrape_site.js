"use strict";
var webdriver = require('selenium-webdriver'),
  until = webdriver.until,
  by = webdriver.By,
  cheerio = require('cheerio'),
  _ = require('underscore'),
  fs = require('fs'),
  Article = require('./article.js'),
  config = require('../config/config.js'),
  humanFormat = require('human-format'),
  mongoose = require('mongoose'),
  BaiduPan = require('./baidupan.js');

var ScrapeSite = function(driver){
  this.driver = driver;
}

ScrapeSite.prototype.login0Day = function() {
  var driver = this.driver;
  driver.manage().window().maximize()
  driver.get('http://www.0daydown.com/wp-login.php');
  driver.findElement(by.id('user_login')).sendKeys(config.zerodaydown.user);
  driver.findElement(by.id('user_pass')).sendKeys(config.zerodaydown.pass);
  driver.findElement(by.id('rememberme')).click()
  driver.findElement(by.id('wp-submit')).click();
  return driver.wait(until.titleContains('Account'), 30*60*1000);
};

ScrapeSite.prototype.takeScreenshot = function(filename) {
  var driver = this.driver;
  driver.takeScreenshot().then(function(png) {
    fs.writeFileSync(filename, png, 'base64');
  });
}

ScrapeSite.prototype.getPageSource = function(url) {
  var driver = this.driver;
  driver.get(url);
  return driver.getPageSource().then(function(src) {
    return cheerio.load(src);
  });
};

ScrapeSite.prototype.scrapePaginate = function(url, pageStart, pageEnd) {
  var scrapePostListPromiseLists = [];
  for (var i = pageStart; i <= pageEnd; i++) {
    var u = url + '/page/' + i
    scrapePostListPromiseLists.push(this.scrapePostList(u));
  }
  return webdriver.promise.all(scrapePostListPromiseLists).then(function(resolved) {
    var childrenList = [];
    resolved.forEach(function(resolvedE) {
      childrenList = childrenList.concat(resolvedE);
    });
    return childrenList;
  });
};

ScrapeSite.prototype.scrapePostList = function(url) {
  var scrapeArticlePromiseLists = [], articles = [];
  return this.getPageSource(url).then(function($) {
    $('article.excerpt header h2 a').each(function(i, elem) {
      var url = $(elem).attr('href');

      var scrapeArticlePromise = this.scrapeArticle(url).then(function(article) {
        return this.saveArticle(article);
      }.bind(this));
      scrapeArticlePromiseLists.push(scrapeArticlePromise);
    }.bind(this));

    return webdriver.promise.all(scrapeArticlePromiseLists).then(function(resolved) {
      var childrenList = [];
      resolved.forEach(function(resolvedE) {
        childrenList = childrenList.concat(resolvedE);
      });
      return childrenList;
    });
  }.bind(this))
};

ScrapeSite.prototype.scrapeArticle = function(url) {
  var driver = this.driver;
  var common_reg = /\s*(提取密碼|提取密码|提取码|提取碼|提取|密碼|密码|百度|百度云|云盘|360云盘|360云|360yun|yun)[:：]?\s*(<[^>]+>)?\s*([0-9a-zA-Z]{4,})\s*/;
  var o = {};
  o['url'] = url;
  return this.getPageSource(url).then(function($) {
    o['title'] = $('h1.article-title').text();
    o['content'] = $('article.article-content').text();
    o['category'] = $('header.article-header .meta .muted').first().text().trim();

    $('article.article-content a.external').filter(function(i1, elem) {
      var href = $(this).attr('href');
      return /^(http|https):\/\/pan.baidu.com/.test(href);
    }).map(function(i2, elem) {
      o['baidupan'] = o['baidupan'] || [];
      var panurl = $(elem).attr('href');
      var p = $(elem).parent().contents().filter(function() {
        var r = $(this).text().match(common_reg);
        return r != null && this.nodeType === 3;
      }).text().match(common_reg);

      var pass = '';
      if(p != null){
        pass = p[3];
      }
      var baiduPan = new BaiduPan(driver);
      baiduPan.checkBaiduPanByApi(panurl, pass, url).then(function(filesData) {
        o['baidupan'].push({'u': panurl, 'p': pass, 'f': filesData.files, 'uk':filesData.uk, 'shareid': filesData.shareid});
      });
    })
    return o;
  })
};

ScrapeSite.prototype.saveArticle = function(article) {
  article.scraped_at = Date.now();
  return Article.findOneAndUpdate({url: article.url }, article, {new: true, upsert: true, setDefaultsOnInsert:true}).exec()
  .then(function successfullySaveArticle(art) {
    console.log(art.url + " (" + art.title + ") saved at " + art.scraped_at);
    return art;
  }, function failToUpdateArticle(err) {
    console.error('failToUpdateArticle', err);
  });
};

ScrapeSite.prototype.down0DayFiles = function(startPage, pageStart, pageEnd) {
  var driver = this.driver;
  return this.login0Day().then(function() {
    return this.scrapePaginate(startPage, pageStart, pageEnd)
  }.bind(this)).then(function(recs) {
    driver.get('http://www.0daydown.com/account');
    driver.findElement(by.linkText('登出')).then(function(elem) {
      elem.click();
      driver.sleep(10*100);
      driver.quit();
      console.log("Closed");
      mongoose.disconnect();
    }, function() {});
  }.bind(this));
};

module.exports = ScrapeSite;
