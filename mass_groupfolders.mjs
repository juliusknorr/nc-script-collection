import { runOcc, ensureAppIsEnabled, loopNTimes } from './helper.mjs'

await ensureAppIsEnabled('groupfolders')

const createGroupFolder = async (name, groups = ['admin']) => {
	console.log(`Creating group folder ${name}`)
	const groupFolderId = parseInt(
		(await runOcc(`groupfolder:create ${name}`)).trim()
	)
	for (const group of groups) {
		await runOcc(
			`groupfolder:group ${groupFolderId} ${group} read write share delete`
		)
	}
	console.log(`Group folder ${name} created`)
}

const numberOfGroupFolders = 10

await loopNTimes(
	numberOfGroupFolders,
	async (i) => {
		await createGroupFolder(`groupfolder-${i}`)
	},
	10
)
