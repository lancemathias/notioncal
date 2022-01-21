'use strict'
//import scheduler from './scheduler.js'
const scheduler = require('./scheduler.js')

let notion = {
    "object": "page",
    "id": "56356e4a-6cb8-407a-838e-547e24ed88c4",
    "created_time": "2021-12-30T21:15:00.000Z",
    "last_edited_time": "2022-01-04T00:11:00.000Z",
    "cover": null,
    "icon": null,
    "parent": {
        "type": "database_id",
        "database_id": "4a6415cf-552c-4f59-8108-8214a285323e"
    },
    "archived": false,
    "properties": {
        "Status": {
            "id": "RG@x",
            "type": "select",
            "select": {
                "id": "e682b0c8-7fbe-40f8-afce-cbf88f546e98",
                "name": "Doing",
                "color": "yellow"
            }
        },
        "Created": {
            "id": "VJxt",
            "type": "created_time",
            "created_time": "2021-12-30T21:15:00.000Z"
        },
        "Last Edited": {
            "id": "YeCe",
            "type": "last_edited_time",
            "last_edited_time": "2022-01-04T00:11:00.000Z"
        },
        "Time": {
            "id": "[qtm",
            "type": "number",
            "number": 2
        },
        "Due": {
            "id": "m~DU",
            "type": "date",
            "date": {
                "start": "2022-01-15",
                "end": null,
                "time_zone": null
            }
        },
        "Name": {
            "id": "title",
            "type": "title",
            "title": [
                {
                    "type": "text",
                    "text": {
                        "content": "Test doing",
                        "link": null
                    },
                    "annotations": {
                        "bold": false,
                        "italic": false,
                        "strikethrough": false,
                        "underline": false,
                        "code": false,
                        "color": "default"
                    },
                    "plain_text": "Test doing",
                    "href": null
                }
            ]
        }
    },
    "url": "https://www.notion.so/Test-doing-56356e4a6cb8407a838e547e24ed88c4"
}

let testTask = new scheduler.Task(notion)

let t1 = {}

test('should create a long block at 1', () => {
    t1.start = new Date()
    t1.start.setHours(1, 0, 0, 0)
    t1.end = new Date(t1.start.getTime() + (2 * 3600000))
    t1.expects = new scheduler.Block(t1.start, t1.end, testTask)
    expect(scheduler.createValidBlock(t1.start, testTask, [], 3600000, 3600000 * 2, 0, 23)).toEqual(
        t1.expects)
})

let t2 = {}
test('should create a short block at 1', () => {
    t2.start = new Date(t1.start)
    t2.end = new Date(t2.start.getTime() + 3600000)
    let testConflict = {
        start: t2.end,
        end: new Date(t2.end.getTime() + 3600000),
        object: {
            "summary": "Test 1",
            "start":
            {
                "dateTime": t2.end
            },
            "end":
            {
                "dateTime": new Date(t2.end.getTime() + 3600000)
            }
        }
    }
    expect(scheduler.createValidBlock(t2.start, testTask, [testConflict], 3600000, 3600000 * 2, 0, 23)).toEqual(
        new scheduler.Block(t2.start, t2.end, testTask))
})

let t3 = {}
test('should create a long block the next day', () => {
    t3.beg = new Date(t1.start)
    t3.beg.setHours(22)
    t3.start = new Date(t1.start)
    t3.start.setDate(t3.start.getDate() + 1)
    t3.start.setHours(1, 0, 0, 0)
    t3.end = new Date(t3.start.getTime()+ (3600000*2))
    t3.block = new scheduler.Block(t3.start, t3.end, testTask)
    expect(scheduler.createValidBlock(t3.beg, testTask, [], 3600000, 
    2*3600000, 1, 10 )).toEqual(t3.block)
})


