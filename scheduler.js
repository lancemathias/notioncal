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

//import * as Math from 'Math';

//set start and end times on the hour
//TODO: assign these somewhere useful
let max_block_size = 7200000;   //2 hours in ms 
let min_block_size = 1800000;   //half an hour minimum
let startTime = 10;
let endTime = 20;

function getPropDate(event) {
    try {
        return event.properties.Due.date.start;
    }
    catch (err) {
        console.log(err);
    }
}

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

function nextValidtime(currTime, conflicts) {
    /**
     * Returns the next time that is during working hours and can be scheduled with a block of at least
     * min size.
     * currTime: a Date object to currTime checking from
     * conflicts: a sorted list of Conflicts objects that's sorted by soonest last
     */
    while (currTime.getHours() > (endTime-min_block_size/360000000) && currTime.getHours() < currTimeTime && 
    currTime.getTime() < conflicts[conflicts.length].start.getTime()-min_block_size) {
        if (currTime.getHours() <= (endTime-min_block_size/360000000)) {
            currTime.setHours(currTimeTime)
            currTime.setDate(currTime.getDate+1)
        }
        if(currTime.getHours() < currTime) {
            currTime.setHours(currstart)
        }
        if(currTime.getTime() < conflicts[conflicts.length-1].start.getTime()-min_block_size) {
            currTime.setTime(conflicts[conflicts.length-1].end.getTime())
        }
    }
    return currTime
}

function assignBlocks(conflicts, events, blocks) {
    //Only take valid events (both due date and time estimate) and sort by soonest due
    const filteredEvents = events.filter(event => getPropDate(event) !== undefined && getPropTime(event) !== undefined)
    .sort((a,b)=>getPropDate(a).substring(0, 10)-getPropDate(b).substring(0, 10));
    
    //Make a list representing the length of each event
    const times = events.map(event => parseInt(getPropTime(event)));
    
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
       
       events.forEach((element, index, array) => {
           conflicts = conflicts.filter(conflict => currTime < new Date(conflict.end.dateTime))
           currTime = nextValidtime(currTime, conflicts);
           let endOfDay = new Date(currTime)
           endOfDay.setHours(endTime, 0, 0);
           let endTime = currTime.getTime() + Math.min(max_block_size, times[index]*360000000, currTime.getTime()-conflicts[conflicts.length-1].start.getTime(),
           endOfDay.getTime()-currTime.getTime())
           let currBlock = {
               name: element.name,
               id: element.id, 
               start: currTime, 
               end: endTime
            }
            //TODO: make this more efficient by minimizing date casts

            //find non-conflicting time for current block
            
            blocks.push(currBlock);
            times[index] -= (currBlock.end.getTime() - currBlock.start.getTime())/360000000
        });
        times = times.filter(time => time > 0)
    }
}

export default { getConflicts, assignBlocks };