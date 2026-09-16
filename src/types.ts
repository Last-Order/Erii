import type validator from 'validator';

export type ArgumentValue = string | number | boolean | ArgumentValue[] | { [key: string]: ArgumentValue };
export type CommandOptions = Record<string, ArgumentValue | undefined>;
export interface ParsedArguments extends CommandOptions {
    _: Array<string | number>;
}
export type CommandHandler = (ctx: CommandCtx, options: CommandOptions) => unknown;
export type LifecycleHandler = () => unknown;
export type ArgumentValidator = (value: ArgumentValue | undefined, logger: (message: string) => void) => boolean;
export type ValidatorName = {
    [K in keyof typeof validator]: typeof validator[K] extends (value: string) => boolean ? K : never;
}[keyof typeof validator];
export interface MetaInfo {
    version?: string;
    name?: string;
}

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

export interface CommandCtx {
    showVersion: () => void;
    showHelp: () => void;
    getArgument: (commandName?: string) => ArgumentValue | undefined;
}

export interface Argument {
    name: string;
    description: string;
    validate?: ValidatorName | ArgumentValidator;
}
