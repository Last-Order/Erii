# Erii

![](./logo.png)

[![npm version](https://badge.fury.io/js/erii.svg)](https://badge.fury.io/js/erii)

## Installation
`npm install erii --save`
## Usage

```JavaScript
const Erii = require('erii');

Erii.setMetaInfo({
    version: '0.0.1',
    name: 'example'
});

// Bind commands
Erii.bind({
    name: ['help', 'h'], // `h` will be set as an alias
    description: 'Show Help', // command description
    argument: {
        name: 'command',
        description: 'query help of a specified command'
    }
}, (ctx, options) => {
    ctx.showHelp(); // show help text
});

// add options for `help` command
Erii.addOption({
    name: ['verbose', 'debug'], 
    command: 'help', // bind to command
    description: 'debug output', // option description
    argument: { // definition of option argument
        name: 'level',
        description: 'level of debug output'
    }
});

Erii.addOption({
    name: ['test'],
    // without binding to a specified command,
    // this option will be set as a common option.
    description: 'show test information',
    argument: {
        name: 'test-argument',
        description: 'test argument'
    }
});

Erii.start(); // don't forget to start Erii.
```

**Example**

Call with 

`node index.js --help xxx --debug 1`

```Javascript
// ...
// PART OF CODE
Erii.bind({
    name: ['help', 'h'], 
    description: 'Show Help',
    argument: {
        name: 'command',
        description: 'query help of a specified command'
    }
}, (ctx, options) => {
    const { debug } = options;
    console.log(debug);  // '1'
    console.log(ctx.getArgument()); // 'xxx'
});

Erii.addOption({
    name: ['verbose', 'debug'],
    description: 'show verbose output',
    argument: {
        name: 'level',
        description: 'level of verbose output'
    }
});

Erii.start();
```


**Help Text**
```
example / 0.0.1

Help:
     Commands                      Description                   Alias

     --help <command>              Show Help                     --h
         <command>                 query help of a specified comm

Options:

     Options                       Description
     --verbose, debug <level>      show verbose output
         <level>                   level of verbose output
```