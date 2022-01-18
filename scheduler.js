/**
 * [x] NEW CREATION
 * [x] Sort by due date (nearest first)
 * [x] Go down the list and assign each task one slot, repeat until all tasks will be done
 * [] Find tasks which are overdue
 * [] For each overdue task, iterate over all slots before it and see if there's a *non adjacent* slot \
 * [] that can be swapped 
 * [] If not, see if any slots at all can be swapped
 * [] If not, color item in red and provide message 
 * [] LENGTHEN EXISTING
 * [] Tack extra slots onto the end
 * [] Iterate over times starting from now and ending before due and see if we can swap any without \
 * [] breaking the rules
 * [] If not then swap every other with slots for the assignment that is due the farthest away
 * []SHORTEN EXISTING
 * [] Free the block and we are done
 * [x] BLOCK STRUCTURE
 * [x] Should be done/stored locally to avoid over-querying the Calendar API
 * Try a ~~dict~~ list
 */

//import * as Math from 'Math';

/**
 * Gets the due date from a Notion property
 * @param {*} event a properly formatted Notion event object 
 * @returns the due date in dateTime format
 */
function getPropDate(event) {
    try {
        return event.properties.Due.date.start;
    }
    catch (err) {
        console.log(err);
    }
}

/**
 * Returns the time commitment from a Notion property
 * @param {*} event a properly formatted Notion event object
 * @returns expected time commitment as integer(or decimal) hours
 */
function getPropTime(event) {
    try {
        return event.properties.Time.number;
    }
    catch (err) {
        console.log(err);
    }
}

function getEventStart(event) {
    try {
        return 'date' in event.start ? event.start.date : event.start.dateTime;
    }
    catch (err) {
        console.log(err);
    }
}

function getEventEnd(event) {
    try {
        return 'date' in event.end ? event.end.date : event.end.dateTime;
    }
    catch (err) {
        console.log(err);
    }
}

//Get list of potentially conflicting calendar events 
async function getConflicts(calendar, events, opts) {
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

/** 
 * 1. Start on current time
 * 2. Check for validity
 *  2.1. Is there enough time before conflict?
 *  2.2. Is there enough time before end of day?
 *  2.3. If not, move accordingly (this is DIFFERENT for each above case)
 *  2.4. Back to 2.1, repeat until 2.1 AND 2.2 satisfied
 * 3. Schedule event
 * 4. Move time to after event
 * 5. Repeat at 1.
*/

function nextValidtime(currTime, conflicts, opts) {
    /**
     * Returns the next time that is during working hours and can be scheduled with a block of at least
     * min size.
     * currTime: a Date object to currTime checking from
     * conflicts: a sorted list of Conflicts objects that's sorted by soonest last
     */
    while (currTime.getHours() > (opts.endTime-opts.min_block_size/360000000) && currTime.getHours() < currTimeTime && 
    currTime.getTime() < conflicts[conflicts.length].start.getTime()-opts.min_block_size) {
        if (currTime.getHours() <= (opts.endTime-opts.min_block_size/360000000)) {
            currTime.setHours(currTimeTime)
            currTime.setDate(currTime.getDate+1)
        }
        if(currTime.getHours() < currTime) {
            currTime.setHours(currstart)
        }
        if(currTime.getTime() < conflicts[conflicts.length-1].start.getTime()-opts.min_block_size) {
            currTime.setTime(conflicts[conflicts.length-1].end.getTime())
        }
    }
    return currTime
}


//restructure blocks to have: active events with event and basic data(due date, time commitment, event ref)
//also contains blocks array
//blocks now called record
//record structure:
/*
record = {
    active: [] list of event references 
    blocks: [] list of blocks objects
}
*/
function assignBlocks(conflicts, events, record, opts) {
    //Only take valid events (both due date and time estimate) and sort by soonest due
    let filteredEvents = events.filter(event => getPropDate(event) !== undefined && getPropTime(event) !== undefined)
    .sort((a,b)=>getPropDate(a).substring(0, 10)-getPropDate(b).substring(0, 10));

    //Filter out events that were modified and aren't new and deal with them separately
    if ('active' in record) {
        let activeIds = record.active.map(event => event.object.id)
        let modifiedEvents = filteredEvents.filter(event => activeIds.includes(event.id))  
    }
    else {
        let activeIds = []
        let modifiedEvents = []
    }
    /**
     * If shortened:
     *  get list of changed events 
     *  get list of times that shortened events were shortened by 
     *  start looking at blocks from last event
     *  if block is in event that should be shortened, delete event or shorten it until until updated time is reached
     * If lengthened:
     *  get list of times that lengthened events were extended by
     *  make list of new events with same id as existing event, place just like newly created events
     * If due changed: 
     *  change due date on event object
     *  we are done, rebalance like normal 
     */

    let shortened = modifiedEvents.filter(modded => getPropTime(modded) < getPropTime(filteredEvents.find(event => event.id == modded.id)))
    let shortenedBy = shortened.map(modded => getPropTime(filteredEvents.find(event => event.id == modded.id)) - getPropTime(modded))
    while(shortenedBy.length) {

    }
    let lengthened = modifiedEvents.filter(modded => getPropTime(modded) > getPropTime(filteredEvents.find(event => event.id == modded.id)))
    let lengthened = lengthened.filter(modded => getPropTime(modded) - getPropTime(filteredEvents.find(event => event.id == modded.id)))
    //find events with changed due date and change the due date
    modifiedEvents.forEach(modded => {
        let original = filteredEvents.find(event => event.id == modded.id)
        if(getPropDate(modded) !== getPropDate(changed)) {
            original.object.properties.Due.date.start = getPropDate(modded)
        }
    })

    //Make a list representing the length of each event
    let times = filteredEvents.map(event => parseFloat(getPropTime(event)));
    
    //Start scheduling from the next hour; set time to now and perform checks in the loop
    let currTime = new Date();
    currTime.setHours(currTime.getHours()+1);
    currTime.setMinutes(0,0,0);

    let sortedConflicts = conflicts.sort((prev, curr) => {
        new Date(getEventStart(curr)).getTime() - new Date(getEventStart(prev)).getTime();
    });

    //Give blocks of time to each event until all events are scheduled
    while(times.length) {
        /*
        1. See if current time overlaps an event or outside working hours, if so skip to next available time
        2. Schedule block for max block size or until task is done or conflict
        2.5.  If task is is done, remove from times list
        */
       
       filteredEvents.forEach((element, index) => {
            sortedConflicts = sortedConflicts.filter(conflict => currTime < new Date(conflict.end.dateTime))
            currTime = nextValidtime(currTime, conflicts, opts);
            let endOfDay = new Date()
            if(endOfDay.getHours() >= opts.endTime) {
                endOfDay.setDate(endOfDay.getDate() + 1)
            }
                endOfDay.setHours(opts.endTime, 0, 0)
            let blockEnd = new Date(currTime.getTime() + Math.min(opts.max_block_size, times[index]*3600000, 
            (new Date(conflicts[conflicts.length-1].start.dateTime)).getTime()-currTime.getTime(),
            endOfDay.getTime()-currTime.getTime()))
            let currBlock = {
                object: element, 
                start: currTime, 
                end: blockEnd, 
            }
            //TODO: make this more efficient by minimizing date casts

            //find non-conflicting time for current block
            
            record.push(currBlock);
            times[index] -= (currBlock.end.getTime() - currBlock.start.getTime())/3600000
        });
        filteredEvents = filteredEvents.filter((_, index) => times[index] > 0)
        times = times.filter(time => time > 0)
    }
}

export default { getConflicts, assignBlocks };