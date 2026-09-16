# Erii

![](./logo.png)

## Installation

Use Node.js 22.18 or later and set `"type": "module"` in your `package.json`.

```sh
npm install erii
```

## Usage

Define your commands and options, register handlers, then call `start()`.

```ts
import Erii from "erii";

type CLI = {
    commonOptions: {
        verbose?: boolean;
    };
    commands: {
        build: {
            aliases: "b";
            argument: string;
            options: {
                outDir?: string;
                minify?: boolean;
            };
        };
        serve: {
            options: {
                port?: number;
                mode?: "dev" | "prod";
            };
        };
    };
};

const cli = new Erii<CLI>();
cli.setMetaInfo({ name: "example", version: "1.0.0" });

cli.bind(
    {
        name: ["build", "b"],
        description: "Build the project",
        argument: { name: "path", description: "Source directory" },
    },
    (ctx, options) => {
        const path = ctx.getArgument(); // string | undefined
        const output = options.outDir; // string | undefined
        const verbose = options.verbose; // boolean | undefined
        console.log({ path, output, verbose });
    },
);

cli.bind({ name: "serve" }, (_, options) => {
    console.log(options.port, options.mode);
});

cli.addOption({ name: ["verbose", "v"] });
cli.addOption({ command: "build", name: ["outDir", "out-dir", "o"] });
cli.addOption({ command: "b", name: "minify" });
cli.addOption({ command: "serve", name: "port" });
cli.addOption({
    command: "serve",
    name: "mode",
    argument: {
        name: "mode",
        description: "Server mode",
        validate: (value) => value === "dev" || value === "prod",
    },
});

cli.start(); // okite() is also available.
```

```sh
node index.js --build src --out-dir dist --verbose
node index.js serve --port 3000 --mode dev
```

## Aliases

Put the primary name first and aliases after it. Read options using the primary name, such as `options.outDir`.

```sh
node index.js -b src -o dist -v
```

## Reading arguments

Use `ctx.getArgument()` inside a handler, or look up a command by name:

```ts
const path = cli.getArgument("build");
if (path !== undefined) {
    console.log(path);
}
```

## Validation

Use `argument.validate` to check values with a validator.js method:

```ts
cli.addOption({
    command: "serve",
    name: "port",
    argument: { name: "port", description: "Listening port", validate: "isInt" },
});
```

To use a custom validator, return `true` for accepted input:

```ts
cli.addOption({
    command: "serve",
    name: "port",
    argument: {
        name: "port",
        description: "Listening port",
        validate: (value) => typeof value === "number" && value > 0 && value <= 65535,
    },
});
```

## Help and lifecycle

Register lifecycle handlers before calling `start()`:

```ts
cli.always(() => {
    console.log("Starting");
});

cli.default(() => {
    cli.showHelp(); // Show help when no arguments are supplied.
});

cli.showVersion();
cli.start();
```
