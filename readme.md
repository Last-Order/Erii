# Erii

![](./logo.png)

[![npm version](https://badge.fury.io/js/erii.svg)](https://badge.fury.io/js/erii)

## Installation
`npm install erii --save`
This package is ESM-only and requires Node.js 22.18 or later. Use `import` from an ESM project (`"type": "module"` in package.json, or an `.mjs` file).

## Development

- `npm run build`: bundle ESM and TypeScript declarations with tsdown.
- `npm run typecheck`: check source and consumer types in strict mode.
- `npm test`: build, check types, and run regression tests.

## TypeScript

The package exports `Command`, `Option`, `Argument`, `CommandCtx`, `CommandHandler`, `CommandOptions`, `ArgumentValue`, `ArgumentValidator`, `ValidatorName`, `ParsedArguments`, and `MetaInfo` types. Handler options are always provided; individual options and `getArgument()` can be `undefined`. Values retain the parser's strings, numbers, booleans, arrays, and nested objects, so narrow them before use. String validators accept only validator.js methods callable with one string and returning a boolean.

## Usage

```JavaScript
import Erii from 'erii';

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
    const { verbose } = options; // option aliases use the primary name
    console.log(verbose); // 1
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

**Argument Validation**

Argument validation are based on [validator.js](https://github.com/chriso/validator.js/).

`Erii.validator` points to a `validator` exported by `validator.js`.

Erii can validate arguments automatically.

Define the validate methods in `argument` parameter.

```JavaScript
Erii.addOption({
    name: ['verbose', 'debug'],
    description: 'show verbose output',
    argument: {
        name: 'level',
        description: 'level of verbose output',
        validate: 'isInt'
    }
});
```

`validate` can also be a function, for example:

```JavaScript
Erii.addOption({
    name: ['verbose', 'debug'],
    description: 'show verbose output',
    argument: {
        name: 'level',
        description: 'level of verbose output',
        validate: (value) => Erii.validator.isInt(String(value))
    }
});
```

`argument.validate` works in both command and option definitions.

**Example Output for Argument Validation**

```
PS D:\Git\erii.test> node index.js --help --verbose f
Argument validation failed for option 'verbose'.
<level> should be a/an Int.
```