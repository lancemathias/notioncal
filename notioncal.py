'''
* notioncal.py
* By Lance Mathias
* Sync Notion database with Google Calendar
'''

import requests, json, constants

#STAGE 1: CHECK IF EDITED SINCE LAST CHECK AND QUERY DB

#load properties from JSON file
with open('constants.json', 'rt') as config:
    props = json.load(config)
notion_db_url = f'https://api.notion.com/v1/databases/{props["database_id"]}'
notion_query_url = notion_db_url + '/query'

headers = {
    'Authorization' : f'Bearer {props["notion_secret"]}', 
    'Notion-Version': props["notion_ver"]
}

response = requests.get(notion_db_url, headers=headers)

if response.ok:
    resp = response.json()
    #check if new events since last query
    if 'last_edited' not in props:
        last_checked = resp["created_time"]
    elif resp["last_edited_time"] > props["kast_edited"]:
        last_checked = props["last_edited"]
    else:
        last_checked = None
        print('Internal database is up to date!')
else:
    print(response.status_code, response.content)

#STAGE 2: GET NEW EVENTS

#convenient representation of each task
class Task():
    def from_notion(self, page):
        self.name = page["properties"]["Name"]["title"]["text"]["content"]
        self.start = page["properties"]["When to do"]["date"]["start"]
        self.end = page["properties"]["When to do"]["date"]["start"]["end"]
        self.due = page["properties"]["Due Date"]["date"]["start"]
        self.commitment = page["properties"]["Time commitment"]["rich text"]["text"]["content"]
        self.status = page["properties"]["Status"]["select"]["name"]
        self.id = page["id"]

    def to_gcal(self, cal):
        pass

if last_checked is not None:
    payload = {
        "filter": {
            "property": "Last Edited",
            "date": {
                "after": last_checked
            }
        }
    }

    response = requests.post(notion_query_url, headers=headers, json=payload)

    if response.ok:
        resp = response.json()
        for page in resp["results"]:
            print(json.dumps(page, indent=2))

        #update last checked if we checked
        props.update({"last_checked": resp["last_edited_time"]})
        with open('constants.json', 'wt') as config:
            json.dump(props, config, indent=4)
    else:
        print(response.status_code, response.content)


#STAGE 3: PUSH TO GCAL AND PARSE DURATION
gc_url = f'https://www.googleapis.com/calendar/v3/calendars/{props["gc_id"]}/events?access_token={props["gc_token"]}'

