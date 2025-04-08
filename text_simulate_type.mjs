import config from './config.mjs'
import puppeteer from 'puppeteer'
import { LoremIpsum } from 'lorem-ipsum'
import { puppeteerWindow } from 'puppeteer-auto-position'
import os from 'os'

const headless = false
const browsers = []
let i = 0

const numberOfTabs = parseInt(process.argv[2]) || 1
const numberOfWords = 20
const numberOfListEntires = 10
const keyPressDelay = 50
const fileId = 8821

const emojis = [
    '😀',
    '😎',
    '🎉',
    '💫',
    '🌟',
    '🚀',
    '🎨',
    '🎭',
    '🎪',
    '🎡',
    '🎃',
    '👻',
    '👽',
    '🔥',
    '🌈',
    '⭐',
]

const getRandomEmoji = () => {
    return emojis[Math.floor(Math.random() * emojis.length)]
}

// Determine the modifier key based on platform
const modifierKey = os.platform() === 'darwin' ? 'Meta' : 'Control'

const generateRandomElement = async (page, editor) => {
    const links = ['https://nextcloud.com', 'https://nextcloud.com/blog']
    const styles = ['bold', 'italic', 'underline', 'strikethrough', 'link']

    const text = randomText(numberOfWords)
    const words = text.split(' ')

    const styleShortcuts = {
        bold: 'b',
        italic: 'i',
        underline: 'u',
        strikethrough: 's',
    }

    for (const word of words) {
        const randomStyle = styles[Math.floor(Math.random() * styles.length)]

        if (randomStyle === 'link') {
            const randomLink = links[Math.floor(Math.random() * links.length)]
            // Randomly decide if we should use a named link
            const useNamedLink = Math.random() > 0.5

            if (useNamedLink) {
                await typeText(editor, '[' + word + '](' + randomLink + ') ')
            } else {
                await typeText(editor, randomLink + ' ')
            }
            continue
        }

        // Toggle style on
        await page.keyboard.down(modifierKey)
        if (randomStyle === 'strikethrough') {
            await page.keyboard.down('Shift')
        }
        await page.keyboard.press(styleShortcuts[randomStyle])
        if (randomStyle === 'strikethrough') {
            await page.keyboard.up('Shift')
        }
        await page.keyboard.up(modifierKey)

        // Type the word
        await typeText(editor, word + ' ')

        // Toggle style off
        await page.keyboard.down(modifierKey)
        if (randomStyle === 'strikethrough') {
            await page.keyboard.down('Shift')
        }
        await page.keyboard.press(styleShortcuts[randomStyle])
        if (randomStyle === 'strikethrough') {
            await page.keyboard.up('Shift')
        }
        await page.keyboard.up(modifierKey)
    }
}

const generateRandomBlock = async (page, editor) => {
    const blockTypes = ['paragraph', 'heading', 'list', 'code']
    const randomBlockType =
        blockTypes[Math.floor(Math.random() * blockTypes.length)]

    console.log(`[user ${i}] Generating ${randomBlockType} block`)

    await page.keyboard.press('Enter')

    if (randomBlockType === 'paragraph') {
        await generateRandomElement(page, editor)
        await page.keyboard.press('Enter')
    } else if (randomBlockType === 'heading') {
        const randomHeadingLevel = Math.floor(Math.random() * 6) + 1
        await typeText(
            editor,
            '#'.repeat(randomHeadingLevel) +
                ' ' +
                getRandomEmoji() +
                ' ' +
                randomText(numberOfWords)
        )
        await page.keyboard.press('Enter')
    } else if (randomBlockType === 'list') {
        const randomListType = Math.random() > 0.5 ? 'ordered' : 'unordered'
        const numberOfItems = Math.floor(Math.random() * 4) + 2 // Random number between 2-5
        for (let i = 0; i < numberOfItems; i++) {
            if (i === 0) {
                await typeText(
                    editor,
                    `${randomListType === 'ordered' ? `${i + 1}. ` : '- '}`
                )
            }
            await typeText(
                editor,
                `${getRandomEmoji()} ${randomText(numberOfWords)}`
            )
            await page.keyboard.press('Enter')
        }
        await page.keyboard.press('Enter')
    } else if (randomBlockType === 'code') {
        await typeText(editor, '```')
        await page.keyboard.press('Enter')
        await typeText(editor, randomText(numberOfWords))
        await page.keyboard.down('Shift')
        await page.keyboard.press('Enter')
        await page.keyboard.up('Shift')
    }
}

