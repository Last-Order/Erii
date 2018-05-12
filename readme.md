# Erii

![](./logo.png)

[![npm version](https://badge.fury.io/js/erii.svg)](https://badge.fury.io/js/erii)

## Usage

```JavaScript
const Erii = require('erii');

Erii.setMetaInfo({
    version: '0.0.1',
    name: 'example'
});

Erii.bind({
    name: 'help',
    description: 'Show Help',
}, (ctx) => {
    ctx.showHelp();
})
```

```bash
node index.js --help
```