"use strict";
var ap = require('argparse').ArgumentParser
  , pkgObj = require('../package.json')
  , path = require('path')
  , _ = require('underscore');

var args = [
  [['-n', '--browserNum'], {
    defaultValue: 1
  , required: false
  , type: 'int'
  , help: 'Browser Number that will be used to scrape the site.'
  }],

  [['-p', '--pages'], {
    defaultValue: 5
  , required: false
  , type: 'int'
  , help: 'Pages that the browser would scrape for each session.'
  }],

   [['-f', '--fromOffset'], {
    defaultValue: 1
  , required: false
  , type: 'int'
  , help: 'From the page number offset to scrape, started from 1.'
  }]
];

// Setup all the command line argument parsing
module.exports = function () {
  var parser = new ap({
    version: pkgObj.version,
    addHelp: true,
    description: 'Zerodaydown'
  });

  _.each(args, function (arg) {
    parser.addArgument(arg[0], arg[1]);
  });

  parser.rawArgs = args;

  return parser;
};