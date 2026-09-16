import erii, { Erii } from 'erii';
import type {
    Argument, ArgumentValue, ArgumentValidator, Command, CommandCtx, CommandHandler,
    CommandMap, CommandOptions, LifecycleHandler, MetaInfo, Option, ParsedArguments, ValidatorName,
} from 'erii';

const handler: CommandHandler = (ctx, options) => {
    const value: ArgumentValue | undefined = ctx.getArgument();
    const option: ArgumentValue | undefined = options.verbose;
    if (typeof value === 'string') value.toUpperCase();
    if (typeof option === 'number') option.toFixed();
    // @ts-expect-error Parsed arguments are not always strings.
    const text: string = ctx.getArgument();
    // @ts-expect-error Options may be missing or have non-string values.
    options.verbose.toUpperCase();
};
erii.bind({ name: ['run', 'r'] }, handler);
new Erii().bind({ name: 'run' }, async (_, options) => options.verbose);
const options: CommandOptions = { enabled: true, count: 1, tags: ['a'], nested: { key: 'value' } };
const validator: ValidatorName = 'isInt';
const argument: Argument = { name: 'id', description: 'ID', validate: validator };
erii.validateArgument(options.count, argument);
erii.validateArgument(undefined, argument);
erii.validator.isEmail('test@example.com');
// @ts-expect-error Unknown validator methods must fail at compile time.
const invalid: Argument = { name: 'id', description: 'ID', validate: 'isNotAValidator' };
// @ts-expect-error A sanitizer is not a boolean validator.
const sanitizer: ValidatorName = 'trim';
// @ts-expect-error This validator requires a second argument.
const requiredOptions: ValidatorName = 'isIn';

const meta: MetaInfo = { name: 'example', version: '1.0.0' };
erii.setMetaInfo(meta);
erii.setMetaInfo({});
erii.setMetaInfo();
const lifecycle: LifecycleHandler = async () => {};
erii.always(lifecycle);
erii.default(() => {});
const custom: ArgumentValidator = (value, log) => {
    log('Checking argument');
    return typeof value === 'number' && value > 0;
};
const command: Command = {
    name: ['run', 'r'], description: 'Run', argument: { name: 'id', description: 'ID', validate: custom },
    alias: ['execute'], options: [], handler,
};
const option: Option = { name: ['verbose', 'v'], command: 'run', argument };
erii.bind(command, handler);
erii.addOption(option);
erii.addOption({ name: 'quiet' });
const commands: CommandMap = { run: command, missing: undefined };
const maybeCommand: Command | undefined = commands.unknown;
const parsed: ParsedArguments = { _: ['run', 42], verbose: true, list: ['a', 1], nested: { key: false } };
erii.parsedArguments = parsed;
const positional: Array<string | number> = erii.parsedArguments._;
const raw: string[] = erii.rawArguments;
const context: CommandCtx = {
    showHelp: () => erii.showHelp(),
    showVersion: () => erii.showVersion(),
    getArgument: name => erii.getArgument(name ?? 'run', false),
};
context.getArgument();
context.getArgument('run');

// @ts-expect-error Context lookup may return undefined or non-string values.
const stringOnly: CommandCtx = { ...context, getArgument: () => Symbol('invalid') };
// @ts-expect-error Positional parser arguments do not include booleans.
const invalidParsed: ParsedArguments = { _: [true] };
// @ts-expect-error Argument validators must return a boolean.
const invalidValidator: ArgumentValidator = () => 'yes';
// @ts-expect-error Custom validators receive values that must be narrowed.
const narrowValidator: ArgumentValidator = (value: string) => value.length > 0;
// @ts-expect-error Metadata versions are strings.
erii.setMetaInfo({ version: 1 });
// @ts-expect-error A command name is required.
erii.bind({}, handler);
// @ts-expect-error Option names must be strings or string arrays.
erii.addOption({ name: 1 });
// @ts-expect-error Logger accepts text only.
const badLogger: ArgumentValidator = (value, log) => { log(42); return true; };
