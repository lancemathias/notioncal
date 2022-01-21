import { Client } from '@notionhq/client';
import fs from 'fs';
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

async function getAuth(credentials, token) {
    //TODO: combine all token files at some point LATER??
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    auth.setCredentials(token);
    return auth
}

async function notionToGcal(event) {
    const task = event.properties;
    if ('Due' in task && 'date' in task.Due && 'start' in task.Due.date) {    
        try {
            //get rid of time, all events are all-day
            const date = task.Due.date.start.substring(0, 10);
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

async function uploadEvent(calendar, auth, id, event) {
    try {
        const response = await calendar.events.insert({
            auth: auth,
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

//Get list of potentially conflicting calendar events 
async function getConflicts(calendar, events) {
    //Filter by valid events and sort by due date -- we want the latest one
    //TODO: this can be more efficient
    try {     
        let filtered = events.filter(event => getPropDate(event) !== undefined && getPropTime(event) !== undefined)
        .sort((a,b)=>getPropDate(a).substring(0, 10)-getPropDate(b).substring(0, 10));
        const currTime = new Date();
        const lastDate = new Date(getPropDate(filtered[filtered.length - 1]));
        const res = await calendar.events.list({
            calendarId: 'primary',  //which calendar should we check???
            timeMin: currTime,
            timeMax: lastDate,
            singleEvents: true,
            orderBy: 'startTime'
        })
        return res.data.items.filter(event => 'dateTime' in event.start)
        .map(event => ({start: getEventStart(event), end: getEventEnd(event)}));
    }
    catch (err) { return console.log('API Error: ' + err); }
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
        property: 'Due',
        direction: 'descending'
    }
];

//map the Notion event colors to Google Calendar event colors
const colors = {'red': 4, 'yellow': 5, 'green': 2, 'overdue': 11}

//For now, read from local file to avoid API calls
const events = JSON.parse(fs.readFileSync('notion.json'))
//const events = await getNotion(notion, constants, filter, sorts);
fs.writeFile("notion.json", JSON.stringify(events, null, 4), (err) => {
    if (err) console.log(err);
});

//Convert to GC format and push to calendar
const auth = await getAuth(credentials, token);

//toCal(auth, constants.gc_id, events);

//Update our config file to reduce redundancy
fs.writeFile(constantsFile, JSON.stringify(constants, null, 4), (err) => {
    if (err) console.log(err);
});