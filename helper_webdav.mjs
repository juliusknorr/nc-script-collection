export async function createRandomTextFile(
    nextcloudUrl,
    userName,
    userPassword,
    fileName
) {
    const fileContent = `This is a test file created for user ${userName} with some random content: ${Math.random()}`

    // Upload file via WebDAV
    const result = await fetch(
        `${nextcloudUrl}/remote.php/dav/files/${userName}/${fileName}`,
        {
            method: 'PUT',
            headers: {
                Authorization:
                    'Basic ' +
                    Buffer.from(`${userName}:${userPassword}`).toString(
                        'base64'
                    ),
                'Content-Type': 'text/plain',
                'Content-Length': fileContent.length,
            },
            body: fileContent,
        }
    )

    if (!result.ok) {
        console.error(
            `Error creating file ${fileName} for user ${userName}: ${result.statusText}`
        )
        return null
    }

    console.log(`Created file ${fileName} for user ${userName}`)
    return fileName
}

export async function createFolder(
    nextcloudUrl,
    userName,
    userPassword,
    folderName
) {
    const result = await fetch(
        `${nextcloudUrl}/remote.php/dav/files/${userName}/${folderName}`,
        {
            method: 'MKCOL',
            headers: {
                Authorization:
                    'Basic ' +
                    Buffer.from(`${userName}:${userPassword}`).toString(
                        'base64'
                    ),
            },
        }
    )

    if (!result.ok) {
        console.error(
            `Error creating folder ${folderName} for user ${userName}: ${result.statusText}`
        )
        return null
    }

    console.log(`Created folder ${folderName} for user ${userName}`)
    return folderName
}
