import Erii, { type EriiSchema, type TypedCommandOptions } from "erii";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

type CamelCLI = {
    commonOptions: { "log-level"?: string };
    commands: {
        run: { options: { "dry-run": boolean; "output-file-path"?: string; snake_case?: number; "foo-Bar"?: number } };
        help: {};
    };
};
const camel = new Erii<CamelCLI>();
camel.bind({ name: "run" }, (_, options) => {
    const dry: boolean | undefined = options.dryRun;
    const original: boolean | undefined = options["dry-run"];
    const path: string | undefined = options.outputFilePath;
    const level: string | undefined = options.logLevel;
    // @ts-expect-error The proxy does not convert underscores to hyphens.
    options.snakeCase;
    // @ts-expect-error The proxy's kebab-case lookup is case-sensitive.
    options.fooBar;
    // @ts-expect-error Unknown names remain forbidden.
    options.unknown;
});
camel.bind({ name: "help" }, (_, options) => {
    const level: string | undefined = options.logLevel;
    // @ts-expect-error Scoped camel aliases do not leak into other commands.
    options.dryRun;
});
camel.addOption({ command: "run", name: "dry-run" });
// @ts-expect-error Registration still uses a declared primary name.
camel.addOption({ command: "run", name: "dryRun" });
type CollisionCLI = { commands: { run: { options: { dryRun?: string; "dry-run": boolean } } } };
type CollisionOptions = TypedCommandOptions<CollisionCLI, "run">;
type CollisionFallback = Assert<Equal<CollisionOptions["dryRun"], string | boolean | undefined>>;
type OriginalKey = Assert<Equal<CollisionOptions["dry-run"], boolean | undefined>>;

interface RunOptions {
    verbose?: boolean;
    "output-path"?: string;
}
interface GlobalOptions {
    quiet?: boolean;
}
interface RunCommand {
    options?: RunOptions;
    argument?: string;
    aliases?: "r";
}
interface Commands {
    run: RunCommand;
    help: {};
}
interface CLI {
    commands: Commands;
    commonOptions?: GlobalOptions;
}
const composed = new Erii<CLI>();
composed.bind(
    { name: ["run", "r"], argument: { name: "path", description: "", validate: (value) => value === undefined || typeof value === "string" } },
    (ctx, options) => {
        const verbose: boolean | undefined = options.verbose;
        const quiet: boolean | undefined = options.quiet;
        const output: string | undefined = options.outputPath;
        const argument: string | undefined = ctx.getArgument();
        const alias: string | undefined = ctx.getArgument("r");
        // @ts-expect-error Interface schemas must retain their closed key set.
        options.unknown;
    },
);
composed.addOption({ command: "run", name: "verbose" });
composed.addOption({ name: "quiet" });
// @ts-expect-error Named interfaces must not widen command names to string.
composed.bind({ name: "unknown" }, () => {});
// @ts-expect-error Named interfaces must not widen option names to string.
composed.addOption({ command: "run", name: "unknown" });
// @ts-expect-error Scoped option ownership remains checked.
composed.addOption({ command: "help", name: "verbose" });
const shape: EriiSchema<CLI> = { commands: { run: {}, help: {} }, commonOptions: { quiet: true } };

interface OptionalArgumentCommand {
    argument?: string;
    aliases: "o";
}
interface OptionalCommands {
    run: OptionalArgumentCommand;
    count: { argument: number | undefined };
    help: {};
}
interface OptionalCLI {
    commands: OptionalCommands;
}
const optional = new Erii<OptionalCLI>();
optional.bind(
    { name: ["run", "o"], argument: { name: "path", description: "", validate: (value) => value === undefined || typeof value === "string" } },
    (ctx) => {
        const value: string | undefined = ctx.getArgument();
        const alias: string | undefined = ctx.getArgument("o");
        // @ts-expect-error Optional arguments can be absent.
        const required: string = ctx.getArgument();
    },
);
optional.bind({ name: "run" }, () => {});
optional.bind({ name: "count", argument: { name: "count", description: "" } }, (ctx) => {
    const value: number | undefined = ctx.getArgument();
});
const lookup: string | undefined = optional.getArgument("run");
const aliasLookup: string | undefined = optional.getArgument("o");
type OptionalValue = Assert<Equal<typeof aliasLookup, string | undefined>>;
// @ts-expect-error Undeclared arguments remain forbidden.
optional.bind({ name: "help", argument: { name: "path", description: "" } }, () => {});

// Structural validation still rejects invalid values without requiring index signatures.
interface InvalidOptions {
    callback: () => void;
}
interface InvalidCommand {
    options: InvalidOptions;
}
interface InvalidCLI {
    commands: { run: InvalidCommand };
}
// @ts-expect-error Function option values are not ArgumentValue.
new Erii<InvalidCLI>();
// @ts-expect-error Invalid common option values are rejected.
new Erii<{ commands: { run: {} }; commonOptions: { bad: symbol } }>();
// @ts-expect-error Command argument types must remain valid.
new Erii<{ commands: { run: { argument: symbol } } }>();
// @ts-expect-error Command aliases must be strings.
new Erii<{ commands: { run: { aliases: 42 } } }>();
// @ts-expect-error Command descriptions must be objects.
new Erii<{ commands: { run: number } }>();
// @ts-expect-error A schema requires commands.
new Erii<{ commonOptions: { verbose: boolean } }>();
