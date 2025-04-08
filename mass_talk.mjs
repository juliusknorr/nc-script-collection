import {
	ensureAppIsEnabled,
	loopNTimes,
	runInParallel,
} from './helper.mjs'
import {
	createRandomUsers,
	createTalkRoom,
	addUserToTalkRoom,
} from './helper_ocs.mjs'
import config from './config.mjs'
import { LoremIpsum } from 'lorem-ipsum'
await ensureAppIsEnabled('spreed')

const sendChatMessage = async (talkRoom, user) => {
	console.log(`Sending chat message to ${talkRoom} from ${user}`)
	const shouldMention = Math.random() > 0.5
	const mentionedUser = shouldMention ? userList[Math.floor(Math.random() * userList.length)] : null
	const message = shouldMention 
		? `@${mentionedUser} ${new LoremIpsum().generateSentences(1)}`
		: new LoremIpsum().generateSentences(1)
		
	const result = await fetch(`${config.nextcloudUrl}/ocs/v2.php/apps/spreed/api/v1/chat/${talkRoom}`, {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${Buffer.from(`${user}:${user}`).toString('base64')}`,
			'Content-Type': 'application/json',
			'OCS-APIRequest': 'true',
		},
		body: JSON.stringify({ message }),
	})
	if (!result.ok) {
		console.error(`Error sending chat message to ${talkRoom} from ${user}: ${result.statusText}`)
	}
}

const uploadRandomFile = async (user) => {
	// Randomly choose between text, markdown or image file
	const fileType = Math.floor(Math.random() * 3)
	let fileName, content, contentType
	
	if (fileType === 0) {
		// Text file with lorem ipsum
		fileName = `talk-${Math.random().toString(36).substring(2, 8)}.txt`
		content = new LoremIpsum().generateParagraphs(3)
		contentType = 'text/plain'
	} else if (fileType === 1) {
		// Markdown file with lorem ipsum
		fileName = `talk-${Math.random().toString(36).substring(2, 8)}.md`
		content = `# ${new LoremIpsum().generateWords(3)}\n\n${new LoremIpsum().generateParagraphs(3)}`
		contentType = 'text/markdown'
	} else {
		// Random image from picsum
		fileName = `talk-${Math.random().toString(36).substring(2, 8)}.jpg`
		const imageResponse = await fetch('https://picsum.photos/200/300')
		content = await imageResponse.arrayBuffer()
		contentType = 'image/jpeg'
	}
	
	const uploadResponse = await fetch(`${config.nextcloudUrl}/remote.php/dav/files/${user}/Talk/${fileName}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Basic ${Buffer.from(`${user}:${user}`).toString('base64')}`,
			'Content-Type': contentType,
		},
		body: content,
	})
	
	if (!uploadResponse.ok) {
		console.error(`Error uploading file for ${user}: ${uploadResponse.statusText}`)
		return null
	}
	
	console.log(`Uploaded ${fileName} for ${user}`)
	return { fileName, contentType }
}

const shareFileToConversation = async (user, fileName, talkRoom) => {
	const shareResponse = await fetch(`${config.nextcloudUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`, {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${Buffer.from(`${user}:${user}`).toString('base64')}`,
			'Content-Type': 'application/json',
			'OCS-APIRequest': 'true'
		},
		body: JSON.stringify({
			shareType: 10, // Share to conversation
			shareWith: talkRoom,
			path: `/Talk/${fileName}`,
			talkMetaData: JSON.stringify({
				messageType: 'comment',
				caption: new LoremIpsum().generateSentences(1),
				silent: false
			})
		})
	})

	if (!shareResponse.ok) {
		console.error(`Error sharing file for ${user}: ${shareResponse.statusText}`)
		return false
	}
	
	console.log(`Shared ${fileName} to talk room ${talkRoom} for ${user}`)
	return true
}

const userList = await createRandomUsers(
	config.nextcloudUrl,
	config.adminUser,
	config.adminPassword,
	5
)

const numberOfTalkRooms = 10

const randomString = Math.random().toString(36).substring(2, 15)

const talkRooms = []

await loopNTimes(
	numberOfTalkRooms,
	async (index) => {
		const talkRoomName = `talkroom-${randomString}-${index}`
		console.log(`Creating talk room ${talkRoomName}`)
		const talkRoom = await createTalkRoom(
			config.nextcloudUrl,
			config.adminUser,
			config.adminPassword,
			talkRoomName
		)
		talkRooms.push(talkRoom.token)
		for (const user of userList) {
			await addUserToTalkRoom(
				config.nextcloudUrl,
				config.adminUser,
				config.adminPassword,
				talkRoom.token,
				user
			)
		}
	},
	5
)


runInParallel(
	userList,
	async (user) => {
		// Create a Talk folder for each user via WebDAV
		const response = await fetch(`${config.nextcloudUrl}/remote.php/dav/files/${user}/Talk`, {
			method: 'MKCOL',
			headers: {
				'Authorization': `Basic ${Buffer.from(`${user}:${user}`).toString('base64')}`,
			},
		})
		if (!response.ok) {
			console.error(`Error creating Talk folder for ${user}: ${response.statusText}`)
		} else {
			console.log(`Created Talk folder for ${user}`)
		}

		loopNTimes(100, async () => {
			const randomTalkRoom = talkRooms[Math.floor(Math.random() * talkRooms.length)]
			// pick random if adding a file or a message
			const shouldAddFile = Math.random() > 0.5
			if (shouldAddFile) {
				const uploadedFile = await uploadRandomFile(user)
				if (uploadedFile) {
					await shareFileToConversation(user, uploadedFile.fileName, randomTalkRoom)
				}
			} else {
				await sendChatMessage(randomTalkRoom, user)
			}
		})
	}
)
