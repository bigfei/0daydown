"use strict";
var webdriver = require('selenium-webdriver'),
  until = webdriver.until,
  by = webdriver.By,
  cheerio = require('cheerio'),
  _ = require('underscore'),
  fs = require('fs'),
  Article = require('./article.js'),
  config = require('./config/config.js'),
  humanFormat = require('human-format'),
  mongoose = require('mongoose'),
  BaiduPan = require('./baidupan.js'),
  ScrapeSite = require('./scrape_site.js');

var phantomjsCaps = webdriver.Capabilities.phantomjs();
phantomjsCaps.set('phantomjs.cli.args', ['--load-images=false'])

var db = mongoose.connect(config.db);

var browserNum = 1, pages = 2000, offsetFrom=3;
mongoose.set('debug', function (coll, method, query, doc) {
 console.log(coll + " " + method + " " + JSON.stringify(query) + " " + JSON.stringify(doc));
});

for (var i = 0; i < browserNum; i++) {
  (function(n) {
    var flow = new webdriver.promise.ControlFlow()
        .on('uncaughtException', function(e) {
          console.log('uncaughtException in flow %d: %s', n, e);
        });

    var chromeCaps = webdriver.Capabilities.chrome();
    chromeCaps.set('chromeOptions', {
      'prefs': {
        "profile.managed_default_content_settings.images": 2
      }
    });

    var driver = new webdriver.Builder()
      .withCapabilities(chromeCaps)
      .setControlFlow(flow)
      .usingServer('http://oats4.local:4444/wd/hub')
      .build();

    var scrapeSite = new ScrapeSite(driver);

    scrapeSite.down0DayFiles('http://www.0daydown.com/', offsetFrom + pages * i + 1, offsetFrom + pages * (i + 1));
  })(i);
}
/*
var chromeCaps = webdriver.Capabilities.chrome();
chromeCaps.set('chromeOptions', {
  'prefs': {
    "profile.managed_default_content_settings.images": 2
  }
});
var driver = new webdriver.Builder()
  .withCapabilities(chromeCaps)
  .build();
var baiduPan = new BaiduPan(driver);
var scrapeSite = new ScrapeSite(driver);

baiduPan.loginPan();
scrapeSite.login0Day().then(function() {
  return scrapeSite.scrapeArticle('http://www.0daydown.com/09/435677.html');
}).then(function(article) {
  return scrapeSite.saveArticle(article);
}).then(function() {
  console.log(art);
  driver.get('http://www.0daydown.com/account');
  driver.findElement(by.linkText('登出')).then(function(elem) {
    elem.click();
    driver.sleep(10 * 100);
    driver.quit();
    console.log("Closed");
    mongoose.disconnect();
  }, function() {});
});
/*Article.findByCategory('其他教程').then(function(art){
  console.log(art);
  mongoose.disconnect();
})*/

//