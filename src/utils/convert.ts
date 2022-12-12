export function toCamelCase(str: string) {
    return str.replace(/([-_][a-z])/gi, ($1) => {
        return $1.toUpperCase().replace("-", "");
    });
}

export function toKebabCase(str: string) {
    return (
        str[0].toLowerCase() +
        str
            .slice(1, str.length)
            .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    );
}

export function convertObjectKey(before: { [index: string]: any }) {
    return Object.fromEntries(
        Object.entries(before).map(([key, value]) => [toCamelCase(key), value])
    );
}

export function createCamelProxifiedObject(before: { [index: string]: any }) {
    const originalObject = before;
    return new Proxy(before, {
        get: (target: typeof before, key: string) => {
            return originalObject[key] ?? originalObject[toKebabCase(key)];
        },
        set: (target: typeof before, key: string, value: any) => {
            // 如果赋值的是camel case的key，而驼峰形式key是从kebab case的key proxy来的 则赋值其kebab case形式的key的值
            if (
                !key.includes("-") &&
                (originalObject[key] === undefined ||
                    originalObject[key] === null) &&
                originalObject[toKebabCase(key)] !== undefined &&
                originalObject[toKebabCase(key)] !== null
            ) {
                target[toKebabCase(key)] = value;
            } else {
                target[key] = value;
            }
            return value;
        },
    });
}
