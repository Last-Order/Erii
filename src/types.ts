import type validator from "validator";

/** Raw values the CLI parser may return; generic declarations do not convert them. */
export type ArgumentValue = string | number | boolean | ArgumentValue[] | { [key: string]: ArgumentValue };

/** Raw options stored internally, before narrowing to a command schema. */
export type CommandOptions = Record<string, ArgumentValue | undefined>;

export interface ParsedArguments extends CommandOptions {
    _: Array<string | number>;
}

export type CommandHandler = (ctx: CommandCtx, options: CommandOptions) => unknown;

export type LifecycleHandler = () => unknown;

/** Custom validators receive raw values and return false when validation fails. */
export type ArgumentValidator = (value: ArgumentValue | undefined, logger: (message: string) => void) => boolean;

/** Only validator.js methods callable with a single string and returning a boolean are allowed. */
export type ValidatorName = {
    [K in keyof typeof validator]: (typeof validator)[K] extends (value: string) => boolean ? K : never;
}[keyof typeof validator];

export interface MetaInfo {
    version?: string;
    name?: string;
}

/** Internal command registration, including alias redirects and runtime handlers. */
export interface Command {
    name: string | string[];
    description?: string;
    argument?: Argument;
    alias?: string[];
    redirect?: string;
    options?: Option[];
    handler?: CommandHandler;
}

export interface Option {
    name: string | string[];
    description?: string;
    command?: string;
    argument?: Argument;
}

export interface CommandMap {
    [key: string]: Command | undefined;
}

/** The runtime context uses raw values; consumers obtain schema types through TypedCommandCtx. */
export interface CommandCtx {
    showVersion: () => void;
    showHelp: () => void;
    getArgument: (commandName?: string) => ArgumentValue | undefined;
}

/** Argument metadata and runtime validation rules for a command or option. */
export interface Argument {
    name: string;
    description: string;
    validate?: ValidatorName | ArgumentValidator;
}

type SchemaCommands<Schema> = Schema extends { commands: infer Commands } ? Commands : never;

type LocalOptions<Command> = Command extends { options?: infer Options } ? NonNullable<Options> : {};

type CommonOptions<Schema> = Schema extends { commonOptions?: infer Options } ? NonNullable<Options> : {};

type SchemaOptionValues<Options> = {
    [Name in keyof Options]: ArgumentValue | undefined;
};

type SchemaCommand<Command> = {
    argument?: ArgumentValue;
    options?: SchemaOptionValues<LocalOptions<Command>>;
    aliases?: string;
};

type DefaultSchema = {
    commands: Record<string, { options?: CommandOptions }>;
    commonOptions?: CommandOptions;
};

/**
 * Compile-time schema constraints, with no role in runtime parsing or validation.
 * Checks the supplied schema's own keys, supporting named interfaces without widening valid names.
 */
export interface EriiSchema<Schema = DefaultSchema> {
    commonOptions?: SchemaOptionValues<CommonOptions<Schema>>;
    commands: {
        [Name in keyof SchemaCommands<Schema>]: SchemaCommand<SchemaCommands<Schema>[Name]>;
    };
}

export type CommandName<Schema extends EriiSchema<Schema>> = Extract<keyof Schema["commands"], string>;

type CommandAliases<Command> = "aliases" extends keyof Command ? Extract<Command["aliases"], string> : never;

/** All valid command lookup names, including aliases declared in the schema. */
export type CommandLookup<Schema extends EriiSchema<Schema>> = {
    [Name in CommandName<Schema>]: Name | CommandAliases<Schema["commands"][Name]>;
}[CommandName<Schema>];

/** Resolves a primary name or alias to its command key in the schema. */
type ResolveCommand<Schema extends EriiSchema<Schema>, Lookup extends CommandLookup<Schema>> = {
    [Name in CommandName<Schema>]: Lookup extends Name | CommandAliases<Schema["commands"][Name]> ? Name : never;
}[CommandName<Schema>];

/** Detects argument declarations by key presence, preserving the optional value type of argument?: T. */
type CommandArgument<Command> = "argument" extends keyof Command ? Command["argument"] : ArgumentValue;

type LowerLetter =
    "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

/** Generates candidate camelCase names for kebab-case keys; underscores are not converted. */
type CamelKey<Key extends string> = Key extends `${infer Head}-${infer Letter}${infer Tail}`
    ? Letter extends LowerLetter
        ? `${Head}${Uppercase<Letter>}${CamelKey<Tail>}`
        : `${Head}-${CamelKey<`${Letter}${Tail}`>}`
    : Key;

type KebabLetter<Letter extends string> = Letter extends Uppercase<LowerLetter> ? `-${Lowercase<Letter>}` : Letter;

