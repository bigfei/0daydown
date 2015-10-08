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
  parser = require('./lib/parser.js')(),
  smbshare = require('./lib/smbshare.js');

mongoose.Promise = require('bluebird');
var db = mongoose.connect(config.db);

mongoose.set('debug', function (coll, method, query, doc) {
 //console.log(coll + " " + method + " " + JSON.stringify(query) + " " + JSON.stringify(doc));
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
  var browserNum = args.browserNum, fromOffset = args.fromOffset, pages = args.pages;
  var allScrapes = [];
  var createScrape = function(i) {
    var flow = new webdriver.promise.ControlFlow()
      .on('uncaughtException', function(e) {
        console.log('uncaughtException in flow %d: %s', i, e);
      }).on('idle', function() {
        console.log("All tasks handled by ControlFlow(" + i + ") have been successfully executed.")
      });
    var driver = buildDriver(flow);
    var scrapeSite = new ScrapeSite(driver);

    return scrapeSite.scrape0DayDownSite('http://www.0daydown.com/', fromOffset - 1 + pages * i + 1, fromOffset - 1 + pages * (i + 1));
  }

  for (var i = 0; i < browserNum; i++) {
    allScrapes.push(createScrape(i));
  }

  return webdriver.promise.all(allScrapes).then(function() {
    console.log("All browsers are closed, closing mongodb connection.")
    mongoose.disconnect();
  });
};

var startUpdateSamba = function(path) {
  smbshare.fetchSambaFilenames(path, true).then(function(files) {
    var filenames = smbshare.filenamesOnly(files);
    Article.updateFilesExistence(filenames, true).then(function(articles) {
      console.log(articles.length);
      mongoose.disconnect();
    });
  });
};

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
    return scrapeSite.scrapeArticle(url);
  }).then(function(article) {
    return scrapeSite.saveArticle(article);
  }).then(function() {
    scrapeSite.logoff0Day();
    driver.quit();
    mongoose.disconnect();
  });
}


if(args.article){
  startScrapeArticle(args.article)
}else if(args.updateSamba){
  startUpdateSamba(args.updateSamba);
}else{
  startScrape();
};

//
/*Article.updateFilesExistence(["opSySaH1212.part1.rar", "opSySaH1212.part2.rar", "How_It_Works_Annual_-_Volume_6_2015-P2P.rar"], false).then(function(art) {
  console.log(art);
  mongoose.disconnect();
});

Article.find({
      $or:[{'baidupan.0': {$exists: false}},{'baidupan.f.0':{$exists: false}}],
      $and:[{url:{$nin:["http://www.0daydown.com/06/303644.html", "http://www.0daydown.com/06/369155.html", "http://www.0daydown.com/06/375061.html", "http://www.0daydown.com/06/379035.html", "http://www.0daydown.com/06/379036.html", "http://www.0daydown.com/06/379118.html", "http://www.0daydown.com/06/379206.html", "http://www.0daydown.com/06/379241.html", "http://www.0daydown.com/06/379243.html", "http://www.0daydown.com/06/379253.html", "http://www.0daydown.com/06/379254.html", "http://www.0daydown.com/06/380061.html", "http://www.0daydown.com/06/380132.html", "http://www.0daydown.com/06/380133.html", "http://www.0daydown.com/07/18333.html" , "http://www.0daydown.com/07/306332.html", "http://www.0daydown.com/08/219737.html", "http://www.0daydown.com/08/328435.html", "http://www.0daydown.com/08/400233.html", "http://www.0daydown.com/08/403778.html", "http://www.0daydown.com/08/404492.html", "http://www.0daydown.com/08/406920.html", "http://www.0daydown.com/08/412137.html", "http://www.0daydown.com/08/414783.html", "http://www.0daydown.com/08/415932.html", "http://www.0daydown.com/08/80889.html" , "http://www.0daydown.com/09/419188.html", "http://www.0daydown.com/09/422243.html", "http://www.0daydown.com/09/49033.html" , "http://www.0daydown.com/09/90483.html"
        ]}}, {category:{$ne:'Music/音乐'}}, {content: new RegExp("baidu", 'i')}]
    }).then(function(arts){
      var urls = _.pluck(arts, 'url');
      console.log(urls);
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
        return scrapeSite.scrapeArticles(urls);
      }).then(function() {
        scrapeSite.logoff0Day();
        driver.quit();
        mongoose.disconnect();
      });
    })*/


