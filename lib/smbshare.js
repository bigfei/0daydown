var config = require('../config/config.js')
  , Promise = require("bluebird")
  , SMB2 = require("SMB2")
  , path = require('path')
  , fs = Promise.promisifyAll(require('fs'))
  , _ = require('underscore');

// create an SMB2 instance
/*var smb2Client = new SMB2({
  share: config.smbshare.share
, domain: config.smbshare.domain
, username: config.smbshare.user
, password: config.smbshare.pass
});

console.log(smb2Cli.readdir)
smb2Client.readdir('Download',function(err, files){
    console.log(err);
    console.log(files.length);
});
*/

function readDir(dirName) {
  return fs.readdirAsync(dirName).map(function(fileName) {
    var p = path.join(dirName, fileName);
    return fs.statAsync(p).then(function(stat) {
      return stat.isDirectory() ? readDir(p) : p;
    });
  }).reduce(function(a, b) {
    return a.concat(b);
  }, []);
}

function getFiles(dir, files_) {
  files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
}

function getFilesWithoutSubDir(dir) {
  var files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + '/' + files[i];
    if (fs.statSync(name).isFile()) {
      files_.push(name);
    }
  }
  return files_;
}


exports.fetchSambaFilenames = function(dir) {
  console.log(dir)
  return readDir(dir).then(function(files) {
    console.log("Including the sub dir files, there is " + files.length + " inside sharing.");
    fs.writeFileSync(path.resolve(__dirname, '..', 'downloadedFiles.json'), JSON.stringify(files))

    var f = getFilesWithoutSubDir(dir);
    console.log("Without sub dir, there is " + f.length + " inside sharing.");
    fs.writeFileSync(path.resolve(__dirname, '..', 'downloadedFilesWithoutSubDir.json'), JSON.stringify(f));

    return files;
  }, function(err) {
    console.error("Cannot read dir of " + dir + ".")
    console.log(err);
  });
}

exports.smbshareAlreadyExistedFiles = function(withoutSubDir) {
  var file = withoutSubDir ? "downloadedFilesWithoutSubDir.json" : "downloadedFiles.json";
  var contents = fs.readFileSync(path.resolve(__dirname, "..", file), 'utf8');
  var filenames = _.map(JSON.parse(contents), function(e) {
    return path.basename(e)
  });
  return filenames;
};

exports.filenamesOnly = function(files) {
  return _.map(files, function(e) {
    return path.basename(e)
  });
}
