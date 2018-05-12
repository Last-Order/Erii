import { BADNAME } from "dns";

const minimist = require('minimist');
const CLI = require('clui'),
    clc = require('cli-color');

export interface Command {
    name: string | string[];
    description?: string;
    argumentDescription?: ArgumentDescription,
    alias?: string[],
    redirect?: string;
    handler?: (ctx: CommandCtx, ...extraArguments) => any
}

export interface CommandMap {
    [key: string]: Command;
};

export interface CommandCtx {
    showVersion: () => void;
    showHelp: () => void;
    getArgument: (commandName: string) => string;
}

export interface ArgumentDescription {
    name: string;
    description: string;
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

    constructor() {
        this.rawArguments = process.argv.slice(2);
        this.parsedArguments = minimist(process.argv.slice(2));

        // 不响应-后第二个字符起的命令
        for (const key of Object.keys(this.parsedArguments)) {
            if (key !== "_" && (!this.rawArguments.includes('--' + key) && !this.rawArguments.includes('-' + key))) {
                delete this.parsedArguments[key];
            }
        }
    }

    bind(config: Command, handler: (ctx: CommandCtx, ...extraArguments) => any) {
        if (config.name === undefined) {
            return console.error("无效命令绑定，忽略");
        }

        const { name, description, argumentDescription } = config;

        const mainCommand = Array.isArray(name) ? name.shift() : name;

        this.commands[mainCommand] = {
            name: mainCommand,
            description,
            argumentDescription,
            alias: [],
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
            getArgument: (argumentName: string) => {
                return this.getArgument(argumentName);
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
            .padding(10)
            .column('Commands', 20, [clc.cyan])
            .column('Description', 40, [clc.cyan])
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
            if (this.commands[key].argumentDescription) {
                commandText += ` <${this.commands[key].argumentDescription.name}>`;
            }
            if (this.commands[key].alias.length > 0) {
                aliasText += '--';
                aliasText += this.commands[key].alias.join(' / --');
            }
            new Line()
                .padding(10)
                .column(commandText, 20)
                .column(this.commands[key].description, 40)
                .column(aliasText, 20)
                .fill()
                .output();
            if (this.commands[key].argumentDescription) {
                new Line()
                    .padding(10)
                    .column(`${Array.from(Array(key.length + 2), i => ' ').join('')}-<${this.commands[key].argumentDescription.name}>`, 20)
                    .column(this.commands[key].argumentDescription.description, 40)
                    .fill()
                    .output();
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
        for (const key of Object.keys(this.parsedArguments)) {
            if (key in this.commands) {
                this.exec(key, this.parsedArguments[key]);
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
    private exec(command, ...extraArguments) {
        if (this.commands[command].redirect) {
            // 别名重定向
            this.exec(this.commands[command].redirect, ...extraArguments);
        } else {
            this.commands[command].handler(this.commandCtx(command), ...extraArguments);
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
                    console.error(`Command ${commandName} not found.`);
                }
            }
        } else {
            console.error(`Command ${commandName} not found.`);
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