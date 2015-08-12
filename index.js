var Filter = require('broccoli-filter');
var sriToolbox = require('sri-toolbox');
var fs = require('fs');
var crypto = require('crypto');
var styleCheck = /\srel=["\'][^"]*stylesheet[^"]*["\']/;
var srcCheck = /\ssrc=["\']([^"\']+)["\']/;
var hrefCheck = /\shref=["\']([^"\']+)["\']/;

function SRIHashAssets(inputNode, options) {
  if (!(this instanceof SRIHashAssets)) {
    return new SRIHashAssets(inputNode, options);
  }

  this.options = options || {};
  this.context = this.options.context || {};
  Filter.call(this, inputNode);

  if ('origin' in this.options) {
    if ('prefix' in this.options && !('crossorigin' in this.options)) {
      if (this.options.prefix.indexOf(this.options.origin, 0) === 0) {
        this.options.crossorigin = false;
      }
    }
  }
}

SRIHashAssets.prototype = Object.create(Filter.prototype);
SRIHashAssets.prototype.constructor = SRIHashAssets;

SRIHashAssets.prototype.extensions = ['html'];
SRIHashAssets.prototype.targetExtension = 'html';

SRIHashAssets.prototype.addSRI = function addSRI(string, file) {
  var that = this;
  var scriptCheck = new RegExp('<script[^>]*src=["\']([^"]*)["\'][^>]*>', 'g');
  var linkCheck = new RegExp('<link[^>]*href=["\']([^"]*)["\'][^>]*>', 'g');

  return string.replace(scriptCheck, function srcMatch(match) {
    var src = match.match(srcCheck);
    var filePath;

    if (!src) {
      return match;
    }

    filePath = src[1];

    return that.mungeOutput(match, filePath, file);
  }).replace(linkCheck, function hrefMatch(match) {
    var href = match.match(hrefCheck);
    var isStyle = styleCheck.test(match);
    var filePath;


    if (!isStyle || !href) {
      return match;
    }

    filePath = href[1];

    return that.mungeOutput(match, filePath, file);
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
};

SRIHashAssets.prototype.generateIntegrity = function generateIntegrity(output, file, dirname, external) {
  var crossoriginCheck = new RegExp('crossorigin=["\']([^"\']+)["\']');
  var assetSource = this.readFile(dirname, file);
  var selfCloseCheck = /\s*\/>$/;
  var integrity;
  var append;
  var outputWithIntegrity;

  if (assetSource === null) {
    return output;
  }

  integrity = sriToolbox.generate({
    algorithms: ['sha256', 'sha512']
  }, assetSource);

  append = ' integrity="' + integrity + '"';

  if (external && this.options.crossorigin) {
    if (!crossoriginCheck.test(output)) {
      append = append + ' crossorigin="' + this.options.crossorigin + '" ';
    }
  }

  if (selfCloseCheck.test(output)) {
    outputWithIntegrity = output.replace(selfCloseCheck, append + ' />');
  } else {
    outputWithIntegrity = output.replace(/\s*[>]$/, append + ' >');
  }
  return outputWithIntegrity;
};

SRIHashAssets.prototype.checkExternal = function checkExternal(output, file, dirname) {
  var md5Check = /^(.*)[-]([a-z0-9]{32})([.].*)$/;
  var md5Matches = file.match(md5Check);
  var md5sum = crypto.createHash('md5');
  var assetSource;
  var filePath;

  if (!('prefix' in this.options) || !('crossorigin' in this.options) || md5Matches === null) {
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
};

SRIHashAssets.prototype.mungeOutput = function mungeOutput(output, filePath, file) {
  var integrityCheck = new RegExp('integrity=["\']');
  var newOutput = output;

  if (/^https?:\/\//.test(filePath)) {
    return this.checkExternal(output, filePath, file);
  }
  if (!(integrityCheck.test(output))) {
    newOutput = this.generateIntegrity(output, filePath, file);
  }
  return newOutput;
};

SRIHashAssets.prototype.processFile = function processFile(srcDir, destDir, relativePath) {
  var fileContent = fs.readFileSync(srcDir + '/' + relativePath);
  var that = this;

  this._srcDir = srcDir;
  fileContent = this.addSRI(fileContent.toString(), srcDir);

  return Promise.resolve().then(function writeFileOutput() {
    var outputPath = that.getDestFilePath(relativePath);

    fs.writeFileSync(destDir + '/' + outputPath, fileContent);
  });
};

module.exports = SRIHashAssets;
