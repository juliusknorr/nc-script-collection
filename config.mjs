import { exec } from 'node:child_process'
import util from 'node:util'

const execAsync = util.promisify(exec)

export default {
	nextcloudUrl: 'https://nextcloud.local',
	adminUser: 'admin',
	adminPassword: 'admin',
	userName: 'user1',
	userPassword: 'user1',
	fileLink: 'https://nextcloud.local/apps/files_texteditor/?fileid=123',
	runOcc: async (command) => {
		console.debug(`#️⃣ Running command: occ ${command}`)
		try {
			const output = await execAsync(
				`docker compose exec nextcloud occ ${command}`,
				{
					cwd: '/Users/julius/repos/nextcloud/nc-dev',
					env: {
						...process.env,
					},
				}
			)
			console.debug(`  output: ${output.stdout.toString()}`)
			return output.stdout.toString()
		} catch (error) {
			throw error.toString()
		}
	},
}
