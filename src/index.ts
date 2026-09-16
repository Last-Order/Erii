import yargs from 'yargs-parser';
import CLI from 'clui';
import clc from 'cli-color';
import chalk from 'chalk';
import validator from 'validator';
import { createCamelProxifiedObject } from './utils/convert.js';

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
    argument?: Argument,
    alias?: string[],
    redirect?: string;
    options?: Option[];
    handler?: CommandHandler
}

export interface Option {
    name: string | string[];
    description?: string;
    command?: string;
    argument?: Argument,
}

export interface CommandMap {
    [key: string]: Command | undefined;
};

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

export class Erii {
    rawArguments: string[];
    parsedArguments: ParsedArguments;
    private version: string = "1.0.0";
    private name: string = "Erii";

    commands: CommandMap = {};
    commonOptions: Option[] = [];
    validator: typeof validator;
    alwaysHandler?: LifecycleHandler;
    defaultHandler?: LifecycleHandler;

    constructor() {
        this.rawArguments = process.argv.slice(2);
        this.parsedArguments = yargs(process.argv.slice(2), {
            configuration: {
                "boolean-negation": false
            }
        });
        this.validator = validator;

        // 不响应-后第二个字符起的命令
        for (const key of Object.keys(this.parsedArguments)) {
            if (key !== "_" && (!this.rawArguments.includes('--' + key) && !this.rawArguments.includes('-' + key))) {
                delete this.parsedArguments[key];
            }
        }
    }

    /**
     * 绑定命令处理函数
     * @param config
     * @param handler
     */
    bind(config: Command, handler: CommandHandler): void {
        if (config.name === undefined) {
            return console.error(chalk.red("Invalid command binding, ignored."));
        }

        const { name, description, argument } = config;

        const [mainCommand, ...aliases] = Array.isArray(name) ? name : [name];
        if (!mainCommand) {
            console.error(chalk.red('Invalid command binding, ignored.'));
            return;
        }

        this.commands[mainCommand] = {
            name: mainCommand,
            description,
            argument,
            alias: aliases,
            options: [],
            handler
        };

        if (Array.isArray(name)) {
            for (const alias of aliases) {
                this.commands[alias] = {
                    name: alias,
                    redirect: mainCommand
                };
            }
        }
    }

    /**
     * 总是执行
     * @param handler
     */
    always(handler: LifecycleHandler) {
        this.alwaysHandler = handler;
    }

    /**
     *
     */
    default(handler: LifecycleHandler) {
        this.defaultHandler = handler;
    }

    /**
     * 增加设置项
     * @param config
     */
    addOption(config: Option) {
        config.name = Array.isArray(config.name) ? config.name : [config.name];
        if (!config.command) {
            this.commonOptions.push(config);
        } else {
            if (!(config.command in this.commands)){
                return console.error(chalk.red(`Command for option [${config.name.join(', ')}] not found, ignored.`));
            }
            const command = this.commands[config.command];
            const target = command?.redirect ? this.commands[command.redirect] : command;
            if (target) (target.options ??= []).push(config);
        }
    }

    /**
     *
     * @param command
     */
    private commandCtx(command: string): CommandCtx {
        return {
            showVersion: () => {
                this.showVersion();
            },
            showHelp: () => {
                this.showHelp();
            },
            getArgument: (commandName: string = command) => {
                return this.getArgument(commandName);
            }
        }
    }

    /**
     * 设定基础信息
     * @param metaInfo
     */
    setMetaInfo({
        version = "",
        name = ""
    }: MetaInfo = {}): void {
        this.version = version;
        this.name = name;
    }

    /**
     * 显示帮助信息
     */
    showHelp(command?: string) {
        this.showVersion();
        console.log('\nHelp:');
        const Line = CLI.Line;

        new Line()
            .padding(5)
            .column('Commands', 30, [clc.cyan])
            .column('Description', 30, [clc.cyan])
            .column('Alias', 20, [clc.cyan])
            .output();
        new Line().output();
        for (const [key, boundCommand] of Object.entries(this.commands)) {
            if (!boundCommand) continue;
            if (boundCommand.redirect) {
                continue;
            }
            let commandText = '--' + key;
            let aliasText = '';
            if (boundCommand.argument) {
                commandText += ` <${boundCommand.argument.name}>`;
            }
            if ((boundCommand.alias ?? []).length > 0) {
                const aliasWithPrefixes = (boundCommand.alias ?? []).map(alias => alias.length === 1 ? `-${alias}` : `--${alias}`);
                aliasText += aliasWithPrefixes.join(' / ');
            }
            new Line()
                .padding(5)
                .column(commandText, 30)
                .column(boundCommand.description ?? '', 30)
                .column(aliasText, 20)
                .output();
            if (boundCommand.argument) {
                // 参数说明
                new Line()
                    .padding(9)
                    .column(`<${boundCommand.argument.name}>`, 26)
                    .column(boundCommand.argument.description, 30)
                    .output();
            }
            if ((boundCommand.options ?? []).length > 0) {
                // 设置项说明
                for (const option of boundCommand.options ?? []) {
                    let optionsText = '';
                    const optionName = Array.isArray(option.name) ? option.name : [option.name];
                    if (option.argument) {
                        optionsText += `--${optionName.join(', ')} <${option.argument.name}>`;
                    } else {
                        optionsText += `--${optionName.join(', ')}`
                    };
                    new Line()
                        .padding(9)
                        .column(optionsText, 26)
                        .column(option.description || '', 30)
                        .output();
                    if (option.argument) {
                        // 设置项参数说明
                        new Line()
                        .padding(13)
                        .column(`<${option.argument.name}>`, 22)
                        .column(option.argument.description || '', 30)
                        .output();
                    }
                }
            }
        }
        new Line().output();
        if (this.commonOptions.length > 0) {
            // 通用设置项说明
            console.log('Options:\n');
            new Line()
            .padding(5)
            .column('Options', 30, [clc.cyan])
            .column('Description', 30, [clc.cyan])
            .output();
            for (const option of this.commonOptions) {
                let optionsText = '';
                const optionName = Array.isArray(option.name) ? option.name : [option.name];
                if (option.argument) {
                    optionsText += `--${optionName.join(', ')} <${option.argument.name}>`;
                } else {
                    optionsText += `--${optionName.join(', ')}`
                };
                new Line()
                    .padding(5)
                    .column(optionsText, 30)
                    .column(option.description || '', 30)
                    .output();
                if (option.argument) {
                    // 设置项参数说明
                    new Line()
                    .padding(9)
                    .column(`<${option.argument.name}>`, 26)
                    .column(option.argument.description || '', 30)
                    .output();
                }
            }
        }
    }

