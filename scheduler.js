/**
 * NEW CREATION
 * Sort by due date (nearest first)
 * Go down the list and assign each task one slot, repeat until all tasks will be done
 * Find tasks which are overdue
 * For each overdue task, iterate over all slots before it and see if there's a *non adjacent* slot \
 * that can be swapped 
 * If not, see if any slots at all can be swapped
 * If not, color item in red and provide message 
 * LENGTHEN EXISTING
 * Tack extra slots onto the end
 * Iterate over times starting from now and ending before due and see if we can swap any without \
 * breaking the rules
 * If not then swap every other with slots for the assignment that is due the farthest away
 * SHORTEN EXISTING
 * Free the block and we are done
 * BLOCK STRUCTURE
 * Should be done/stored locally to avoid over-querying the Calendar API
 * Try a dict
 */

function assignBlocks(calendar, events, blocks) {
    //Only take valid events (both due date and time estimate) and sort by soonest due
    events = events.filter(task=>'Due Date' in task.properties && 'date' in task.properties['Due Date']
    && 'start' in task.properties['Due Date'].date &&
    'Time commitment' in task.properties && 'rich text' in task.properties['Time commitment'] &&
    task.properties['Time commitment'].length && 
    'content' in task.properties['Time commitment'].rich_text[0].text)
    .sort((a,b)=>a['Due Date'].date.start.substring(0, 10)-b['Due Date'].date.start.substring(0, 10));
    
    //Start scheduling from the next hour
    let currTime = new Date();
    currTime.setHours(currTime.getHours() + 1);
    currTime.setMinutes(0,0,0);
    
    //Get list of potentially conflicting events (between now and last due date, with scheduled times)
    let conflicts = calendar.events.list({
        calendarId: 'primary',  //which calendar should we check???
        timeMin: currTime,
        timeMax: new Date(events[events.length - 1].properties['Due Date'].date),
        singleEvents: true,
        orderBy: 'startTime'
    }, (err, res) => {
        if (err) return console.log('API Error: ' + err);
        const events = res.data.items;
        if (events.length) {
            return events.filter(event => 'dateTime' in event.start)
            .map(event => ({start: event.start.dateTime, end: event.end.dateTime}));
        }
        else return [];
    });
    
    //Make a list representing the length of each event
    //TODO: how do we want to format the time??? - convert to int in notion?
    times = events.map(event => parseInt(event.properties['Time commitment'].rich_text[0].text.content));

    //TODO: move everything to the new simplified Notion DB, also create a new calendar for testing
    //Give blocks of time to each event until all events are scheduled
    while(times.length) {
        //how to compare time ranges?!?!?!?
        /*
        //TODO: define working hours range somewhere
        1. See if current time overlaps an event or outside working hours, if so skip to next available time
        2. Schedule block for max block size or until task is done or conflict
        2.5.  If task is is done, remove from times list
        */
    }
}