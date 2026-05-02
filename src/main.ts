/*
Node.js does not natively support coroutines; they are merely syntactic sugar for Promises.

[TypeScript原理]
1. npx tsc: 编译 TypeScript 语法到 JavaScript 语法，生成对应的 .js 文件 (等价于./node_modules/.bin/tsc)
2. npx tsx: 直接运行 TypeScript 文件，无需编译  (等价于./node_modules/.bin/tsx)
3. package.json: nodejs服务端已经原生支持 ES module(配置"type": "module")，所以tsconfig.json配置"module": "nodenext","target": "esnext" 让tsc不需编译成commonjs，直接使用ES module

[初始化步骤]
1.npm init -y   // 初始化 npm
2.npm install typescript -D   // 安装 TypeScript 作为开发依赖
3.npm install tsx -D   // 安装 tsx 方便直接运行 TypeScript 文件
4.npm install @types/node -D   // 安装 Node.js 标准库的ts定义
5.npx tsc --init   // 生成 tsconfig.json
6.修改tsconfig.json
    "compilerOptions": {
        "rootDir": "./src",   // ts源码位置
        "outDir": "./dist",   // ts编译后输出位置
        "lib": ["esnext"],    // 引入最新的 ECMAScript 标准库类型定义（如 Promise, AsyncIterator 等），以支持最新 JS 特性
        "types": ["node"]     // 引入 Node.js 环境的类型定义，以便在 TS 中使用 fs, path 等 Node API
    }
7.修改 package.json
      "type": "module" // 指定项目使用 ES 模块语法 import / export
*/


/**
[cancel_demo]
task starts
task cancelled
 */
async function cancel_demo() : Promise<void> {
    const abortController = new AbortController();

    async function run_task(signal: AbortSignal) : Promise<void> {
        console.log('task starts');
        for (let i = 0; i < 10; i++) {
            await new Promise<void>((resolve) => {setTimeout(resolve, 500);})
            if (signal.aborted) {
                return;
            }
        }
        console.log('task ends')
    }

    const promise = run_task(abortController.signal);

    await new Promise<void>((resolve) => {setTimeout(resolve, 1000)});
    abortController.abort();
    await promise;
    console.log('task cancelled');
}

/**
[concurrent_demo]
task starts
event waiting
event set
run_task cancelled
wait_event done
 */
async function concurrent_demo() : Promise<void> {
    const abortControllers = [new AbortController(), new AbortController()];
    
    async function run_task(signal: AbortSignal) : Promise<void> {
        console.log('task starts');
        for (let i = 0; i < 10; i++) {
            await new Promise<void>((resolve) => {setTimeout(resolve, 500);})
            if (signal.aborted) {
                return;
            }
        }
        console.log('task ends')
    }

    let event = false;
    async function wait_event(signal: AbortSignal): Promise<void> {
        console.log('event waiting')
        while (true) {
            await new Promise<void>((resolve) => {setTimeout(resolve, 10);})
            if (event) {
                console.log('event set')
                return;
            }
            if (signal.aborted) {
                return;
            }
        }
    }

    const promise1 = run_task(abortControllers[0]!.signal);
    const promise2 = wait_event(abortControllers[1]!.signal)

    const status = [
        {'name': 'run_task', 'ends': false, 'promise': promise1},
        {'name': 'wait_event', 'ends': false, 'promise': promise2}
    ];
    promise1.finally(() => {status[0]!.ends = true;});
    promise2.finally(() => {status[1]!.ends = true;});

    setTimeout(() => {event=true;}, 1000);
    await Promise.race([promise1, promise2]);
    for (let i = 0; i < status.length; i++) {
        if (status[i]!.ends) {
            console.log(`${status[i]!.name} done`);
        } else {
            abortControllers[i]!.abort();
            await status[i]!.promise;
            console.log(`${status[i]!.name} cancelled`);
        }
    }
}

console.log('[cancel_demo]');
await cancel_demo();
console.log('[concurrent_demo]');
await concurrent_demo();
