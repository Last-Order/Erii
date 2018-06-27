const yargs = require('yargs-parser');
const CLI = require('clui'), clc = require('cli-color');
const chalk = require('chalk');
const validator = require('validator');

export interface Command {
    name: string | string[];
    description?: string;
    argument?: Argument,
    alias?: string[],
    redirect?: string;
    options?: Option[];
    handler?: (ctx: CommandCtx, options?: object) => any
}

export interface Option {
    name: string | string[];
    description?: string;
    command?: string;
    argument?: Argument,
}

export interface CommandMap {
    [key: string]: Command;
};

export interface CommandCtx {
    showVersion: () => void;
    showHelp: () => void;
    getArgument: (commandName?: string) => string;
}

export interface Argument {
    name: string;
    description: string;
    validate?: string | ((value: any, logger: (message: string) => void) => boolean);
}

export class Erii {
    rawArguments: string[];
    parsedArguments: { 
        _?: string[],
        [key: string]: string | string[]; 
    } = {};
    private version: string = "1.0.0";
    private name: string = "Erii";

    commands: CommandMap = {};
    commonOptions: Option[] = [];
    validator: any;
    alwaysHandler: () => void;
    defaultHandler: () => void;
 
    constructor() {
        this.rawArguments = process.argv.slice(2);
        this.parsedArguments = yargs(process.argv.slice(2));
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
    bind(config: Command, handler: (ctx: CommandCtx, ...extraArguments) => any) {
        if (config.name === undefined) {
            return console.error(chalk.red("Invalid command binding, ignored."));
        }

        const { name, description, argument } = config;

        const mainCommand = Array.isArray(name) ? name.shift() : name;

        this.commands[mainCommand] = {
            name: mainCommand,
            description,
            argument,
            alias: [],
            options: [],
            handler
        };

        if (Array.isArray(name)) {
            for (const alias of name) {
                this.commands[mainCommand].alias.push(alias);
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
    always(handler: () => any) {
        this.alwaysHandler = handler;
    }

    /**
     * 
     */
    default(handler: () => any) {
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
            this.commands[config.command].options.push(config);
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
    } = {}) {
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
            .fill()
            .output();
        new Line().fill().output();
        for (const key of Object.keys(this.commands)) {
            if (this.commands[key].redirect) {
                continue;
            }
            let commandText = '--' + key;
            let aliasText = '';
            if (this.commands[key].argument) {
                commandText += ` <${this.commands[key].argument.name}>`;
            }
            if (this.commands[key].alias.length > 0) {
                aliasText += '--';
                aliasText += this.commands[key].alias.join(' / --');
            }
            new Line()
                .padding(5)
                .column(commandText, 30)
                .column(this.commands[key].description, 30)
                .column(aliasText, 20)
                .fill()
                .output();
            if (this.commands[key].argument) {
                // 参数说明
                new Line()
                    .padding(9)
                    .column(`<${this.commands[key].argument.name}>`, 26)
                    .column(this.commands[key].argument.description, 30)
                    .fill()
                    .output();
            }
            if (this.commands[key].options.length > 0) {
                // 设置项说明
                for (const option of this.commands[key].options) {
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
                        .column(option.description || '')
                        .fill()
                        .output();
                    if (option.argument) {
                        // 设置项参数说明
                        new Line()
                        .padding(13)
                        .column(`<${option.argument.name}>`, 22)
                        .column(option.argument.description || '')
                        .fill()
                        .output();
                    }
                }
            }
        }
        new Line().fill().output();
        if (this.commonOptions.length > 0) {
            // 通用设置项说明
            console.log('Options:\n');
            new Line()
            .padding(5)
            .column('Options', 30, [clc.cyan])
            .column('Description', 30, [clc.cyan])
            .fill()
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
                    .column(option.description || '')
                    .fill()
                    .output();
                if (option.argument) {
                    // 设置项参数说明
                    new Line()
                    .padding(9)
                    .column(`<${option.argument.name}>`, 26)
                    .column(option.argument.description || '')
                    .fill()
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
                this.exec(key);
            }
        }
    }

    /**
     * 执行命令担当函数
     * @param command 
     * @param extraArguments 
     */
    private exec(command) {
        if (this.commands[command].redirect) {
            // 别名重定向
            this.exec(this.commands[command].redirect);
        } else {
            // 传递绑定的设置及通用设置
            const options = {};
            const bandOptions = this.commands[command].options.concat(this.commonOptions);
            for (const option of bandOptions) {
                for (const name of option.name) {
                    if (name in this.parsedArguments) {
                        // do option argument validation
                        if (this.validateArgument(this.parsedArguments[name], option.argument)) {
                            options[option.name[0]] = this.parsedArguments[name];
                        } else {
                            console.error(chalk.red(`Argument validation failed for option '${name}'.`));
                            if (typeof option.argument.validate === 'string') {
                                console.error(chalk.red(`<${option.argument.name}> should be a/an ${option.argument.validate.slice(2)}.`))
                            }
                        }
                    }
                }
            }
            // do command argument validation
            if (this.validateArgument(this.parsedArguments[command], this.commands[command].argument)) {
                this.commands[command].handler(this.commandCtx(command), options);
            } else {
                console.error(chalk.red(`Argument validation failed for command ${command}`));
                const validateMethod = this.commands[command].argument.validate;
                if (typeof validateMethod === 'string') {
                    console.error(chalk.red(`<${this.commands[command].argument.name}> should be a/an ${validateMethod.slice(2)}.`))
                }
            }
        }
    }

    validateArgument(argumentValue: any, argument: Argument) {
        if (!argument || !argument.validate) {
            // no need to validate
            return true;
        }
        if (typeof argument.validate === "string") {
            if (argument.validate in this.validator) {
                return this.validator[argument.validate](argumentValue.toString());
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
    getArgument(commandName: string, followRedirect = true): string {
        if (this.commands[commandName]) {
            if (this.commands[commandName].redirect) {
                return this.getArgument(this.commands[commandName].redirect);
            } else {
                if (Object.keys(this.parsedArguments).includes(commandName) && commandName !== '_') {
                    return this.parsedArguments[commandName] as string;
                } else {
                    for (const alias of this.commands[commandName].alias) {
                        if (Object.keys(this.parsedArguments).includes(alias)) {
                            return this.parsedArguments[alias] as string;
                        }
                    }
                    console.error(chalk.red(`Command ${commandName} not found.`));
                }
            }
        } else {
            console.error(chalk.red(`Command ${commandName} not found.`));
        }
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