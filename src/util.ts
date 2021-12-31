export function setProto<T>(value: T) {
    return function <K extends string>(target: Record<K, T>, key: K) {
        target[key] = value;
    };
}