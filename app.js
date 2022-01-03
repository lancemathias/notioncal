import { Client } from '@notionhq/client';
import * as fs from 'fs';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

//File paths
const constantsFile = 'constants.json';
const credentialsFile = 'credentials.json';
const tokenFile = 'token.json';

//Globally used constants
const constants = JSON.parse(fs.readFileSync(constantsFile));
const credentials = JSON.parse(fs.readFileSync(credentialsFile));
const token = JSON.parse(fs.readFileSync(tokenFile));

async function getNotion(client, constants, filter, sorts) {
    try {
        const response = await client.databases.query({
            database_id: constants.database_id,
            filter: filter,
            sorts: sorts
        });
        constants.last_edited = new Date();
        return response.results;
    }
    catch (err) {
        console.log(err);
    }
}

async function makeCal(credentials, token) {
    //TODO: combine all token files at some point LATER??
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    auth.setCredentials(token);
    return auth
}

async function notionToGcal(event) {
    const task = event.properties;
    if ('Due Date' in task && 'date' in task['Due Date'] && 'start' in task['Due Date'].date) {    
        try {
            //get rid of time, all events are all-day
            const date = task['Due Date'].date.start.substring(0, 10);
            const event = {
                'summary': task.Name.title[0].text.content,
                'start': {
                    'date': date 
                },
                'end': {
                    'date': date
                }
            }
            if ('Status' in task) {
                event['colorId'] =  colors[task.Status.select.color];
            }
            return event;
        }
        catch (err) {
            console.log(err);
        }
    }
}

async function uploadEvent(calendar, _auth, id, event) {
    try {
        const response = await calendar.events.insert({
            auth: _auth,
            calendarId: id,
            resource: event
        });
        return response;
    }
    catch (err) {
        console.log(err);
    }
}

async function toCal(auth, id, events) {
    const calendar = google.calendar({ version: 'v3', auth });
    events.forEach(async (element) => {
        const event = await notionToGcal(element);
        if (event !== undefined) {
            console.log(uploadEvent(calendar, auth, id, event));
        }
    });
}

//Get Notion client
const notion = new Client({ auth: constants.notion_secret });

//Get events
const filter = {
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
        property: 'Due Date',
        direction: 'descending'
    }
];

//map the Notion event colors to Google Calendar event colors
const colors = {'red': 4, 'yellow': 5, 'green': 2}

const events = await getNotion(notion, constants, filter, sorts);

//Convert to GC format and push to calendar
const auth = await makeCal(credentials, token);

toCal(auth, constants.gc_id, events);

//Update our config file to reduce redundancy
fs.writeFile(constantsFile, JSON.stringify(constants, null, 4), (err) => {
    if (err) console.log(err);
});