var chai = require('chai');
var assert = chai.assert;
var fs = require('fs');

describe('broccoli-sri-hash', function () {

  it('rule outputs match', function () {

    var fileTmpContents = fs.readFileSync('tmp/output/test.html', {encoding: 'utf8'});
    var fileContents = fs.readFileSync('test/fixtures/output/test.html', {encoding: 'utf8'});

    assert.equal(fileTmpContents.trim(), fileContents.trim());
  });
});
