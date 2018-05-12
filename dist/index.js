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
    }
    bind(config, handler) {
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
        }
        else {
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
    commandCtx(command) {
        return {
            showVersion: () => {
                this.showVersion();
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
exports.Erii = Erii;
exports.default = new Erii();
//# sourceMappingURL=index.js.map