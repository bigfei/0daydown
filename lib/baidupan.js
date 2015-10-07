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
  request = require('request');

var BaiduPan = function(driver){
  this.driver = driver;
}

var listXhrUrlTemplate = _.template('http://pan.baidu.com/share/list?uk=<%= uk %>&shareid=<%= shareid%>' +
  '&num=<%= num %>&page=<%= page %>&dir=<%= dir %>&order=time&desc=1&showempty=0&_=<%= t %>' +
  '&bdstoken=<%= token %>&channel=chunlei&clienttype=0&web=1&app_id=<%= appId %>');

var getPageSource = function(url, driver) {
  driver.get(url);
  return driver.getPageSource().then(function(src) {
    return cheerio.load(src);
  });
};

BaiduPan.prototype.loginPan = function() {
  var driver = this.driver;
  driver.get('http://pan.baidu.com');
  driver.manage().window().maximize();
  driver.wait(until.elementLocated(by.name('userName')), 10000);
  driver.findElement(by.name('userName')).sendKeys(config.baidupan.user);
  driver.findElement(by.name('password')).sendKeys(config.baidupan.pass);
  driver.findElement(by.name('memberPass')).click();
  driver.findElement(by.className('pass-button-submit')).click();
  return driver.wait(until.titleContains('全部文件'), 10000);
};

BaiduPan.prototype.inputSharePass = function(panUrl, pass, articleUrl) {
  var driver = this.driver;
  driver.get(panUrl);
  if (pass) {
    driver.findElement(by.id('accessCode')).then(function(elem) {
      elem.sendKeys(pass);
      driver.findElement(by.id('submitBtn')).click();
    }, function(err) {
      console.log("inputSharePass error in " + panUrl + " with pass( " + pass + " ) in articleUrl( " + articleUrl + " )");
      console.log(err);
      if (err.state && err.state === 'no such element') {
        console.log('Unable to locate: ' + err.message);
      }
    })
  }
}

BaiduPan.prototype.checkBaiduPan = function(panUrl, pass) {
  var driver = this.driver;
  this.inputSharePass(panUrl, pass);
  return driver.wait(until.elementLocated(by.css('div.bd-aside')), 10000).then(function() {
    return driver.getPageSource().then(function(src) {
      var $ = cheerio.load(src);
      var files = [];
      var r = /(.*\d)(\D)/;
      $('.module-list-view .list .item').map(function() {
        var f = $('.name-text.enabled', this).attr('data-name');
        var s = $("div.col[style='width: 16%']", this).text().trim();
        var m = s.match(r);
        var si = _.isNull(m)? 0 :humanFormat.parse(m[1] + m[2] + 'iB', {scale: 'binary'});
        files.push({filename: f, size: si})
      });

      if (_.isEmpty(files)) {
        var f = $('.title .file-name').text();
        var s = $('#downFileButton .global-icon-download').siblings().text().match(/下载\((.*)\)/)[1];
        var m = s.match(r);
        var si = _.isNull(m)? 0 :humanFormat.parse(m[1] + m[2] + 'iB', {scale: 'binary'});
        files.push({filename: f, size: si });
      }
      return files;
    })
  }, function(err) {
    console.log(err);
    driver.navigate().refresh();
    checkBaidupan(panUrl, pass);
  });
};

BaiduPan.prototype.downBaiduPan = function(panUrl, pass) {
  var driver = this.driver;
  this.checkBaidupan(panUrl, pass);
  driver.findElement(by.css('div.title div.col.c1 span.chk-ico')).then(function(chkico) {
    chkico.click(); //http://pan.baidu.com/s/1hqhHBdM#ci3n
    driver.wait(until.elementLocated(by.className('download-btn')), 10000);
    driver.sleep(2 * 1000);
    driver.findElement(by.className('download-btn')).click().then(function() {
      driver.findElement(by.id('_disk_id_14')).then(function(diskId14Elem) {
        diskId14Elem.click()
      }, function(err) {})
    });
  }, function(err) { //http://pan.baidu.com/s/1hqCmbek
    driver.findElement(by.id('downFileButton')).click();
  })
};

BaiduPan.prototype.yunDataToFiles = function(yunData) {
  var driver = this.driver;
  var panFiles = [];
  var fileToPanFile = function(file) {
    return {
      fs_id: file.fs_id,
      isdir: file.isdir,
      size: file.size,
      filename: file.server_filename,
      md5: file.md5,
      path: file.path,
      created_at: new Date(file.server_ctime * 1000),
      updated_at: new Date(file.server_mtime * 1000)
    }
  }

  _.each(yunData.FILEINFO, function(file) {
    panFiles.push(fileToPanFile(file));

    if (file.isdir) {
      var listUrl = listXhrUrlTemplate({
        uk: yunData.SHARE_UK,
        shareid: yunData.SHARE_ID,
        num: 100,
        page: 1,
        dir: encodeURIComponent(file.path),
        t: Date.now(),
        token: yunData.MYBDSTOKEN || '',
        appId: 250528
      });

      getPageSource(listUrl, driver).then(function($) {
        var filelist = JSON.parse($('pre').text()).list;
        _.each(filelist, function(f) {
          panFiles.push(fileToPanFile(f));
        })
      });
    }
  })
  return panFiles;
}

BaiduPan.prototype.checkBaiduPanByApi = function(panUrl, pass, articleUrl) {
  var driver = this.driver;
  this.inputSharePass(panUrl, pass, articleUrl);
  return driver.wait(until.elementLocated(by.css('div.bd-aside,#vers-update-new,div.module-error')), 10000).then(function() {
    driver.sleep(700);
    return driver.executeScript('return window.yunData ? yunData : ""').then(function(data) {
      if (data && data.FILEINFO) {
        var files = this.yunDataToFiles(data);
        return {files: files, uk: data.SHARE_UK, shareid: data.SHARE_ID}
      } else {
        return {files: [], uk: 0, shareid: 0}
      }
    }.bind(this), function(err) {
      console.warn("checkBaiduPanByApi executeScript error in panUrl: " + panUrl + " (articleUrl: " + articleUrl + ")");
      console.warn(err);
      driver.navigate().refresh();
      this.checkBaiduPanByApi(panUrl, pass, articleUrl);
    }.bind(this));
  }.bind(this), function(err) {
    console.warn("checkBaiduPanByApi find element error in panUrl: " + panUrl + " (articleUrl: " + articleUrl + ")");
    console.warn(err);
    driver.navigate().refresh();
    this.checkBaiduPanByApi(panUrl, pass, articleUrl);
  }.bind(this));
}


module.exports = BaiduPan;