"use strict";
var webdriver = require('selenium-webdriver'),
  until = webdriver.until,
  by = webdriver.By,
  cheerio = require('cheerio'),
  _ = require('underscore'),
  fs = require('fs'),
  bluebird = require('bluebird'),
  mongoose = require('mongoose'),
  Article = require('./lib/article.js'),
  config = require('./config/config.js'),
  BaiduPan = require('./lib/baidupan.js'),
  ScrapeSite = require('./lib/scrape_site.js'),
  parser = require('./lib/parser.js')();

mongoose.Promise = require('bluebird');
var db = mongoose.connect(config.db);

mongoose.set('debug', function (coll, method, query, doc) {
 console.log(coll + " " + method + " " + JSON.stringify(query) + " " + JSON.stringify(doc));
});

var args = null;

if (require.main === module) {
  args = parser.parseArgs();
}

console.log(args)

var buildDriver = function(flow) {
  var phantomjsCaps = webdriver.Capabilities.phantomjs();
  phantomjsCaps.set('phantomjs.cli.args', ['--load-images=false'])

  var chromeCaps = webdriver.Capabilities.chrome();
  chromeCaps.set('chromeOptions', {
    'prefs': {
      "profile.managed_default_content_settings.images": 2
    }
  });

  var driver = new webdriver.Builder()
    .withCapabilities(chromeCaps)
    .setControlFlow(flow)
    //.usingServer('http://oats4.local:4444/wd/hub')
    .build();

  return driver;
}

var startScrape = function() {
  var browserNum = args.browserNum, fromOffset = args.fromOffset, pages = args.pages
  for (var i = 0; i < browserNum; i++) {
    (function(n) {
      var flow = new webdriver.promise.ControlFlow()
        .on('uncaughtException', function(e) {
          console.log('uncaughtException in flow %d: %s', n, e);
        });
      var driver = buildDriver(flow);
      var scrapeSite = new ScrapeSite(driver);

      scrapeSite.scrape0DayDownSite('http://www.0daydown.com/', fromOffset -1 + pages * i + 1, fromOffset -1 + pages * (i + 1)).then(function(){
        mongoose.disconnect();
      });
    })(i);
  }
}

var startScrapeArticle = function(url) {
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

  scrapeSite.login0Day().then(function() {
    return scrapeSite.scrapeArticle('http://www.0daydown.com/10/436427.html');
  }).then(function(article) {
    return scrapeSite.saveArticle(article);
  }).then(function() {
    scrapeSite.logoff0Day();
  });
}

startScrape();
/*Article.updateFilesExistence(["opSySaH1212.part1.rar", "opSySaH1212.part2.rar", "How_It_Works_Annual_-_Volume_6_2015-P2P.rar"], true).then(function(art) {
  console.log(art);
  mongoose.disconnect();
});*/

