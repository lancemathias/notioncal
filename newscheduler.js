'use strict'

//Utility classes
/**
 * Utility class to simplify Notion tasks because they FUCKING SUCK
 */
class Task {
    constructor(task) {
        this.object = task
        this.id = task.id
        if (task.properties && 'Name' in task.properties) {
            this.name = task.properties.Name.title[0].plain_text
        }
        if (task.properties && 'Due' in task.properties) {
            this.due = new Date(task.properties.Due.date.start)
        }
        if (task.properties && 'Time' in task.properties) {
            this.time = parseFloat(task.properties.Time.number) * 3600000   //idk pick a better time standard
        }
    }
}

/**
 * Utility class to handle the caching of time blocks; Contains a list of active Tasks as well as the last updated list of time blocks
 */
class Record {
    constructor(record) {
        this.active = record && record.active ? record.active : []
        this.blocks = record && record.blocks ? record.blocks : []
        this.free = record && record.free ? record.free : []
    }
}

/**
 * Utility class to represent a block of time devoted to a Task 
 */
class Block {
    constructor(start, end, task) {
        this.task = task
        this.start = new Date(start)
        this.end = new Date(end)
        this.length = this.end.getTime() - this.start.getTime()
    }
}

/**
 * Returns a valid Block object which is either short or long time and satisfies given constraints
 * @param {Date} start the time to start looking from
 * @param {Task} task the task which will be bound to the Block object
 * @param {Object[]} conflicts list of conflicts in Google calendar event format
 * @param {Number} short length of a short block in ms
 * @param {Number} long length of a long block in ms
 * @param {Number} dayStart integer representing the earliest hour we can schedule
 * @param {Number} dayEnd integer representing the latest hour we can schedule
 * @returns 
 */
function createValidBlock(start, task, conflicts, short, long, dayStart, dayEnd) {
    //Pull default params from dotenv
    if (short === undefined) {
        short = process.env.short
    }
    if (long === undefined) {
        long = process.env.long
    }
    if (dayStart === undefined) {
        dayStart = process.env.dayStart
    }
    if (dayEnd === undefined) {
        dayEnd = process.env.dayEnd
    }
    if (start.getHours() < dayStart) {
        start.setHours(dayStart,0,0,0)
    }

    let end = start
    while (end.getTime() - start.getTime() < short) {
        let eod = (new Date(start))
        eod.setHours(dayEnd, 0, 0, 0)
        if (conflicts.length) {
            let nextConflict = conflicts[conflicts.length - 1]

            if (nextConflict.start.getTime() - start.getTime() >= long && eod.getTime() - start.getTime() >= long) {
                end = new Date(start.getTime() + long)
                break
            }
            else if (nextConflict.start.getTime() - start.getTime() >= short && eod.getTime() - start.getTime() >= short) {
                end = new Date(start.getTime() + short)
                break
            }
            else {
                if (eod.getTime() < nextConflict.start.getTime()) {
                    start.setDate(start.getDate() + 1)
                    start.setHours(dayStart, 0, 0, 0)
                }
                else {
                    start = nextConflict.end
                }
                conflicts = conflicts.filter(conflict => conflict.end.getTime() > start.getTime())
            }
        }
        else {
            if (eod.getTime() - start.getTime() >= long) {
                end = new Date(start.getTime() + long)
                break
            }
            else if (eod.getTime() - start.getTime() >= short) {
                end = new Date(start.getTime() + short)
                break
            }
            else {
                start.setDate(start.getDate() + 1)
                start.setHours(dayStart, 0, 0, 0)
            }
        }
    }
    return new Block(start, end, task)
}

/**
 * Assign blocks assuming everything is perfectly formatted
 * @param {Task[]} tasks An array of Task objects where all have the due and time properties, sorted by due date (soonest first)
 * @param {Object[]} conflicts An array of Calendar events, where all have a specific time, sorted by soonest last
 * @param {Record} record A valid Record object
 * @param {Object} constants Passed in from a validly formed constants.json which defines earliest and latest working times
 */
