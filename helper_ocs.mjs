import { runInParallel, loopNTimes } from './helper.mjs'

export async function createUser(
    nextcloudUrl,
    adminUser,
    adminPassword,
    userName,
    userPassword,
    groups = [],
    quota = '1G'
) {
    // create user with the admin user
    const result = await fetch(`${nextcloudUrl}/ocs/v2.php/cloud/users`, {
        method: 'POST',
        headers: {
            Authorization:
                'Basic ' +
                Buffer.from(`${adminUser}:${adminPassword}`).toString('base64'),
            'Content-Type': 'application/json',
            'OCS-APIRequest': 'true',
        },
        body: JSON.stringify({
            userid: userName,
            password: userPassword,
            groups: groups,
            quota: quota,
        }),
    })
    if (!result.ok) {
        console.error(`Error creating user ${userName}: ${result.statusText}`)
        return
    }
    console.log(`Created user ${userName}`)
}

export async function createRandomUsers(
    nextcloudUrl,
    adminUser,
    adminPassword,
    numberOfUsers
) {
    const users = []
    const randomString = Math.random().toString(36).substring(2, 15)
    const tasks = Array.from({ length: numberOfUsers }, (_, i) => i)

    await runInParallel(tasks, async (i) => {
        const userName = `random-${randomString}-user${i}`
        const userPassword = userName
        await createUser(
            nextcloudUrl,
            adminUser,
            adminPassword,
            userName,
            userPassword
        )
        users.push(userName)
    })

    return users
}

export async function createGroup(
    nextcloudUrl,
    adminUser,
    adminPassword,
    groupName
) {
    const result = await fetch(`${nextcloudUrl}/ocs/v2.php/cloud/groups`, {
        method: 'POST',
        headers: {
            Authorization:
                'Basic ' +
                Buffer.from(`${adminUser}:${adminPassword}`).toString('base64'),
            'Content-Type': 'application/json',
            'OCS-APIRequest': 'true',
        },
        body: JSON.stringify({
            groupid: groupName,
        }),
    })

    if (!result.ok) {
        console.error(`Error creating group ${groupName}: ${result.statusText}`)
        return
    }
    console.log(`Created group ${groupName}`)
}

export async function shareFile(
    nextcloudUrl,
    userName,
    userPassword,
    fileName,
    shareWith,
    permissions = 31,
    shareType = 0
) {
    // Share file with target user via OCS API
    const shareResult = await fetch(
        `${nextcloudUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
        {
            method: 'POST',
            headers: {
                Authorization:
                    'Basic ' +
                    Buffer.from(`${userName}:${userPassword}`).toString(
                        'base64'
                    ),
                'Content-Type': 'application/json',
                'OCS-APIRequest': 'true',
            },
            body: JSON.stringify({
                shareType,
                path: `/${fileName}`,
                shareWith,
                permissions: permissions,
            }),
        }
    )

    if (!shareResult.ok) {
        console.error(
            `Error sharing file ${fileName} from ${userName} with ${shareWith}: ${shareResult.statusText}`
        )
        return
    }
    console.log(`Shared file ${fileName} from ${userName} with ${shareWith}`)
}

export async function createTalkRoom(
    nextcloudUrl,
    adminUser,
    adminPassword,
    roomName
) {
    const result = await fetch(
        `${nextcloudUrl}/ocs/v2.php/apps/spreed/api/v4/room`,
        {
            method: 'POST',
            headers: {
                Authorization:
                    'Basic ' +
                    Buffer.from(`${adminUser}:${adminPassword}`).toString(
                        'base64'
                    ),
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'OCS-APIRequest': 'true',
            },
            body: JSON.stringify({
                roomName,
            }),
        }
    )

    if (!result.ok) {
        console.error(
            `Error creating talk room ${roomName}: ${result.statusText}`
        )
        return
    }
    console.log(`Created talk room ${roomName}`)

    const response = await result.json()

    return response.ocs.data
}

export async function addUserToTalkRoom(
    nextcloudUrl,
    adminUser,
    adminPassword,
    roomToken,
    userName
) {
    const result = await fetch(
        `${nextcloudUrl}/ocs/v2.php/apps/spreed/api/v4/room/${roomToken}/participants`,
        {
            method: 'POST',
            headers: {
                Authorization:
                    'Basic ' +
                    Buffer.from(`${adminUser}:${adminPassword}`).toString(
                        'base64'
                    ),
                'Content-Type': 'application/json',
                'OCS-APIRequest': 'true',
            },
            body: JSON.stringify({
                newParticipant: userName,
                source: 'users',
            }),
        }
    )

    if (!result.ok) {
        console.error(
            `Error adding user ${userName} to talk room ${roomToken}: ${result.statusText}`
        )
        return
    }
    console.log(`Added user ${userName} to talk room ${roomToken}`)
}
