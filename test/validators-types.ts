import type { ParsedArguments } from '../src/types.js';
import type { Argument, ArgumentValidator, ValidatorName, MetaInfo } from 'erii';

const valid: ValidatorName = 'isInt';
const argument: Argument = { name: 'id', description: 'ID', validate: valid };
const custom: ArgumentValidator = (value, log) => {
    log('Checking argument');
    return typeof value === 'number' && value > 0;
};
const parsed: ParsedArguments = { _: ['run', 42], enabled: true, list: ['a', 1], nested: { key: false } };
const meta: MetaInfo = { name: 'example', version: '1.0.0' };
// @ts-expect-error Unknown validators must fail at compile time.
const invalid: Argument = { name: 'id', description: 'ID', validate: 'isNotAValidator' };
// @ts-expect-error A sanitizer is not a boolean validator.
const sanitizer: ValidatorName = 'trim';
// @ts-expect-error This validator requires a second argument.
const requiredOptions: ValidatorName = 'isIn';
// @ts-expect-error Custom validators must return booleans.
const invalidValidator: ArgumentValidator = () => 'yes';
// @ts-expect-error Raw values must be narrowed before use.
const narrowValidator: ArgumentValidator = (value: string) => value.length > 0;
// @ts-expect-error Logger accepts text only.
const badLogger: ArgumentValidator = (value, log) => { log(42); return true; };
// @ts-expect-error Positional arguments cannot contain booleans.
const invalidParsed: ParsedArguments = { _: [true] };
// @ts-expect-error Metadata versions are strings.
const invalidMeta: MetaInfo = { version: 1 };
