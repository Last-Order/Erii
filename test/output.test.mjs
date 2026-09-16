import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createErii, captureConsole, captureStdout } from './helpers.mjs';

test('version output uses defaults and resets omitted metadata fields', t => {
    const logs = captureConsole(t, 'log');
    const app = createErii();
    app.showVersion();
    app.setMetaInfo({ name: 'example', version: '2.3.4' });
    app.showVersion();
    app.setMetaInfo({ name: 'name-only' });
    app.showVersion();
    app.setMetaInfo({ version: '3' });
    app.showVersion();
    app.setMetaInfo();
    app.showVersion();
    assert.deepEqual(logs, ['Erii / 1.0.0', 'example / 2.3.4', 'name-only / ', ' / 3', ' / ']);
});

test('empty help prints its headings without a common options section', t => {
    const output = captureStdout(t);
    createErii().showHelp();
    assert.match(output(), /Erii \/ 1\.0\.0/);
    assert.match(output(), /Help:/);
    assert.match(output(), /Commands\s+Description\s+Alias/);
    assert.doesNotMatch(output(), /Options:/);
});

test('help includes command arguments, short/long aliases, scoped and common option descriptions', t => {
    const output = captureStdout(t);
    const app = createErii();
    app.setMetaInfo({ name: 'example', version: '2' });
    app.bind({ name: ['run', 'r', 'execute'], description: 'Run job', argument: {
        name: 'job', description: 'Job identifier',
    } }, () => {});
    app.bind({ name: 'stop', description: 'Stop job' }, () => {});
    app.addOption({ name: ['count', 'c'], command: 'run', description: 'Repeat job', argument: {
        name: 'times', description: 'Repeat count',
    } });
    app.addOption({ name: 'quiet', command: 'run', description: 'Quiet output' });
    app.addOption({ name: ['tag', 't'], description: 'Label job', argument: {
        name: 'label', description: 'Job label',
    } });
    app.addOption({ name: 'verbose', description: 'Verbose output' });
    app.showHelp();
    const text = output();
    // Captured before the help renderer was extracted; preserve spacing and line breaks.
    const expectedOutput = JSON.parse(readFileSync(new URL('./fixtures/help.json', import.meta.url), 'utf8'));
    assert.equal(text, expectedOutput);
    for (const expected of [
        'example / 2', '--run <job>', 'Run job', '-r / --execute', '<job>', 'Job identifier',
        '--stop', 'Stop job', '--count, c <times>', 'Repeat job', 'Repeat count',
        '--quiet', 'Quiet output', 'Options:', '--tag, t <label>', 'Label job',
        'Job label', '--verbose', 'Verbose output',
    ]) assert.ok(text.includes(expected), `Missing help text: ${expected}`);
    assert.equal(text.split('\n').filter(line => /^\s+--run\b/.test(line)).length, 1);
    assert.equal(text.split('\n').filter(line => /^\s+--(?:r|execute)\s/.test(line)).length, 0);
    assert.ok(text.indexOf('--quiet') < text.indexOf('Options:'));
    assert.ok(text.indexOf('--tag') > text.indexOf('Options:'));
});

test('public command map tolerates optional fields, missing entries and string option names', t => {
    const output = captureStdout(t);
    const app = createErii(['bare', 'missing', 'no-handler', '--local']);
    app.commands.missing = undefined;
    app.commands.bare = { name: 'bare' };
    app.commands['no-handler'] = { name: 'no-handler', options: [{ name: 'local' }] };
    app.addOption({ name: 'scoped', command: 'bare' });
    app.addOption({ name: 'ignored', command: 'missing' });
    app.commands.orphan = { name: 'orphan', redirect: 'missing' };
    app.addOption({ name: 'ignored', command: 'orphan' });
    app.commands.bare.options.push({ name: 'with-value', argument: { name: 'value', description: '' } });
    app.commonOptions.push({ name: 'global' }, { name: 'global-value', argument: { name: 'value', description: '' } });
    app.showHelp();
    assert.match(output(), /--bare/);
    assert.match(output(), /--local/);
    assert.match(output(), /--global-value <value>/);
    assert.doesNotThrow(() => app.start());
});
