import { google } from 'googleapis';

async function getNotion(client, filter, sorts) {
    try {
        const response = await client.databases.query({
            database_id: process.env.NOTION_ID,
            filter: filter,
            sorts: sorts
        });
        process.env.LAST_CHECKED = new Date();
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

function notionToGcal(event) {
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
                event['colorId'] = colors[task.Status.select.color];
            }
            return event;
        }
        catch (err) {
            console.log(err);
        }
    }
}

function blockToGcal(block) {
   //Colors for GCal events
    const colors = { 'red': 4, 'yellow': 5, 'green': 2, 'overdue': 11 }
    try {
        const event = {
            'summary': block.task.name,
            'description': block.task.id,
            'start': {
                'dateTime': block.start
            },
            'end': {
                'dateTime': block.end

            },
            eventType: 'focusTime',
        }
        if (block.end > block.task.due) { event.colorId = colors.overdue }
        return event
    }
    catch (err) { console.log(err) }
}

async function uploadEvent(calendar, auth, block) {
    //Colors for GCal events
    const colors = { 'red': 4, 'yellow': 5, 'green': 2, 'overdue': 11 }
    
    try {
        const event = {
            'summary': block.task.name,
            'description': block.task.id,
            'start': {
                'dateTime': block.start
            },
            'end': {
                'dateTime': block.end

            },
            eventType: 'focusTime',
        }
        if (block.end > block.task.due) { event.colorId = colors.overdue }

        if(block.task == 'Free' && block.gc_id) {
            const response = await calendar.events.delete({
                auth: auth, eventId: block.gc_id,
                calendarId: process.env.TASK_CALENDAR_ID
            })
        }
        else if (block.gc_id) {
            const response = await calendar.events.update({
                auth: auth,
                eventId: block.gc_id,
                calendarId: process.env.TASK_CALENDAR_ID,
                resource: event
            })
            return response
        }
        else {
            const response = await calendar.events.insert({
                auth: auth,
                calendarId: process.env.TASK_CALENDAR_ID,
                resource: event
            })
            block.gc_id = response.eventId
            return response
        }
    }
    catch (err) {
        console.log(err);
    }
}

//Get list of potentially conflicting calendar events 
async function getConflicts(calendar, tasks) {
    try {
        let filtered = tasks.sort((a, b) => a.due - b.due);
        const start = new Date();
        const end = filtered[filtered.length - 1].due;
        const res = await calendar.events.list({
            calendarId: 'primary',  //which calendar should we check???
            timeMin: start,
            timeMax: end,
            singleEvents: true,
            orderBy: 'startTime'
        })
        return res.data.items.filter(event => 'dateTime' in event.start)
            .map(event => ({ start: event.start.dateTime, end: event.end.dateTime }));
    }
    catch (err) { return console.log(err); }
}

export { getNotion, getAuth, notionToGcal, blockToGcal, uploadEvent, getConflicts}