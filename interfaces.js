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

async function uploadEvent(calendar, auth, id, event, dupes) {
    try {
        if (dupes.includes(event.description)) {
            const response = await calendar.events.insert({
                auth: auth,
                calendarId: id,
                resource: event
            })
        }
        else {
            const response = await calendar.events.update({
                auth: auth,
                calendarId: id,
                resource: event
            })
        }
        return response
    }
    catch (err) {
        console.log(err);
    }
}

//Get list of potentially duplicated calendar events 
async function getDupes(calendar, tasks, calId, changed) {
    try {
        let filtered = tasks.sort((a, b) => a.due.geTime() - b.due.getTime());
        const start = new Date();
        const end = new Date(getPropDate(filtered[filtered.length - 1]));
        const res = await calendar.events.list({
            calendarId: calId, 
            timeMin: start,
            timeMax: end,
            singleEvents: true,
            orderBy: 'startTime'
        })
        return res.data.items.filter(event => changed.includes(event.description))
            .map(event => event.description);
    }
    catch (err) { return console.log(err); }
}

//Get list of potentially conflicting calendar events 
async function getConflicts(calendar, tasks) {
    try {
        let filtered = tasks.sort((a, b) => a.due.geTime() - b.due.getTime());
        const start = new Date();
        const end = new Date(getPropDate(filtered[filtered.length - 1]));
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

export { getNotion, getAuth, notionToGcal, blockToGcal, uploadEvent, getDupes, getConflicts}