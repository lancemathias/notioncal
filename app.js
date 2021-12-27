import { Client } from "@notionhq/client";
import * as fs from "fs";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

const constantsFile = "constants.json";
const credsFile = "credentials.json";
const constants = JSON.parse(fs.readFileSync(constantsFile));
const creds = JSON.parse(fs.readFileSync(credsFile));
const token = JSON.parse(fs.readFileSync("token.json"));
const notion = new Client({ auth: constants.notion_secret });

const { client_secret, client_id, redirect_uris } = creds.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
oAuth2Client.setCredentials(token);

async function getNewest() {
    try {
        const response = await notion.databases.query({
            database_id: constants.database_id,
            filter: {
                and: [
                    {
                        property: "Last Edited",
                        date: {
                            after: constants.last_edited
                        }
                    },
                    {
                        property: "Status",
                        select: {
                            does_not_equal: "Done"
                        }
                    }
                ]
            },
            sorts: [
                {
                    property: "Due Date",
                    direction: "descending"
                }
            ]
        });
        constants.last_edited = new Date();

        return response.results;
    }
    catch (error) {
        console.error(error.body);
    }
}

function toCal(events, auth) {
    function upload(element) {
        let task = element.properties;
        const addHours = function (h) {
            var today = new Date();
            today.setHours(today.getHours() + h);
            return today;
        }
        let event = {
            'summary': task.Name.title[0].text.content,
            'start': {
                'dateTime': new Date()
            },
            'end': {
                'dateTime': addHours(1)
            },
            'color': task.status.select.color
        }
        try {
            calendar.events.insert({
                auth: auth,
                calendarId: constants.gc_id,
                resource: event

            })
        }
        catch (error) {
            console.log(error);
        }
    }

    const calendar = google.calendar({ version: 'v3', auth });
    events.forEach(element => upload(element));
}

const events = await getNewest();
toCal(events, oAuth2Client);