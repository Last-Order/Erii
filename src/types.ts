import type validator from 'validator';

/** CLI 解析器可能返回的原始值；泛型声明不会转换这些值。 */
export type ArgumentValue =
    | string
    | number
    | boolean
    | ArgumentValue[]
    | { [key: string]: ArgumentValue };

/** 内部存储的原始 options，尚未按命令 schema 收窄。 */
export type CommandOptions = Record<string, ArgumentValue | undefined>;

export interface ParsedArguments extends CommandOptions {
    _: Array<string | number>;
}

export type CommandHandler = (ctx: CommandCtx, options: CommandOptions) => unknown;

export type LifecycleHandler = () => unknown;

/** 自定义校验接收原始值，返回 false 表示校验失败。 */
export type ArgumentValidator = (
    value: ArgumentValue | undefined,
    logger: (message: string) => void,
) => boolean;

/** 只允许可用单个字符串调用、返回 boolean 的 validator.js 方法。 */
export type ValidatorName = {
    [K in keyof typeof validator]: typeof validator[K] extends (value: string) => boolean ? K : never;
}[keyof typeof validator];

export interface MetaInfo {
    version?: string;
    name?: string;
}

/** 内部命令注册记录，也包含别名重定向和运行时 handler。 */
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

/** 运行时上下文使用原始值；使用者通过 TypedCommandCtx 获取 schema 类型。 */
export interface CommandCtx {
    showVersion: () => void;
    showHelp: () => void;
    getArgument: (commandName?: string) => ArgumentValue | undefined;
}

/** 命令或 option 的参数说明及原有运行时校验规则。 */
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
 * 编译期 schema 约束，不参与运行时解析或校验。
 * 按传入 schema 自身的键检查结构，允许具名 interface，且不放宽合法名称。
 */
export interface EriiSchema<Schema = DefaultSchema> {
    commonOptions?: SchemaOptionValues<CommonOptions<Schema>>;
    commands: {
        [Name in keyof SchemaCommands<Schema>]: SchemaCommand<SchemaCommands<Schema>[Name]>;
    };
}

export type CommandName<Schema extends EriiSchema<Schema>> = Extract<keyof Schema['commands'], string>;

type CommandAliases<Command> = 'aliases' extends keyof Command ? Extract<Command['aliases'], string> : never;

/** 所有允许查找的命令名称，包括 schema 声明的别名。 */
export type CommandLookup<Schema extends EriiSchema<Schema>> = {
    [Name in CommandName<Schema>]: Name | CommandAliases<Schema['commands'][Name]>;
}[CommandName<Schema>];

/** 将主名称或别名还原到 schema 中的命令键。 */
type ResolveCommand<
    Schema extends EriiSchema<Schema>,
    Lookup extends CommandLookup<Schema>,
> = {
    [Name in CommandName<Schema>]: Lookup extends Name | CommandAliases<Schema['commands'][Name]>
        ? Name
        : never;
}[CommandName<Schema>];

/** 按键是否存在识别参数声明，保留 argument?: T 的可选值类型。 */
type CommandArgument<Command> = 'argument' extends keyof Command ? Command['argument'] : ArgumentValue;

type LowerLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm'
    | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';

/** 为 kebab-case 键生成 camelCase 候选名称；不转换下划线。 */
type CamelKey<Key extends string> = Key extends `${infer Head}-${infer Letter}${infer Tail}`
    ? Letter extends LowerLetter
        ? `${Head}${Uppercase<Letter>}${CamelKey<Tail>}`
        : `${Head}-${CamelKey<`${Letter}${Tail}`>}`
    : Key;

type KebabLetter<Letter extends string> = Letter extends Uppercase<LowerLetter>
    ? `-${Lowercase<Letter>}`
    : Letter;

type KebabTail<Key extends string> = Key extends `${infer Head}${infer Tail}`
    ? `${KebabLetter<Head>}${KebabTail<Tail>}`
    : Key;

/** 与运行时 toKebabCase 一致：首字母转小写，后续 ASCII 大写字母前加连字符。 */
type KebabKey<Key extends string> = Key extends `${infer Head}${infer Tail}`
    ? `${Lowercase<Head>}${KebabTail<Tail>}`
    : Key;

