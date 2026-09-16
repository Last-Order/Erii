import { stripVTControlCharacters } from 'node:util';
import { Erii } from 'erii';

export function createErii(args = []) {
    const previous = process.argv;
    process.argv = [previous[0], 'example.mjs', ...args];
    try {
        return new Erii();
    } finally {
        process.argv = previous;
    }
}

export function captureConsole(t, method) {
    const messages = [];
    t.mock.method(console, method, (...args) => {
        messages.push(stripVTControlCharacters(args.join(' ')));
    });
    return messages;
}

export function captureStdout(t) {
    let output = '';
    t.mock.method(process.stdout, 'write', chunk => {
        output += stripVTControlCharacters(String(chunk));
        return true;
    });
    return () => output;
}
