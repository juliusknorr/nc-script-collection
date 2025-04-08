/**
 * node.js script to create empty files and share them with a target user on Nextcloud
 */

import fetch from 'node-fetch'
import { createUser, shareFile, createGroup } from './helper_ocs.mjs'
import { createRandomTextFile, createFolder } from './helper_webdav.mjs'
import { runInParallel } from './helper.mjs'
const nextcloudUrl = 'https://nextcloud.local'

const adminUser = 'admin'
const adminPassword = 'admin'

const withTalk = true

const runPrefix = 'random-' + Math.floor(Math.random() * 1000000)

const numberOfGroups = 10
const numberOfUsers = 100
const numberOfFiles = 5
const numberOfFolders = 5

// create users
let userList = ['admin']

// create groups and add each user to all groups
let groupList = []
const groupCreationTasks = Array.from({ length: numberOfGroups }, (_, i) => ({
	groupName: `${runPrefix}group${i}`,
}))

await runInParallel(groupCreationTasks, async (task) => {
	await createGroup(nextcloudUrl, adminUser, adminPassword, task.groupName)
	groupList.push(task.groupName)
})

// create random users
const userCreationTasks = Array.from({ length: numberOfUsers }, (_, i) => ({
	userName: `${runPrefix}user${i}`,
	userPassword: `${runPrefix}user${i}`,
}))

await runInParallel(userCreationTasks, async (task) => {
	await createUser(
		nextcloudUrl,
		adminUser,
		adminPassword,
		task.userName,
		task.userPassword,
		groupList
	)
	userList.push(task.userName)
})

await runInParallel(userCreationTasks, async (task) => {
	for (let j = 0; j < numberOfFiles; j++) {
		const fileName = `file${j}.txt`
		await createRandomTextFile(
			nextcloudUrl,
			task.userName,
			task.userPassword,
			fileName
		)
	}
	for (let k = 0; k < numberOfFolders; k++) {
		const folderName = `folder${k}`
		await createFolder(
			nextcloudUrl,
			task.userName,
			task.userPassword,
			folderName
		)
	}
})

// Share files with other users
for (let i = 0; i < userList.length; i++) {
	const userName = userList[i]
	const userPassword = userList[i]
	const randomUserIndex = Math.floor(Math.random() * userList.length)
	const targetUser = userList[randomUserIndex]

	// Share files with target user
	const shareFileTasks = Array.from({ length: numberOfFiles }, (_, k) => ({
		fileName: `file${k}.txt`,
	}))
	await runInParallel(shareFileTasks, async (task) => {
		await shareFile(
			nextcloudUrl,
			userName,
			userPassword,
			task.fileName,
			targetUser
		)
	})

	const shareFolderTasks = Array.from(
		{ length: numberOfFolders },
		(_, k) => ({
			folderName: `folder${k}`,
		})
	)
	await runInParallel(shareFolderTasks, async (task) => {
		await shareFile(
			nextcloudUrl,
			userName,
			userPassword,
			task.folderName,
			targetUser
		)
	})

	await runInParallel(shareFileTasks, async (task) => {
		for (const group of groupList) {
			await shareFile(
				nextcloudUrl,
				userName,
				userPassword,
				task.fileName,
				group,
				31,
				1
			)
		}
	})
}

if (withTalk) {
	// create talk rooms
	const talkRoomCreationTasks = Array.from(
		{ length: numberOfGroups },
		(_, i) => ({
			groupName: `${runPrefix}group${i}`,
		})
	)
	await runInParallel(talkRoomCreationTasks, async (task) => {
		await createTalkRoom(
			nextcloudUrl,
			adminUser,
			adminPassword,
			task.groupName
		)
	})
}
