# notioncal

A planning app which automatically schedules your tasks in [Google Calendar](https://calendar.google.com) using [time blocking](https://todoist.com/productivity-methods/time-blocking). 
Studies [suggest](https://scholar.harvard.edu/files/todd_rogers/files/beyond_good_intentions_-_prompting_people.pdf) that planning specific blocks of time to finish tasks improves productivity. 
Notioncal does this automatically by taking events from your Notion board and scheduling blocks during your work hours to finish them, working around your existing Google calendar events. The script will automatically optimize the order of your tasks, avoiding long blocks of the same task and alerting you when you won't be able to finish a task before the due date.

## Getting started

Requirements: npm, nodejs version 16+.
Notion board must have the following format:
- A number property named "Time" which corresponds to the estimated time commitment of the task, in hours
- A date property named "Due" which is the due date of the task
- The "Last edited time" property renamed to "Last Edited" (case-sensitive)

Notion board should have allt he properties shown in the example here - extra properties are OK too:

![notion_example](https://i.imgur.com/2WJCUPW.png)


1. Clone this repo. In the project directory, install dependencies with `npm install`
2. Follow the directions [here](https://developers.notion.com/docs/getting-started) to set up the Notion api. Save your key and database ID as environment variables named `NOTION_KEY` and `NOTION_ID`, respectively.
3. Follow the instructions [here](https://developers.google.com/workspace/guides/create-project) to create a new Google Cloud project.
4. Follow the instructions [here](https://developers.google.com/workspace/guides/create-credentials) to create and download Google Oauth credentials and download to project directory as `credentials.json`. 
5. Run `get_token.cjs` and follow the prompts.
6. Save your Google credentials and token to the environment as `GC_CREDENIALS` and `GC_TOKEN`, respectively.
7. Done! run `node index.js` to manually schedule current Notion tasks, or host it on a node server and set a trigger somehow.

## Usage

After setup, just run `node index.js` and the script will handle the rest automatically!

## Nerd Stats

Built using NodeJS
APIs: Notion JS SDK, Google Calendar JavaScript API, Google OAuth Client
Libraries: dotenv, fs, JSON, Jest unit testing
Algorithms: Custom-designed [greedy algorithm](https://people.eecs.berkeley.edu/~vazirani/algorithms/chap5.pdf) to optimize scheduling
