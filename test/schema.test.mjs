import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createErii, captureConsole } from './helpers.mjs';

test('registrations need no runtime type declarations and preserve parser values', () => {
    const app = createErii(['-b', '42', '--out-dir', 'dist', '--verbose', '--tag', 'a', '--tag', 'b']);
    app.bind({ name: ['build', 'b'], argument: { name: 'id', description: '' } }, (ctx, options) => {
        assert.equal(ctx.getArgument(), 42);
        assert.deepEqual({ ...options }, { outDir: 'dist', verbose: true, tag: ['a', 'b'] });
    });
    app.addOption({ command: 'b', name: ['outDir', 'out-dir'] });
    app.addOption({ name: 'verbose' });
    app.addOption({ name: 'tag' });
    app.start();
    assert.equal(app.getArgument('b'), 42);
});

test('argument lookups return raw values without invoking validation', t => {
    captureConsole(t, 'error');
    const app = createErii(['--run', 'bad']);
    let validations = 0;
    app.bind({ name: ['run', 'r'], argument: {
        name: 'id', description: '', validate(value) {
            validations++;
            assert.equal(value, 'bad');
            return false;
        },
    } }, () => assert.fail('Invalid command must not run'));
    assert.equal(app.getArgument('run'), 'bad');
    assert.equal(validations, 0);
    app.start();
    assert.equal(validations, 1);
    assert.equal(app.getArgument('r'), 'bad');
    assert.equal(validations, 1);
});

test('context lookups do not repeat validation and preserve camel-case option access', () => {
    const app = createErii(['--run', '42', '--dry-run']);
    let validations = 0;
    app.bind({ name: 'run', argument: {
        name: 'id', description: '', validate() { validations++; return true; },
    } }, (ctx, options) => {
        assert.equal(ctx.getArgument(), 42);
        assert.equal(ctx.getArgument('run'), 42);
        assert.equal(validations, 1);
        assert.equal(options.dryRun, true);
    });
    app.addOption({ name: 'dry-run' });
    app.start();
});
