import { Client } from '@notionhq/client';
import fs from 'fs';
import { google } from 'googleapis';
import { Task, Record, Block, assignBlocks } from './scheduler.js';
import { getNotion, getAuth, notionToGcal, blockToGcal, uploadEvent, getDupes, getConflicts} from './interfaces.js'

//File paths
const constantsFile = 'constants.json';
const credentialsFile = 'credentials.json';
const tokenFile = 'token.json';

//Globally used constants
const constants = JSON.parse(fs.readFileSync(constantsFile));
const credentials = JSON.parse(fs.readFileSync(credentialsFile));
const token = JSON.parse(fs.readFileSync(tokenFile));

//Colors for GCal events
const colors = { 'red': 4, 'yellow': 5, 'green': 2, 'overdue': 11 }

//Sorts and filters for relevant Notion tasks
const filters = {
    and: [
        {
            property: 'Last Edited',
            date: {
                after: constants.last_edited
            }
        },
        {
            property: 'Status',
            select: {
                does_not_equal: 'Done'
            }
        }
    ]
};

const sorts = [
    {
        property: 'Due',
        direction: 'descending'
    }
];

//For now, read from local file to avoid API calls
const events = JSON.parse(fs.readFileSync('notion.json'))
fs.writeFile("notion.json", JSON.stringify(events, null, 4), (err) => {
    if (err) console.log(err);
});
//AWFUL GARBAGE SHIT CODE DELETE SOON PLS

//Initialize Notion client
const notion = await getNotion(new Client({ auth: constants.notion_secret }), constants, filters, sorts)
const tasks = notion.map(task => new Task(task))

//Initialize GCal client
const auth = await getAuth(credentials, token);
const calendar = google.calendar({ version: 'v3', auth });


const conflicts = await getConflicts(calendar, tasks)
const record = new Record()
const c = { short: 3600000, long: 2 * 3600000, dayStart: 9, dayEnd: 9 }

const changes = assignBlocks(tasks, conflicts, record, c)
const dupes = await getDupes(calendar, tasks, changes)
const blocks = record.blocks.map(block => blockToGcal(calendar, auth, id, block))
blocks.forEach(async (element) => {
    const event = await notionToGcal(element);
    if (event) {
        console.log(uploadEvent(calendar, auth, id, event, dupes));
    }
})
//Update our config file to reduce redundancy
fs.writeFileSync(constantsFile, JSON.stringify(constants, null, 4), (err) => {
    if (err) console.log(err);
});