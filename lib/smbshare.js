var config = require('../config/config.js')
  , Promise = require("bluebird")
  , SMB2 = require("SMB2")
  , fs = require('fs');

// create an SMB2 instance
/*var smb2Client = new SMB2({
  share: config.smbshare.share
, domain: config.smbshare.domain
, username: config.smbshare.user
, password: config.smbshare.pass
});

var smb2Cli = Promise.promisifyAll(smb2Client);
console.log(smb2Cli.readdir)
smb2Client.readdir('Download',function(err, files){
    console.log(err);
    console.log(files.length);
});
*/

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


var files = getFiles('/Volumes/H/Download');
console.log(files.length);

fs.writeFileSync('downloadedFiles.json', JSON.stringify(files))

function getFilesWithoutSubDir(dir) {
  var files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + '/' + files[i];
    if (!fs.statSync(name).isDirectory()) {
      files_.push(name);
    }
  }
  return files_;
}

var f = getFilesWithoutSubDir('/Volumes/H/Download');
console.log(f.length);

fs.writeFileSync('downloadedFilesWithoutSubDir.json', JSON.stringify(f))
