const prefix = "[Conduit]";
export function logDebug(enabled, ...args) {
    if (enabled)
        console.debug(prefix, ...args);
}
export function logWarn(options, message) {
    if (options.warnings === false)
        return;
    console.warn(prefix, message);
}
export function formatError(message, details) {
    const entries = Object.entries(details ?? {}).filter(([, value]) => {
        return value !== undefined && value !== null && value !== "";
    });
    if (entries.length === 0)
        return `${prefix} ${message}`;
    const extra = entries
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ");
    return `${prefix} ${message} (${extra})`;
}
export function isPlainObject(input) {
    return (typeof input === "object" &&
        input !== null &&
        !Array.isArray(input));
}
export function findJsonValue(stdout) {
    const lines = stdout.trim().split(/\r?\n/);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index]?.trim();
        if (!line)
            continue;
        try {
            return {
                found: true,
                value: JSON.parse(line),
            };
        }
        catch {
            continue;
        }
    }
    return {
        found: false,
        value: null,
    };
}
export function extractJsonValue(stdout) {
    return findJsonValue(stdout).value;
}
export function normalizeResultValue(input) {
    if (input === null || input === undefined) {
        return { type: "null", raw: input };
    }
    switch (typeof input) {
        case "string":
            return { type: "string", raw: input, value: input };
        case "boolean":
            return { type: "boolean", raw: input, value: input };
        case "number":
            return { type: "number", raw: input, value: input };
        case "object":
            if (Array.isArray(input)) {
                return { type: "array", raw: input, value: input };
            }
            return { type: "object", raw: input, value: input };
        default:
            return { type: "unknown", raw: input };
    }
}
export function hasValue(result, expected) {
    return deepEqual(result.value, expected);
}
export function getValue(result, path, defaultValue) {
    if (!path || !isPlainObject(result.value)) {
        return defaultValue;
    }
    let current = result.value;
    for (const key of path.split(".")) {
        if (!isPlainObject(current) && !Array.isArray(current)) {
            return defaultValue;
        }
        current = current[key];
        if (current === undefined || current === null) {
            return defaultValue;
        }
    }
    return current;
}
function deepEqual(left, right) {
    if (Object.is(left, right))
        return true;
    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right))
            return false;
        if (left.length !== right.length)
            return false;
        return left.every((value, index) => deepEqual(value, right[index]));
    }
    if (isPlainObject(left) || isPlainObject(right)) {
        if (!isPlainObject(left) || !isPlainObject(right))
            return false;
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);
        if (leftKeys.length !== rightKeys.length)
            return false;
        return leftKeys.every((key) => {
            return Object.prototype.hasOwnProperty.call(right, key) &&
                deepEqual(left[key], right[key]);
        });
    }
    return false;
}
