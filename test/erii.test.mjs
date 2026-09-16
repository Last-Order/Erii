import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import erii, { Erii } from 'erii';

function createErii(args = []) {
    const previous = process.argv;
    process.argv = [previous[0], 'example.mjs', ...args];
    try {
        return new Erii();
    } finally {
        process.argv = previous;
    }
}

test('package exposes ESM default and named exports with declarations', () => {
    assert.ok(erii instanceof Erii);
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
    assert.equal(pkg.type, 'module');
    assert.equal(pkg.exports['.'].require, undefined);
    assert.ok(readFileSync(new URL('../' + pkg.types, import.meta.url)).length);
    assert.ok(readdirSync(new URL('../dist', import.meta.url)).every(file => !file.endsWith('.cjs')));
});

test('command aliases preserve input config and validate numeric arguments', () => {
    const app = createErii(['-r', '42', '--dry-run', '--tag', 'a', '--tag', 'b']);
    const names = ['run', 'r'];
    let calls = 0;
    app.bind({ name: names, argument: { name: 'id', description: 'ID', validate: 'isInt' } }, (ctx, options) => {
        calls++;
        assert.equal(ctx.getArgument(), 42);
        assert.equal(options.dryRun, true);
        assert.deepEqual(options.tag, ['a', 'b']);
        assert.equal(options.missing, undefined);
        options.dryRun = false;
        assert.equal(options['dry-run'], false);
        options.dryRun = 0;
        assert.equal(options['dry-run'], 0);
        options.dryRun = '';
        assert.equal(options['dry-run'], '');
        const symbol = Symbol('metadata');
        options[symbol] = 0;
        assert.equal(options[symbol], 0);
    });
    app.addOption({ name: 'dry-run', command: 'r' });
    app.addOption({ name: 'tag' });
    app.start();
    assert.equal(calls, 1);
    assert.deepEqual(names, ['run', 'r']);
    assert.equal(app.getArgument('r', false), 42);
});

test('lifecycle callbacks, positional commands, and boolean flags work', () => {
    const app = createErii();
    const calls = [];
    app.always(() => calls.push('always'));
    app.default(() => calls.push('default'));
    app.okite();
    assert.deepEqual(calls, ['always', 'default']);
    const positional = createErii(['run', '--verbose']);
    positional.bind({ name: 'run' }, (_, options) => calls.push(options.verbose));
    positional.addOption({ name: 'verbose' });
    positional.start();
    assert.equal(calls.at(-1), true);
});

test('missing validated arguments fail without throwing; custom validation receives raw values', (t) => {
    t.mock.method(console, 'error', () => {});
    const app = createErii(['run']);
    let called = false;
    app.bind({ name: 'run', argument: { name: 'id', description: 'ID', validate: 'isInt' } }, () => { called = true; });
    assert.doesNotThrow(() => app.start());
    assert.equal(called, false);
    assert.equal(app.getArgument('missing'), undefined);
    assert.equal(app.validateArgument(false, {
        name: 'flag', description: 'Flag', validate: value => value === false,
    }), true);
    assert.equal(app.validateArgument('bad', { name: 'id', description: 'ID', validate: 'isInt' }), false);
});

test('help supports omitted descriptions and command options', (t) => {
    t.mock.method(process.stdout, 'write', () => true);
    const app = createErii();
    app.bind({ name: ['run', 'r'] }, () => {});
    app.addOption({ name: 'verbose', command: 'run' });
    app.addOption({ name: 'tag', argument: { name: 'tag', description: 'A tag' } });
    assert.doesNotThrow(() => app.showHelp());
});