/** 只有能被代理反向查找到原始键的候选，才是可用别名。 */
type CamelAliases<Options> = {
    [Name in Extract<keyof Options, string>]: KebabKey<CamelKey<Name>> extends Name ? CamelKey<Name> : never;
}[Extract<keyof Options, string>];

type OptionValue<Options, Name> = Name extends keyof Options ? Options[Name] : never;

type FallbackOptionValue<Options, Name> = Name extends string ? OptionValue<Options, KebabKey<Name>> : never;

/**
 * 对齐代理的读取逻辑：先查原始键，缺失时查 kebab-case 键。
 * 同名冲突时两种值都可能出现；所有 option 都可能未传入。
 */
type ProxiedOptions<Options> = {
    readonly [Name in keyof Options | CamelAliases<Options>]?:
        OptionValue<Options, Name> | FallbackOptionValue<Options, Name>;
};

/** 公共 option 名称优先，命令内不重复声明这些名称。 */
type ScopedOptions<
    Schema extends EriiSchema<Schema>,
    Name extends CommandName<Schema>,
> = Omit<LocalOptions<Schema['commands'][Name]>, keyof CommonOptions<Schema>>;

/** handler 可读取的 option：命令专属项、公共项及 camelCase 别名。 */
export type TypedCommandOptions<
    Schema extends EriiSchema<Schema>,
    Name extends CommandName<Schema>,
> = ProxiedOptions<ScopedOptions<Schema, Name> & CommonOptions<Schema>>;

/** 不传名称时读取当前命令参数；传名称或别名时读取对应命令参数。 */
export interface TypedCommandCtx<
    Schema extends EriiSchema<Schema>,
    Name extends CommandName<Schema>,
> {
    showVersion: () => void;
    showHelp: () => void;
    getArgument(): CommandArgument<Schema['commands'][Name]> | undefined;
    getArgument<Lookup extends CommandLookup<Schema>>(name: Lookup): LookupArgument<Schema, Lookup> | undefined;
}

/** 为独立定义的 handler 提供与指定命令一致的上下文和 options 类型。 */
export type TypedCommandHandler<
    Schema extends EriiSchema<Schema>,
    Name extends CommandName<Schema>,
> = (
    ctx: TypedCommandCtx<Schema, Name>,
    options: TypedCommandOptions<Schema, Name>,
) => unknown;

/** 参数元数据随 schema 声明分为必填、可选和不允许三种情况。 */
type ArgumentDefinition<Command> = 'argument' extends keyof Command
    ? {} extends Pick<Command, 'argument'>
        ? { argument?: Argument }
        : { argument: Argument }
    : { argument?: never };

/** bind 配置：首项必须是命令主名称，后续项只能是该命令的别名。 */
export type TypedCommand<
    Schema extends EriiSchema<Schema>,
    Name extends CommandName<Schema>,
> = {
    name: Name | readonly [Name, ...CommandAliases<Schema['commands'][Name]>[]];
    description?: string;
} & ArgumentDefinition<Schema['commands'][Name]>;

type OptionDefinition<Name extends string> = {
    name: Name | readonly [Name, ...string[]];
    description?: string;
    argument?: Argument;
};

/** 为每个 option 生成独立配置，保留 option 名称与 command 作用域的关联。 */
type OptionDefinitions<Options, Scope> = {
    [Name in Extract<keyof Options, string>]: OptionDefinition<Name> & Scope;
}[Extract<keyof Options, string>];

type ScopedOptionDefinitions<Schema extends EriiSchema<Schema>> = {
    [Name in CommandName<Schema>]: OptionDefinitions<
        ScopedOptions<Schema, Name>,
        { command: Name | CommandAliases<Schema['commands'][Name]> }
    >;
}[CommandName<Schema>];

/** addOption 配置：公共项省略 command，专属项必须指定所属命令或别名。 */
export type TypedOption<Schema extends EriiSchema<Schema>> =
    OptionDefinitions<CommonOptions<Schema>, { command?: never }> | ScopedOptionDefinitions<Schema>;

/** 供 Erii.getArgument 使用的内部查找结果；缺失值由方法签名单独补上。 */
export type LookupArgument<
    Schema extends EriiSchema<Schema>,
    Lookup extends CommandLookup<Schema>,
> = CommandArgument<Schema['commands'][ResolveCommand<Schema, Lookup>]>;