let t4 = {}
test('should create a block immediately', () => {
    t4.record = new scheduler.Record()
    let nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1, 0, 0 , 0)
    t4.expect = [new scheduler.Block(nextHour, new Date(nextHour.getTime()
    + 2*3600000), testTask)]
    scheduler.assignBlocks([testTask], [], t4.record, {
        short: 3600000, long: 2*3600000, dayStart: 1, dayEnd: 23
    })
    let out = t4.record.blocks
    let sortFun = (a,b) => a.start - b.start
    expect(t4.record.blocks.length).toBe(t4.expect.length)
    out.forEach((block, index) => expect([block.start, block.end, block.length, block.task.id])
    .toEqual([t4.expect[index].start, t4.expect[index].end, t4.expect[index].length, 
        t4.expect[0].task.id]))
})

test('should leave current block and add a new block after', () => {
    let changed = new scheduler.Task(notion)
    changed.time *= 2
    let nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1, 0, 0 , 0)
    t4.change = [new scheduler.Block(nextHour, new Date(nextHour.getTime()
        + 2*3600000), changed), 
        new scheduler.Block(new Date(nextHour.getTime()
        + 2*3600000), new Date(nextHour.getTime()
        + 4*3600000), changed)]
    scheduler.assignBlocks([changed], [], t4.record, {
        short: 3600000, long: 2*3600000, dayStart: 1, dayEnd: 23
    })
    let out = t4.record.blocks
    let sortFun = (a,b) => a.start - b.start
    out.sort(sortFun)
    t4.change.sort(sortFun)
    expect(t4.record.blocks.length).toBe(t4.change.length)
    out.forEach((block, index) => expect([block.start, block.end, block.length, block.task.id])
    .toEqual([t4.change[index].start, t4.change[index].end, t4.change[index].length, 
        t4.change[0].task.id]))
})


test('should delete last block', () => {
    let changed = new scheduler.Task(notion)
    let nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1, 0, 0 , 0)
    t4.change = [new scheduler.Block(nextHour, new Date(nextHour.getTime()
        + 2*3600000), changed), 
        new scheduler.Block(new Date(nextHour.getTime()
        + 2*3600000), new Date(nextHour.getTime()
        + 4*3600000), 'Free')]
    scheduler.assignBlocks([changed], [], t4.record, {
        short: 3600000, long: 2*3600000, dayStart: 1, dayEnd: 23
    })
    let out = t4.record.blocks
    let sortFun = (a,b) => a.start - b.start
    out.sort(sortFun)
    t4.change.sort(sortFun)
    expect(t4.record.blocks.length).toBe(t4.change.length)
    out.forEach((block, index) => expect([block.start, block.end, block.length, block.task.id])
    .toEqual([t4.change[index].start, t4.change[index].end, t4.change[index].length, 
        t4.change[index].task.id]))
})

test('should split block in half and delete second half', () => {
    let changed = new scheduler.Task(notion)
    changed.time /= 2
    let nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1, 0, 0 , 0)
    t4.change = [new scheduler.Block(nextHour, new Date(nextHour.getTime()
        + 3600000), changed), 
        new scheduler.Block(new Date(nextHour.getTime()
        + 3600000), new Date(nextHour.getTime()
        + 2*3600000), 'Free'),
        new scheduler.Block(new Date(nextHour.getTime()
        + 2*3600000), new Date(nextHour.getTime()
        + 4*3600000), 'Free')]
    scheduler.assignBlocks([changed], [], t4.record, {
        short: 3600000, long: 2*3600000, dayStart: 1, dayEnd: 23
    })
    let out = t4.record.blocks
    let sortFun = (a,b) => a.start - b.start
    out.sort(sortFun)
    out.sort((a,b)=>a.start-b.start)
    t4.change.sort(sortFun)
    expect(t4.record.blocks.length).toBe(t4.change.length)
    out.forEach((block, index) => expect([block.start, block.end, block.length, block.task.id])
    .toEqual([t4.change[index].start, t4.change[index].end, t4.change[index].length, 
        t4.change[index].task.id]))
})