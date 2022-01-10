import fs from 'fs'
import scheduler from './scheduler.js'

function makeCal(credentials, token) {
    //TODO: combine all token files at some point LATER??
    const { client_secret, client_id, redirect_uris } = credentials.installed
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
    auth.setCredentials(token)
    return auth
}

//File paths
const constantsFile = 'constants.json'
const credentialsFile = 'credentials.json'
const tokenFile = 'token.json'

const events = JSON.parse(fs.readFileSync('notion.json'))
const conflicts = JSON.parse(fs.readFileSync('conflicts.json'))

const constants = JSON.parse(fs.readFileSync(constantsFile))
const credentials = JSON.parse(fs.readFileSync(credentialsFile))
const token = JSON.parse(fs.readFileSync(tokenFile))

const cal = makeCal(credentials, token)

const conflictsList = getConflicts(calendar, events)
console.log(conflictsList)

const blocks = []
assignBlocks(conflctsList, events, blocks)
console.log(JSON.stringify(blocks, null, 4))