    /**
     * 显示版本号
     */
    showVersion() {
        console.log(`${this.name} / ${this.version}`);
    }
    /**
     * 启动
     */
    start() {
        if (this.alwaysHandler) {
            this.alwaysHandler();
        }
        if (this.defaultHandler) {
            if (this.parsedArguments['_'].length === 0 && Object.keys(this.parsedArguments).length === 1) {
                this.defaultHandler();
            }
        }
        for (const key of Object.keys(this.parsedArguments)) {
            if (key in this.commands) {
                this.exec(key);
            }
        }
        for (const key of this.parsedArguments['_']) {
            if (key in this.commands) {
                this.exec(String(key));
            }
        }
    }

    /**
     * 执行命令担当函数
     * @param command
     * @param extraArguments
     */
    private exec(command: string): void {
        const boundCommand = this.commands[command];
        if (!boundCommand) return;
        if (boundCommand.redirect) {
            this.exec(boundCommand.redirect);
            return;
        }
        const options: CommandOptions = {};
        for (const option of [...(boundCommand.options ?? []), ...this.commonOptions]) {
            const names = Array.isArray(option.name) ? option.name : [option.name];
            const primaryName = names[0];
            if (!primaryName) continue;
            for (const name of names) {
                if (!(name in this.parsedArguments)) continue;
                if (this.validateArgument(this.parsedArguments[name], option.argument)) {
                    options[primaryName] = this.parsedArguments[name];
                } else {
                    console.error(chalk.red(`Argument validation failed for option '${name}'.`));
                    if (typeof option.argument?.validate === 'string') {
                        console.error(chalk.red(`<${option.argument.name}> should be a/an ${option.argument.validate.slice(2)}.`));
                    }
                }
            }
        }
        const argumentValue = this.findArgument(command);
        if (this.validateArgument(argumentValue, boundCommand.argument)) {
            boundCommand.handler?.(this.commandCtx(command), createCamelProxifiedObject(options));
        } else {
            console.error(chalk.red(`Argument validation failed for command ${command}`));
            if (typeof boundCommand.argument?.validate === 'string') {
                console.error(chalk.red(`<${boundCommand.argument.name}> should be a/an ${boundCommand.argument.validate.slice(2)}.`));
            }
        }
    }

    validateArgument(argumentValue: ArgumentValue | undefined, argument?: Argument): boolean {
        if (!argument || !argument.validate) {
            // no need to validate
            return true;
        }
        if (typeof argument.validate === "string") {
            if (argument.validate in this.validator) {
                if (argumentValue === undefined) return false;
                return this.validator[argument.validate](String(argumentValue));
            } else {
                console.error(chalk.red(`Unknown validate method for ${argument.name}.`));
                return true;
            }
        } else {
            // custom validator
            return argument.validate(argumentValue, (message: string) => {
                console.log(chalk.red(message))
            });
        }
    }

    /**
     * 获得命令的参数
     * @param commandName
     * @param followRedirect 是否遵循重定向
     */
    getArgument(commandName: string, followRedirect = true): ArgumentValue | undefined {
        const value = this.findArgument(commandName, followRedirect);
        if (value === undefined) console.error(chalk.red(`Command ${commandName} not found.`));
        return value;
    }

    private findArgument(commandName: string, followRedirect = true): ArgumentValue | undefined {
        const command = this.commands[commandName];
        if (!command) return undefined;
        if (command.redirect && followRedirect) return this.findArgument(command.redirect);
        if (commandName !== '_' && Object.hasOwn(this.parsedArguments, commandName)) {
            return this.parsedArguments[commandName];
        }
        for (const alias of command.alias ?? []) {
            if (Object.hasOwn(this.parsedArguments, alias)) return this.parsedArguments[alias];
        }
        return undefined;
    }

    /**
     * 启动
     * エリイ 起きてます❤
     */
    okite() {
        return this.start();
    }
}

export default new Erii();