import yargs from 'yargs-parser';
import chalk from 'chalk';
import validator from 'validator';
import { renderHelp } from './help.js';
import { createCamelProxifiedObject } from './utils/convert.js';
import type {
    Argument,
    ArgumentValue,
    Command,
    CommandCtx,
    CommandHandler,
    CommandMap,
    CommandOptions,
    LifecycleHandler,
    MetaInfo,
    Option,
    ParsedArguments,
    EriiSchema,
    CommandName,
    CommandLookup,
    LookupArgument,
    TypedCommand,
    TypedCommandHandler,
    TypedOption,
} from './types.js';

export class Erii<S extends EriiSchema<S> = never> {
    rawArguments: string[];
    parsedArguments: ParsedArguments;
    private version: string = "1.0.0";
    private name: string = "Erii";

    private commands: CommandMap = {};
    private commonOptions: Option[] = [];
    validator: typeof validator;
    alwaysHandler?: LifecycleHandler;
    defaultHandler?: LifecycleHandler;

    constructor(..._schema: [S] extends [never] ? [schema: never] : []) {
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
    bind<K extends CommandName<S>>(config: TypedCommand<S, K>, handler: TypedCommandHandler<S, NoInfer<K>>): void;
    bind(config: unknown, handler: unknown): void {
        this.bindCommand(config as Command, handler as CommandHandler);
    }

    private bindCommand(config: Command, handler: CommandHandler): void {
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

    default(handler: LifecycleHandler) {
        this.defaultHandler = handler;
    }

    /**
     * 增加设置项
     * @param config
     */
    addOption(config: TypedOption<S>): void;
    addOption(config: unknown): void {
        this.registerOption(config as Option);
    }

    private registerOption(config: Option) {
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

    private commandCtx(command: string): CommandCtx {
        return {
            showVersion: () => {
                this.showVersion();
            },
            showHelp: () => {
                this.showHelp();
            },
            getArgument: (commandName: string = command) => {
                return this.readArgument(commandName);
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
    showHelp(command?: CommandLookup<S>) {
        this.showVersion();
        renderHelp(this.commands, this.commonOptions);
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
    getArgument<N extends CommandLookup<S>>(commandName: N, followRedirect?: boolean): LookupArgument<S, N> | undefined;
    getArgument(commandName: string, followRedirect = true): unknown {
        return this.readArgument(commandName, followRedirect);
    }

    private readArgument(commandName: string, followRedirect = true): ArgumentValue | undefined {
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
