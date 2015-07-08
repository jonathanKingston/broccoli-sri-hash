# SRI for broccoli
[![npm status](http://img.shields.io/npm/v/broccoli-sri-hash.svg)](https://www.npmjs.org/package/broccoli-sri-hash)
[![dependency status](https://david-dm.org/jonathanKingston/broccoli-sri-hash.svg)](https://david-dm.org/jonathanKingston/broccoli-sri-hash)

This plugin looks at an apps html files to rewrite their content with integrity attributes.

### Options

- **crossorigin** - adds a crossorigin attribute to script and link elements
    - This is **required** for CORS resources values are:
        - `use-credentials`
        - `anonymous`
- **prepend** - resources with a full path will only get an applied integrity if the md5 checksum passes

### Example
```
var sriTree = sri('path/to/code, {
  prefix: 'https://example.com/',
  crossorigin: 'anonymous'
});
```

