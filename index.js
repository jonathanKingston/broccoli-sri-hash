'use strict';
var Filter = require('broccoli-filter');
var sriToolbox = require("sri-toolbox");
var fs = require('fs');
var path = require('path');

function SRIHashAssets(inputTree, options) {
  if (!(this instanceof SRIHashAssets)) {
    return new SRIHashAssets(inputTree, options);
  }

  this.options = options || {};
  this.context = this.options.context || {};
  this.inputTree = inputTree;
}

function generateIntegrity(output, file, dirname) {
  var assetSource;
  var integrity;
  try {
    assetSource = fs.readFileSync(dirname + '/' + file).toString();
  } catch(e) {
    return output;
  }
 
  integrity = sriToolbox.generate({
    algorithms: ['sha256', 'sha512'],
  }, assetSource);
  return output.replace(/\/?[>]$/, ' integrity="' + integrity + '" />');
};

function addSRI(string, file) {
  var scriptCheck = new RegExp('<script[^>]*src=["\']([^"]*)["\'][^>]*>', 'g');
  var linkCheck = new RegExp('<link[^>]*href=["\']([^"]*)["\'][^>]*>', 'g');
  var integrityCheck = new RegExp('integrity=["\']');
  var srcCheck = new RegExp('src=["\']([^"\']+)["\']');
  var hrefCheck = new RegExp('href=["\']([^"\']+)["\']');

  return string.replace(scriptCheck, function (match) {
    var output = match;
    var src = match.match(srcCheck);
    var filePath = src[1];
    if (/^https?:\/\//.test(filePath)) {
      return output;
    }
    if (!(integrityCheck.test(output))) {
      output = generateIntegrity(output, filePath, file);
    }
    return output;
  }).replace(linkCheck, function (match) {
    var output = match;
    var href = match.match(hrefCheck);
    var filePath = href[1];
    if (/^https?:\/\//.test(filePath)) {
      return output;
    }
    if (!(integrityCheck.test(output))) {
      output = generateIntegrity(output, filePath, file);
    }
    return output;
  });
};

SRIHashAssets.prototype = Object.create(Filter.prototype);
SRIHashAssets.prototype.constructor = SRIHashAssets;

SRIHashAssets.prototype.extensions = ['html'];
SRIHashAssets.prototype.targetExtension = 'html';

SRIHashAssets.prototype.processFile = function (srcDir, destDir, relativePath) {
  this._srcDir = srcDir;

  var fileContent = fs.readFileSync(srcDir + '/' + relativePath);
  var self = this;
  fileContent = addSRI(fileContent.toString(), srcDir);

  return Promise.resolve().then(function () {
    var outputPath = self.getDestFilePath(relativePath);
    fs.writeFileSync(destDir + '/' + outputPath, fileContent);
  });
};

module.exports = SRIHashAssets;
