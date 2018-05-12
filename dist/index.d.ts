export interface Command {
    name: string;
    description?: string;
    argumentDescription?: ArgumentDescription;
    handler: (ctx: CommandCtx, ...extraArguments) => any;
}
export interface CommandMap {
    [key: string]: Command;
}
export interface CommandCtx {
    showVersion: () => any;
}
export interface ArgumentDescription {
    name: string;
    description: string;
}
export declare class Erii {
    rawArguments: string[];
    parsedArguments: {
        [key: string]: string;
    };
    private version;
    private name;
    commands: CommandMap;
    constructor();
    bind(config: Command, handler: (ctx: CommandCtx, ...extraArguments) => any): void;
    /**
     *
     * @param command
     */
    private commandCtx(command);
    /**
     * 设定基础信息
     * @param metaInfo
     */
    setMetaInfo({version, name}?: {
        version?: string;
        name?: string;
    }): void;
    /**
     * 显示帮助信息
     */
    showHelp(command?: string): void;
    /**
     * 显示版本号
     */
    showVersion(): void;
    /**
     * 启动
     */
    start(): void;
    /**
     * 启动
     * エリイ 起きてます❤
     */
    okite(): void;
}
declare const _default: Erii;
export default _default;
