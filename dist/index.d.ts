export interface Command {
    name: string | string[];
    description?: string;
    argumentDescription?: ArgumentDescription;
    alias?: string[];
    redirect?: string;
    handler?: (ctx: CommandCtx, ...extraArguments) => any;
}
export interface CommandMap {
    [key: string]: Command;
}
export interface CommandCtx {
    showVersion: () => void;
    showHelp: () => void;
    getArgument: (commandName: string) => string;
}
export interface ArgumentDescription {
    name: string;
    description: string;
}
export declare class Erii {
    rawArguments: string[];
    parsedArguments: {
        _?: string[];
        [key: string]: string | string[];
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
     * 执行命令担当函数
     * @param command
     * @param extraArguments
     */
    private exec(command, ...extraArguments);
    /**
     * 获得命令的参数
     * @param commandName
     * @param followRedirect 是否遵循重定向
     */
    getArgument(commandName: string, followRedirect?: boolean): string;
    /**
     * 启动
     * エリイ 起きてます❤
     */
    okite(): void;
}
declare const _default: Erii;
export default _default;
