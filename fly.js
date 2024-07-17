// one object that will hold all the data
/*
    { a: 1 } | { a: 1, b: 1 } | { a: 1, { c: 1 } } | { a: 2 }
    root => {
        a: [1, 2],
        b: [1],
        c: [1],
    }
*/

// Lacks ability to handle multiple objects with same key value pair, if one gets deleted, all others will be deleted
// can be fixed with each object having a unique id that is stored in the object

const { isEqual } = require('lodash')

function gc() {
    if (global.gc) {
        global.gc()
        console.log('gc called')
    } else {
        console.log('gc not supported')
    }
}

let root = {}

function cleanRoot() {
    console.log('CLEANING ROOT')
    root = {}
}

const registry = new FinalizationRegistry((paths) => {
    console.log('GCing root paths: ', paths)
    deleteData(paths)
})

function deleteData(paths) {
    Object.values(paths).forEach(path => {
        const [key, index] = path.split('/')
        if (root[key] === undefined) return
        root[key].splice(index, 1)
        if (root[key].length === 0) {
            delete root[key]
        }
    })
}

function store(key, value, map = null) {
    const path = map?.[key]

    if (path != undefined) {
        update(path, value)
        return path
    }

    if (key in root) {
        if (root[key].findIndex(v => isEqual(v, value)) === -1) {
            root[key].push(value)
        }
    } else {
        root[key] = [value]
    }

    return `${key}/${root[key].length - 1}`
}

function get(path) {
    const [key, index] = path.split('/')
    return root[key][index]
}

function update(path, value) {
    const [key, index] = path.split('/')
    root[key][index] = value
}

function fly(obj) {
    const core = {
        toString() {
            return '{}'
        },
        valueOf() {
            return 1
        },
        [Symbol.toPrimitive](hint) {
            if (hint === 'string') {
                return '{}'
            }
            if (hint === 'number') {
                return 1
            }
            return {}
        }
    };
    const source = obj
    const map = {}

    Object.keys(source).forEach(key => {
        if (typeof source[key] === 'object') {
            core[key] = fly(source[key])
        } else {
            map[key] = store(key, source[key])
        }
    })

    const result = new Proxy(core, {
        get(target, key) {
            // console.log('get', target, key, map)
            if (typeof target[key] === 'object') {
                return target[key]
            }

            if (core.hasOwnProperty(key)) {
                return core[key]
            }

            const path = map[key]
            return get(path)
        },
        set(target, key, value) {
            // console.log('set', target, key, value, map)
            map[key] = store(key, value, map)
            return true
        }
    })

    registry.register(result, map);
    return result
}

function updatingTest() {
    console.log('VALUE UPDATING TEST')
    const foo = fly({ a: 1 })
    console.log(`foo: ${foo} | a ${foo.a}`)
    foo.a = 2
    console.log(`foo.a: ${foo.a}`)
    console.log('ROOT: ', root)
    cleanRoot()
    console.log('---------------------')
}

function spaceSavingTest() {
    console.log('SPACE SAVING TEST')
    const foo1 = fly({ a: 1, c: { d: 2 } })
    const foo2 = fly({ a: 1, c: { d: 2 } })
    const foo3 = fly({ a: 1, c: { d: 2 } })
    console.log(`foo1: ${foo1} | a ${foo1.a} c.d ${foo1.c.d}`)
    console.log(`foo2: ${foo2} | a ${foo2.a} c.d ${foo2.c.d}`)
    console.log(`foo3: ${foo3} | a ${foo3.a} c.d ${foo3.c.d}`)
    console.log('ROOT: ', root)
    cleanRoot()
    console.log('---------------------')
}

function garbageCollectionTest() {
    function test() {
        const foo = fly({ a: 1, c: { d: 2 } })
        console.log(`Created object for GC test foo`)
        console.log(`foo: ${foo} | a ${foo.a} c.d ${foo.c.d}`)
    }
    test()
    console.log(`Root before GC: ${JSON.stringify(root)}`)
    gc()

    function wait() {
        return new Promise(resolve => setTimeout(resolve, 100))
    }

    wait().then(() => {
        console.log(`Root after GC: ${JSON.stringify(root)}`)
    })
}


updatingTest();
spaceSavingTest();
garbageCollectionTest();


