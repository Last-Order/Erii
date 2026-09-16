import erii, { Erii } from 'erii';
import type { Argument, ArgumentValue, CommandHandler, CommandOptions, ValidatorName } from 'erii';

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
