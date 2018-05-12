"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimist = require('minimist');
const CLI = require('clui'), clc = require('cli-color');
;
class Erii {
    constructor() {
        this.parsedArguments = {};
        this.version = "1.0.0";
        this.name = "Erii";
        this.commands = {};
        this.rawArguments = process.argv.slice(2);
        this.parsedArguments = minimist(process.argv.slice(2));
        // 不响应-后第二个字符起的命令
        for (const key of Object.keys(this.parsedArguments)) {
            if (key !== "_" && (!this.rawArguments.includes('--' + key) && !this.rawArguments.includes('-' + key))) {
                delete this.parsedArguments[key];
            }
        }
    }
    bind(config, handler) {
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
    commandCtx(command) {
        return {
            showVersion: () => {
                this.showVersion();
            },
            showHelp: () => {
                this.showHelp();
            },
            getArgument: (argumentName) => {
                return this.getArgument(argumentName);
            }
        };
    }
    /**
     * 设定基础信息
     * @param metaInfo
     */
    setMetaInfo({ version = "", name = "" } = {}) {
        this.version = version;
        this.name = name;
    }
    /**
     * 显示帮助信息
     */
    showHelp(command) {
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
    exec(command, ...extraArguments) {
        if (this.commands[command].redirect) {
            // 别名重定向
            this.exec(this.commands[command].redirect, ...extraArguments);
        }
        else {
            this.commands[command].handler(this.commandCtx(command), ...extraArguments);
        }
    }
    /**
     * 获得命令的参数
     * @param commandName
     * @param followRedirect 是否遵循重定向
     */
    getArgument(commandName, followRedirect = true) {
        if (this.commands[commandName]) {
            if (this.commands[commandName].redirect) {
                return this.getArgument(this.commands[commandName].redirect);
            }
            else {
                if (Object.keys(this.parsedArguments).includes(commandName) && commandName !== '_') {
                    return this.parsedArguments[commandName];
                }
                else {
                    for (const alias of this.commands[commandName].alias) {
                        if (Object.keys(this.parsedArguments).includes(alias)) {
                            return this.parsedArguments[alias];
                        }
                    }
                    console.error(`Command ${commandName} not found.`);
                }
            }
        }
        else {
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
exports.Erii = Erii;
exports.default = new Erii();
//# sourceMappingURL=index.js.map