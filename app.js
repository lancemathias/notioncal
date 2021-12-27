import { Client } from "@notionhq/client";
import * as fs from "fs";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

const constantsFile = "constants.json";
const credsFile = "credentials.json";
const constants = JSON.parse(fs.readFileSync(constantsFile));
const creds = JSON.parse(fs.readFileSync(credsFile));
const notion = new Client({ auth: constants.notion_secret });
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
let auth;

// Load client secrets from a local file.
fs.readFileSync('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    auth = authorize(JSON.parse(content));
});
auth = authorize(creds);

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFileSync("token.json", (err, token) => {
        if (err) return getAccessToken(oAuth2Client);
        oAuth2Client.setCredentials(JSON.parse(token));
    });
    return oAuth2Client;
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            return oAuth2Client;
        });
    });
}

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
            }
            //'color': task.status.select.color
        }
        try {
            calendar.events.insert({
                auth: auth,
                calendarId: 'primary',
                resource: event

            })
        }
        catch (error) {
            console.log(error);
        }
    }

    const calendar = google.calendar({ version: 'v3', auth });
    events.forEach(element => upload(element));
    console.log("success");
}

const events = await getNewest();
toCal(events, auth);