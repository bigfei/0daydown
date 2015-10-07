var SMB2 = require('smb2');

// create an SMB2 instance
var smb2Client = new SMB2({
  share:'\\\\000.000.000.000\\c$'
, domain:'DOMAIN'
, username:'username'
, password:'password!'
});