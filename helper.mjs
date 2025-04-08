import config from './config.mjs'

export async function runInParallel(items, callback, batchSize = 10) {
    const activePromises = new Set()
    let nextIndex = 0

    const startNext = async () => {
        if (nextIndex >= items.length) return

        const currentIndex = nextIndex++
        const promise = callback(items[currentIndex], currentIndex)

        activePromises.add(promise)

        promise.then(() => {
            activePromises.delete(promise)
            return startNext()
        })
    }

    // Start initial batch
    for (let i = 0; i < batchSize && i < items.length; i++) {
        await startNext()
    }

    // Wait for all promises to complete
    while (activePromises.size > 0) {
        await Promise.race(Array.from(activePromises))
    }
}

export async function loopNTimes(n, callback, batchSize = 1) {
    const items = Array.from({ length: n }, (_, i) => i)
    await runInParallel(items, callback, batchSize)
}

export async function ensureAppIsEnabled(appName) {
    const command = `app:enable ${appName}`
    return config.runOcc(command)
}

export async function runOcc(command) {
    return config.runOcc(command)
}
