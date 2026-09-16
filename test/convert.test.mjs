import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toCamelCase, toKebabCase, convertObjectKey, createCamelProxifiedObject } from '../src/utils/convert.ts';

test('camel-case conversion handles hyphens, underscores, mixed case and empty input', () => {
    for (const [input, expected] of [
        ['', ''], ['plain', 'plain'], ['dry-run', 'dryRun'], ['dry_run', 'dryRun'],
        ['long-option_name', 'longOptionName'], ['a-B', 'aB'], ['item-1', 'item-1'],
    ]) assert.equal(toCamelCase(input), expected);
});

test('kebab-case conversion handles empty, single-character and uppercase input', () => {
    for (const [input, expected] of [
        ['', ''], ['A', 'a'], ['dryRun', 'dry-run'], ['DryRun', 'dry-run'],
        ['URL', 'u-r-l'], ['already-kebab', 'already-kebab'], ['item1', 'item1'],
    ]) assert.equal(toKebabCase(input), expected);
});

test('object conversion returns a new object, preserves values and resolves key collisions in order', () => {
    const value = { nested: true };
    const original = { 'dry-run': value, user_name: 0, unchanged: false };
    const result = convertObjectKey(original);
    assert.deepEqual(result, { dryRun: value, userName: 0, unchanged: false });
    assert.equal(result.dryRun, value);
    assert.notEqual(result, original);
    assert.deepEqual(Object.keys(original), ['dry-run', 'user_name', 'unchanged']);
    assert.deepEqual(convertObjectKey({}), {});
    assert.deepEqual(convertObjectKey({ 'dry-run': 1, dryRun: 2 }), { dryRun: 2 });
});

test('proxy reads camel aliases, preserves falsey values and prefers explicit properties', () => {
    const original = { 'dry-run': true, dryRun: false, 'max-count': 5, maxCount: 0, empty: '', nullable: null };
    const proxy = createCamelProxifiedObject(original);
    assert.equal(proxy.dryRun, false);
    assert.equal(proxy.maxCount, 0);
    assert.equal(proxy['dry-run'], true);
    assert.equal(proxy.empty, '');
    assert.equal(proxy.nullable, null);
    assert.equal(proxy.absent, undefined);
    assert.deepEqual(Object.keys(proxy), Object.keys(original));
    assert.equal(JSON.stringify(proxy), JSON.stringify(original));
});

test('proxy uses kebab properties when a camel property is null or undefined', () => {
    for (const missing of [null, undefined]) {
        const original = { dryRun: missing, 'dry-run': true };
        const proxy = createCamelProxifiedObject(original);
        assert.equal(proxy.dryRun, true);
        proxy.dryRun = false;
        assert.equal(original['dry-run'], false);
        assert.equal(original.dryRun, missing);
    }
});

test('proxy assignments accept falsey values and route only existing non-null kebab aliases', () => {
    const original = { 'dry-run': true, direct: 1, 'null-key': null };
    const proxy = createCamelProxifiedObject(original);
    for (const value of [false, 0, '', undefined]) {
        proxy.dryRun = value;
        assert.equal(original['dry-run'], value);
    }
    proxy.direct = 2;
    proxy.newKey = 'new';
    proxy.nullKey = 'assigned';
    proxy['dry-run'] = true;
    assert.equal(original.direct, 2);
    assert.equal(original.newKey, 'new');
    assert.equal(original.nullKey, 'assigned');
    assert.equal(original['null-key'], null);
    assert.equal(original['dry-run'], true);
});

test('proxy handles symbols and empty keys without string conversion', () => {
    const key = Symbol('metadata');
    const original = { [key]: 'before', '': 'empty' };
    const proxy = createCamelProxifiedObject(original);
    assert.equal(proxy[key], 'before');
    assert.equal(proxy[''], 'empty');
    proxy[key] = false;
    proxy[''] = 0;
    assert.equal(original[key], false);
    assert.equal(original[''], 0);
});

test('proxy respects non-writable properties', () => {
    const proxy = createCamelProxifiedObject(Object.freeze({ fixed: 1, 'dry-run': true }));
    assert.equal(Reflect.set(proxy, 'fixed', 2), false);
    assert.equal(Reflect.set(proxy, 'dryRun', false), false);
    assert.throws(() => { proxy.fixed = 2; }, TypeError);
});
