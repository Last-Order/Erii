const minimist = require('minimist');
const CLI = require('clui'),
    clc = require('cli-color');

export interface Command {
    name: string;
    description?: string;
    argumentDescription?: ArgumentDescription,
    handler: (ctx: CommandCtx, ...extraArguments) => any
}

export interface CommandMap {
    [key: string]: Command;
};

export interface CommandCtx {
    showVersion: () => any;
    showHelp: () => any;
}

export interface ArgumentDescription {
    name: string;
    description: string;
}

export class Erii {
    rawArguments: string[];
    parsedArguments: { [key: string]: string; } = {};
    private version: string = "1.0.0";
    private name: string = "Erii";

    commands: CommandMap = {};

    constructor() {
        this.rawArguments = process.argv.slice(2);
        this.parsedArguments = minimist(process.argv.slice(2));
    }

    bind(config: Command, handler: (ctx: CommandCtx, ...extraArguments) => any) {
        if (config.name === undefined) {
            return console.error("无效命令绑定，忽略");
        }

        const { name, description, argumentDescription } = config;

        if (Array.isArray(name)) {
            for (const command of name) {
                this.commands[command] = {
                    name: command,
                    description,
                    argumentDescription,
                    handler
                };
            }
        } else {
            this.commands[name] = {
                name,
                description,
                argumentDescription,
                handler
            };
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
            .column('Commands', 40, [clc.cyan])
            .column('Description', 40, [clc.cyan])
            .fill()
            .output();
        new Line().fill().output();
        for (const key of Object.keys(this.commands)) {
            let commandText = '--' + key;
            if (this.commands[key].argumentDescription) {
                commandText += ` <${this.commands[key].argumentDescription.name}>`;
            }
            new Line()
                .padding(10)
                .column(commandText, 40)
                .column(this.commands[key].description, 40)
                .fill()
                .output();
            if (this.commands[key].argumentDescription) {
                new Line()
                    .padding(10)
                    .column(`${Array.from(Array(key.length + 2), i => ' ').join('')}-<${this.commands[key].argumentDescription.name}>`, 40)
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
                this.commands[key].handler(this.commandCtx(key), this.parsedArguments[key]);
            }
        }
        for (const key of this.parsedArguments['_']) {
            if (key in this.commands) {
                this.commands[key].handler(this.commandCtx(key));
            }
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