type KebabTail<Key extends string> = Key extends `${infer Head}${infer Tail}` ? `${KebabLetter<Head>}${KebabTail<Tail>}` : Key;

/** Matches runtime toKebabCase: lowercases the first letter and inserts hyphens before subsequent uppercase ASCII letters. */
type KebabKey<Key extends string> = Key extends `${infer Head}${infer Tail}` ? `${Lowercase<Head>}${KebabTail<Tail>}` : Key;

/** Only candidates that the proxy can resolve back to the original key are valid aliases. */
type CamelAliases<Options> = {
    [Name in Extract<keyof Options, string>]: KebabKey<CamelKey<Name>> extends Name ? CamelKey<Name> : never;
}[Extract<keyof Options, string>];

type OptionValue<Options, Name> = Name extends keyof Options ? Options[Name] : never;

type FallbackOptionValue<Options, Name> = Name extends string ? OptionValue<Options, KebabKey<Name>> : never;

/**
 * Matches proxy reads: checks the original key first, then falls back to the kebab-case key when absent.
 * Name collisions may yield either value; any option may be omitted.
 */
type ProxiedOptions<Options> = {
    readonly [Name in keyof Options | CamelAliases<Options>]?: OptionValue<Options, Name> | FallbackOptionValue<Options, Name>;
};

/** Common option names take precedence and are excluded from command-specific declarations. */
type ScopedOptions<Schema extends EriiSchema<Schema>, Name extends CommandName<Schema>> = Omit<
    LocalOptions<Schema["commands"][Name]>,
    keyof CommonOptions<Schema>
>;

/** Options available to a handler: command-specific options, common options, and camelCase aliases. */
export type TypedCommandOptions<Schema extends EriiSchema<Schema>, Name extends CommandName<Schema>> = ProxiedOptions<
    ScopedOptions<Schema, Name> & CommonOptions<Schema>
>;

/** Reads the current command's argument when no name is supplied, or the argument of the named command or alias. */
export interface TypedCommandCtx<Schema extends EriiSchema<Schema>, Name extends CommandName<Schema>> {
    showVersion: () => void;
    showHelp: () => void;
    getArgument(): CommandArgument<Schema["commands"][Name]> | undefined;
    getArgument<Lookup extends CommandLookup<Schema>>(name: Lookup): LookupArgument<Schema, Lookup> | undefined;
}

/** Provides context and option types matching the specified command for independently defined handlers. */
export type TypedCommandHandler<Schema extends EriiSchema<Schema>, Name extends CommandName<Schema>> = (
    ctx: TypedCommandCtx<Schema, Name>,
    options: TypedCommandOptions<Schema, Name>,
) => unknown;

/** Argument metadata is required, optional, or forbidden according to the schema declaration. */
type ArgumentDefinition<Command> = "argument" extends keyof Command
    ? {} extends Pick<Command, "argument">
        ? { argument?: Argument }
        : { argument: Argument }
    : { argument?: never };

/** bind configuration: the first name must be the primary command name; subsequent names must be its aliases. */
export type TypedCommand<Schema extends EriiSchema<Schema>, Name extends CommandName<Schema>> = {
    name: Name | readonly [Name, ...CommandAliases<Schema["commands"][Name]>[]];
    description?: string;
} & ArgumentDefinition<Schema["commands"][Name]>;

type OptionDefinition<Name extends string> = {
    name: Name | readonly [Name, ...string[]];
    description?: string;
    argument?: Argument;
};

/** Generates a separate configuration for each option, preserving the association between its name and command scope. */
type OptionDefinitions<Options, Scope> = {
    [Name in Extract<keyof Options, string>]: OptionDefinition<Name> & Scope;
}[Extract<keyof Options, string>];

type ScopedOptionDefinitions<Schema extends EriiSchema<Schema>> = {
    [Name in CommandName<Schema>]: OptionDefinitions<ScopedOptions<Schema, Name>, { command: Name | CommandAliases<Schema["commands"][Name]> }>;
}[CommandName<Schema>];

/** addOption configuration: common options omit command; scoped options must specify their owning command or alias. */
export type TypedOption<Schema extends EriiSchema<Schema>> = OptionDefinitions<CommonOptions<Schema>, { command?: never }> | ScopedOptionDefinitions<Schema>;

/** Internal lookup result for Erii.getArgument; the method signature separately accounts for missing values. */
export type LookupArgument<Schema extends EriiSchema<Schema>, Lookup extends CommandLookup<Schema>> = CommandArgument<
    Schema["commands"][ResolveCommand<Schema, Lookup>]
>;