const lorem = new LoremIpsum({
    sentencesPerParagraph: {
        max: 4,
        min: 2,
    },
    wordsPerSentence: {
        max: 16,
        min: 4,
    },
})

const randomText = (numberOfWords) => {
    return lorem.generateWords(numberOfWords)
}

const typeText = async (editor, text) => {
    await editor.type(text, {
        delay: keyPressDelay,
    })
    await new Promise((resolve) => setTimeout(resolve, keyPressDelay * 5))
}

async function simulateTyping(i) {
    const browser = !headless
        ? await puppeteerWindow(i, {
              width: 800,
              height: 600,
          })
        : await puppeteer.launch({
              headless: headless,
              defaultViewport: { width: 800, height: 600 },
          })
    browsers.push(browser)

    try {
        console.log(`[user ${i}] Opening browser`)
        const page = await browser.newPage()

        // Navigate to Nextcloud login page
        await page.goto(`${config.nextcloudUrl}/index.php/f/${fileId}`)

        const dataUser = await page.$eval('head', (head) =>
            head.getAttribute('data-user')
        )
        if (!dataUser) {
            console.log(`[user ${i}] Logging in`)
            await page.type('#user', config.adminPassword)
            await page.type('#password', config.adminPassword)
            await page.click('button[type="submit"]')
        }

        console.log(`[user ${i}] Waiting for editor to be visible`)

        await page.waitForSelector('.ProseMirror[contenteditable="true"] p', {
            visible: true,
            timeout: 60000,
        })

        console.log(`[user ${i}] Editor visible`)

        const editor = await page.$('.ProseMirror[contenteditable="true"] p')
        if (!editor) {
            throw new Error('ProseMirror editor not found')
        }

        // Wait for a few seconds before proceeding
        await new Promise((resolve) => setTimeout(resolve, 3000))

        console.log(`[user ${i}] Moving cursor to end of editor content`)

        // Move cursor to end of editor content
        await page.evaluate(() => {
            const editor = document.querySelector(
                '.ProseMirror[contenteditable="true"] p'
            )
            const selection = window.getSelection()
            const range = document.createRange()
            range.selectNodeContents(editor)
            range.collapse(false) // false = collapse to end
            selection.removeAllRanges()
            selection.addRange(range)
        })

        console.log(`[user ${i}] Starting to type`)

        await page.keyboard.press('Enter')

        for (let j = 0; j < 10; j++) {
            await generateRandomBlock(page, editor)
        }

        // Add some bold text
        await typeText(
            editor,
            '## [bold text user ' +
                i +
                '] ' +
                getRandomEmoji() +
                ' ' +
                randomText(5)
        )
        await page.keyboard.press('Enter')

        for (let j = 0; j < 10; j++) {
            await typeText(editor, randomText(1) + ' ')
            // Select the word we just typed (excluding the space)
            await page.keyboard.down('Shift')
            for (let k = 0; k < randomText(1).length; k++) {
                await page.keyboard.press('ArrowLeft')
            }
            await page.keyboard.up('Shift')

            // Make it bold with Cmd+B or Ctrl+B
            await page.keyboard.down(modifierKey)
            await page.keyboard.press('b')
            await page.keyboard.up(modifierKey)

            // Move cursor past the space
            await page.keyboard.press('ArrowRight')
        }

        await page.keyboard.press('Enter')

        await typeText(
            editor,
            '## [paragraphs user ' +
                i +
                '] ' +
                getRandomEmoji() +
                ' ' +
                randomText(5)
        )
        await page.keyboard.press('Enter')
        await typeText(editor, lorem.generateParagraphs(3))
        await page.keyboard.press('Enter')

        // Write a heading an list entires
        await typeText(
            editor,
            '## [lists user ' +
                i +
                '] ' +
                getRandomEmoji() +
                ' ' +
                randomText(5)
        )
        await page.keyboard.press('Enter')
        for (let i = 0; i < numberOfListEntires; i++) {
            await typeText(
                editor,
                '- ' + getRandomEmoji() + ' ' + randomText(numberOfWords)
            )
            await page.keyboard.press('Enter')
        }

        console.log(`[user ${i}] Text typed`)

        await new Promise((resolve) => setTimeout(resolve, 5000))
    } catch (error) {
        console.error('Error during automation:', error)
    } finally {
        await browser.close()
    }
}

Promise.all(Array.from({ length: numberOfTabs }, (_, i) => simulateTyping(i)))
