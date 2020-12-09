export function toCamelCase(str: string) {
    return str.replace(/([-_][a-z])/gi, ($1) => {
        return $1.toUpperCase().replace("-", "");
    });
}

export function toKebabCase(str: string) {
    return str[0].toLowerCase() +
        str
            .slice(1, str.length)
            .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function convertObjectKey(before: { [index: string]: any }) {
    return Object.fromEntries(
        Object.entries(before).map(([key, value]) => [toCamelCase(key), value])
    );
}

export function createCamelProxifiedObject(before: { [index: string]: any }) {
    return new Proxy(before, {
        get: (target: typeof before, key: string) => {
            return target[key] ?? target[toKebabCase(key)];
        },
    });
}
