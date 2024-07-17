const properties = {};
let propertiesLength = 0;

function recordProperty(key, value) {
    const type = typeof value;

    if (key in properties === false) {
        properties[key] = {
            types: [type],
            index: propertiesLength++
        };
    } else {
        const isTypeRecorded = properties[key].types.findIndex(t => t === type)
        if (isTypeRecorded === -1) {
            properties[key].types.push(type);
        }
    }
}

function getPath(key, value) {
    return `${properties[key].index}/${properties[key].types.indexOf(typeof value)}`;
}

function getPropertyIndex(key) {
    return properties[key].index;
}

function equals(other) {
    const a = [...this.map].join(',');
    const b = [...other.map].join(',');
    console.log(a, b);
    return a === b;
}

function mapped(input) {
    const map = new Set();
    Object.keys(input).forEach(key => {
        recordProperty(key, input[key]);
        const path = getPath(key, input[key]);
        map.add(path);
    });

    input.map = map;
    input.equals = equals;

    const MappedObject = new Proxy(input, {
        set(target, key, value) {
            const type = typeof value;

            if (type === 'object') {
                const mapped = mapped(value);
                recordProperty(key, mapped);
                const path = getPath(key, mapped);
                target.map.delete(path);
            }

            if (key in target) {
                if (typeof target[key] !== typeof value) {
                    recordProperty(key, value);
                    const path = getPath(key, value);
                    target.map.delete(path);
                    target.map.add(path);
                }
            } else {
                recordProperty(key, value);
                const path = getPath(key, value);
                target.map.add(path);
            }

            target[key] = value;
            return true;
        },
        defineProperty(target, key, value) {
            const path = getPath(key, value);
            target.map.delete(path);
            delete target[key];
            return true;
        }
    });

    return MappedObject;
}

const obj = mapped({a: 1});
obj.b = 2;

const obj2 = mapped({a: 1});
obj2.b = 2;

console.log(obj.equals(obj2));
console.log(properties)
