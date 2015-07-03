'use strict';
var Filter = require('broccoli-filter');
var sriToolbox = require("sri-toolbox");
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

function SRIHashAssets(inputTree, options) {
  if (!(this instanceof SRIHashAssets)) {
    return new SRIHashAssets(inputTree, options);
  }

  this.options = options || {};
  this.context = this.options.context || {};
  this.inputTree = inputTree;
}

SRIHashAssets.prototype = Object.create(Filter.prototype);
SRIHashAssets.prototype.constructor = SRIHashAssets;

SRIHashAssets.prototype.extensions = ['html'];
SRIHashAssets.prototype.targetExtension = 'html';

SRIHashAssets.prototype.addSRI = function addSRI(string, file) {
  var self = this;
  var scriptCheck = new RegExp('<script[^>]*src=["\']([^"]*)["\'][^>]*>', 'g');
  var linkCheck = new RegExp('<link[^>]*href=["\']([^"]*)["\'][^>]*>', 'g');
  var srcCheck = new RegExp('src=["\']([^"\']+)["\']');
  var hrefCheck = new RegExp('href=["\']([^"\']+)["\']');

  return string.replace(scriptCheck, function (match) {
    var src = match.match(srcCheck);
    var filePath = src[1];
    return self.mungeOutput(match, filePath, file);
  }).replace(linkCheck, function (match) {
    var href = match.match(hrefCheck);
    var filePath = href[1];
    return self.mungeOutput(match, filePath, file);
  });
};

SRIHashAssets.prototype.readFile = function readFile(dirname, file) {
  var assetSource;
  try {
    assetSource = fs.readFileSync(dirname + '/' + file).toString();
  } catch(e) {
    return null;
  }
  return assetSource;
}

SRIHashAssets.prototype.generateIntegrity = function generateIntegrity(output, file, dirname, external) {
  var assetSource = this.readFile(dirname, file);
  var integrity;
  var append;

  if (assetSource === null) {
    return output;
  }

  integrity = sriToolbox.generate({
    algorithms: ['sha256', 'sha512'],
  }, assetSource);

  append = ' integrity="' + integrity + '"';

  if (external && this.options.crossorigin) {
    append = append + ' crossorigin="' + this.options.crossorigin + '" ';
  }

  return output.replace(/\/?[>]$/, append + '/>');
};

SRIHashAssets.prototype.checkExternal = function checkExternal(output, file, dirname) {
  var md5Check = /^(.*)[-]([a-z0-9]{32})([.].*)$/;
  var md5Matches = file.match(md5Check);
  var md5sum = crypto.createHash('md5');
  var assetSource;
  var filePath;

  if (!('prefix' in this.options) || md5Matches === null) {
    return output;
  }

  filePath = file.replace(this.options.prefix, '');

  if (filePath === file) {
    return output;
  }

  assetSource = this.readFile(dirname, filePath);
  if (assetSource === null) {
    filePath = md5Matches[1].replace(this.options.prefix, '') + md5Matches[3];
    assetSource = this.readFile(dirname, filePath);
    if (assetSource === null) {
      return output;
    }
  }
  md5sum.update(assetSource);
  if (md5Matches[2] === md5sum.digest('hex')) {
    return this.generateIntegrity(output, filePath, dirname, true);
  }
  return output;
}

SRIHashAssets.prototype.mungeOutput = function mungeOutput(output, filePath, file) {
  var integrityCheck = new RegExp('integrity=["\']');

  if (/^https?:\/\//.test(filePath)) {
    return this.checkExternal(output, filePath, file);
  }
  if (!(integrityCheck.test(output))) {
    output = this.generateIntegrity(output, filePath, file);
  }
  return output;
}

SRIHashAssets.prototype.processFile = function (srcDir, destDir, relativePath) {
  this._srcDir = srcDir;

  var fileContent = fs.readFileSync(srcDir + '/' + relativePath);
  var self = this;
  fileContent = this.addSRI(fileContent.toString(), srcDir);

  return Promise.resolve().then(function () {
    var outputPath = self.getDestFilePath(relativePath);
    fs.writeFileSync(destDir + '/' + outputPath, fileContent);
  });
};

module.exports = SRIHashAssets;
