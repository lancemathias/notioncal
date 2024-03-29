/**
 * index.js 
 * By Lance Mathias <l.a.mathia1@gmail.com>
 * Creates Google calendar time blocks from Notion. For more info, read README
 */
'use strict'

import {} from 'dotenv/config'
import { Client } from '@notionhq/client';
import fs from 'fs';
import { google } from 'googleapis';
import { Task, Record, Block, assignBlocks } from './scheduler.js';
import { getNotion, getAuth, uploadEvent, getConflicts} from './interfaces.js'

//Pull locally cached blocks record
let record
try {
    record = new Record(JSON.parse(fs.readFileSync('./record.json')))
}
catch (err) {
    console.log(err)
    record = new Record()
}

//Sorts and filters for relevant Notion tasks
const filters = {
    and: [
        {
            property: 'Last Edited',
            date: {
                after: process.env.LAST_CHECKED
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

async function main() {
    const notion = await getNotion(new Client({ auth: process.env.NOTION_KEY }), filters, sorts)
    const tasks = notion.map(task => new Task(task))

    //Initialize GCal client
    const auth = await getAuth(JSON.parse(process.env.GCAL_CREDENTIALS), JSON.parse(process.env.GCAL_TOKEN));
    const calendar = google.calendar({ version: 'v3', auth });

    const conflicts = await getConflicts(calendar, tasks) 

    const changedBlocks = assignBlocks(tasks, conflicts, record)

    record.blocks.forEach(block => {
        uploadEvent(calendar, auth, block)
    })

    //Cache updated record
    try {
        if(record) {
            fs.writeFileSync('./record.json', JSON.stringify(record, null, 4))
        }
    }
    catch (err) {
        console.log(err)
    }
}

await main()