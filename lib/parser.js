"use strict";
var ap = require('argparse').ArgumentParser;
  , pkgObj = require('../../package.json')
  , path = require('path')
  , _ = require('underscore');

var args = [
  [['-m', '--mode'], {
    required: false
  , defaultValue: null
  , help: 'mode'
  , nargs: 0
  }],

  [['--localizable-strings-dir'], {
    required: false
  , dest: 'localizableStringsDir'
  , defaultValue: 'en.lproj'
  , help: 'IOS only: the relative path of the dir where Localizable.strings file resides '
  , example: "en.lproj"
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