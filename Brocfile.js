'use strict';
var sri = require('./index');

var test = sri('test/fixtures/input', {
  prefix: 'https://example.com/'
});

module.exports = test;