function assignBlocks(tasks, conflicts, record, constants) {
    let existingIds = record.active.map(task => task.object.id)

    let changes = tasks.filter(task => existingIds.includes(task.id))


    //process changed events
    let lengthened = changes.filter(task => task.time.getTime() > record.active.find(old => task.id == old.id))
    let lengthenedBy = lengthened.map(task => task.time - record.active.find(old => task.id == old.id).time)

    //set unused blocks of shortened events to Free so we can use them again
    let shortened = changes.filter(task => task.time.getTime() < record.active.find(old => task.id == old.id))
    let shortenBy = shortened.map(task => task.time - record.active.find(old => task.id == old.id).time)
    shortened.forEach((task, index) => {
        let potentialBlocks = record.blocks.filter(block => block.task.id == task.id).sort((a, b) => a - b)
        //try to free longer blocks first
        let last;
        while (potentialBlocks.length && (last = potentialBlocks[potentialBlocks.length - 1]).length < shortenBy[index]) {
            last.object = 'Free'
            potentialBlocks.pop()
            shortenBy[index] -= last.time
        }
        //afterwards free shorter blocks until can't remove any more
        while (potentialBlocks.length && (last = potentialBlocks[0]).length < shortenBy[index]) {
            last.object = 'Free'
            potentialBlocks.shift()
            shortenBy[index] -= last.time
        }
    })

    //modify blocks with changed Tasks
    record.blocks.forEach(block => {
        let change = changes.find(task => task.id == block.task.id)
        if (change) {
            block.task = change
        }
    })
    record.active = record.active.map(task => {
        let change = changes.find(old => old.id == task.id)
        if (change) {
            return change
        }
        else {
            return task
        }
    })

    //populate record with time blocks for new tasks plus lengthened tasks
    let newTasks = tasks.filter(task => !existingIds.includes(task.id)).concat(lengthened)
    let newBlocks = []
    let times = newTasks.map(element => element.time).concat(lengthenedBy)

    let currTime = new Date()
    currTime.setHours(currTime.getHours() + 1, 0, 0, 0)

    let freeBlocks = record.blocks.filter(block => block.task == 'Free')
    freeBlocks.forEach((free, index) => {
        let safeIndex = index % newTasks.length
        free.object = newTasks[safeIndex]
        if ((times[safeIndex] -= free.length) <= 0) {
            times.splice(safeIndex, 1)
            newTasks.splice(safeIndex, 1)
        }
    })
    let {short, long, dayStart, dayEnd} = constants ? constants:
    {}
    while (times.length) {
        newTasks.forEach((task, index) => {
            let newBlock = createValidBlock(currTime, task, conflicts, short, long, dayStart, dayEnd)
            newBlocks.push(newBlock)
            times[index] -= newBlock.length
        })
        newTasks = newTasks.filter((_, index) => times[index] > 0)
        times = times.filter(time => time > 0)
    }

    //attempt to reorder events to reach deadlines - assume that there is enough time
    let overdue = newBlocks.filter(block => block.end.getTime() > block.task.due.getTime())
    let needSwapping = overdue.map(block => block.task)
    let swappable = newBlocks.filter(block => !needSwapping.includes(block.oject))

    //first try to reorder events with same length
    overdue.forEach(block => {
        let toSwap
        let replacement = newBlocks.find(replacementBlock => swappable.includes(replacementBlock)
            && replacementBlock.end.getTime() <= block.task.due.getTime()
            && block.end.getTime() <= replacementblock.task.due.getTime() && swappable.length == block.length)
        if (replacement) swap(block, replacement)
    })
    //now try to reorder events, allowing for splitting
    overdue.forEach(block => {
        let replacement = newBlocks.find(replacementBlock => swappable.includes(replacementBlock)
            && replacementBlock.end.getTime() <= block.task.due.getTime()
            && block.end.getTime() <= replacementblock.task.due.getTime())
        if (replacement) partialSwap(block, replacement, newBlocks)
    })
    //if neither of those worked, give up!

    function swap(a, b) { 
        let tmp = a.object
        a.object = b.object
        b.object = tmp
     }
    function partialSwap(a, b, blocks) {
        if (a.length == b.length) { return swap(a, b) }
        let [short, long] = a.length < b.length ? [a, b] : [b, a]
        let part = long.start.getTime() + short.length
        blocks.push(new Block(long.start, part, short.object))
        long.start.setTime(part)
        short.objet = long.object
    }
    record.blocks = record.blocks.concat(newBlocks)
    record.active = record.active.concat(newTasks)
}

module.exports = { assignBlocks, createValidBlock, Task, Record, Block }