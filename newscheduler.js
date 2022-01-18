/**
 * If events are changed, recalculate the entire fucking table lol
 * Else working 
 */

//Utility classes
/**
 * Utility class to simplify Notion tasks because they FUCKING SUCK
 */
class Task {
    constructor(task) {
        self.object = task        
        self.id = task.id
        if('Name' in task.properties) {    
            self.name = task.properties.Name.title[0].plain_text
        }
        if('Due' in task.properties) {
            self.due = task.properties.Due.date.start.substring(0,10)
        }
        if('Time' in task.properties) {
            self.time = task.properties.Time.number 
        }
    }
}

/**
 * Utility class to handle the caching of time blocks; Contains a list of active Tasks as well as the last updated list of time blocks
 */
class Record {
    constructor(record) {
        self.active = record.active
        self.blocks = record.blocks
    }
}

const filtered = tasks.filter(task => task.due && task.time)
.sort((a,b) => a.due - b.due)

/**
 * Assign blocks assuming everything is perfectly formatted
 * @param {Task[]} tasks An array of Task objects where all have the due and time properties, sorted by due date (soonest first)
 * @param {Object[]} conflicts An array of Calendar events, where all have a specific time, sorted by soonest last
 * @param {Record} record A valid Record object
 * @param {Object} constants Passed in from a validly formed constants.json which defines earliest and latest working times
 */
function assignBlocks(tasks, conflicts, record, constants) {
    
}