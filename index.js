/**
 * Copyright 2018, Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const google = require('googleapis');
const gmail = google.gmail('v1');
const querystring = require(`querystring`);
const pify = require('pify');
const config = require('./config');
const oauth = require('./lib/oauth');
const helpers = require('./lib/helpers');
const einvoice = require('./lib/einvoice');

/**
 * Request an OAuth 2.0 authorization code
 * Only new users (or those who want to refresh
 * their auth data) need visit this page
 */
exports.oauth2init = (req, res) => {
    // Define OAuth2 scopes
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
    ];

    // Generate + redirect to OAuth2 consent form URL
    const authUrl = oauth.client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Required in order to receive a refresh token every time
    });
    return res.redirect(authUrl);
};

/**
 * Get an access token from the authorization code and store token in Datastore
 */
exports.oauth2callback = async (req, res) => {
    // Get authorization code from request
    const code = req.query.code;

    // OAuth2: Exchange authorization code for access token
    try {
        oauth.client.credentials = await new Promise((resolve, reject) => {
            oauth.client.getToken(code, (err, token) =>
                (err ? reject(err) : resolve(token))
            );
        });
        const emailAddress = await oauth.getEmailAddress();
        await oauth.saveToken(emailAddress);

        // Respond to request
        res.redirect(`/initWatch?emailAddress=${querystring.escape(emailAddress)}`);
    } catch (err) {
        // Handle error
        console.error(err);
        res.status(500).send('Something went wrong; check the logs.');
    }
};

/**
 * Initialize a watch on the user's inbox
 */
exports.initWatch = async (req, res) => {
    // Require a valid email address
    if (!req.query.emailAddress) {
        return res.status(400).send('No emailAddress specified.');
    }
    const email = querystring.unescape(req.query.emailAddress);
    if (!email.includes('@')) {
        return res.status(400).send('Invalid emailAddress.');
    }

    try {
        await oauth.fetchToken(email);
        await pify(gmail.users.watch)({
            auth: oauth.client,
            userId: 'me',
            resource: {
                labelIds: ['INBOX'],
                topicName: config.TOPIC_NAME
            }
        });

        const id = await helpers.getOrCreateEinvoiceFolder(config.GCF_DRIVE_FOLDER);
        console.log(`${email} einvoice folder ${config.GCF_DRIVE_FOLDER}(${id})`);
        einvoice.saveFolder(email, {
            folderName: config.GCF_DRIVE_FOLDER,
            id,
        });

        // Respond with status
        res.write(`Watch & Create Drive folder initialized!`);
        res.status(200).end();
    } catch (err) {
        // Handle errors
        if (err.message === config.UNKNOWN_USER_MESSAGE) {
            res.redirect('/oauth2init');
        } else {
            console.error(err);
            res.status(500).send('Something went wrong; check the logs.');
        }
    }
};

/**
 * Process new messages as they are received
 */
exports.onNewMessage = async (event) => {
    try {
        // Parse the Pub/Sub message
        const dataStr = Buffer.from(event.data, 'base64').toString('ascii');
        const dataObj = JSON.parse(dataStr);

        await oauth.fetchToken(dataObj.emailAddress);
        const res = await helpers.listMessageIds();

        // filter target most recent message
        const msg = await helpers.isValidEinvoiceFormat(await helpers.getMessageById(res.messages[0].id));
        if (!msg)
            return;

        // get einvoice folder
        const einvoiceObj = await einvoice.fetchFolder(dataObj.emailAddress);

        // get attachment csv binaray
        const csvs = await helpers.getAllCSV(msg);

        // de-structure spreadsheet filename and row data
        const [filename, rows] = await helpers.getCSVRows(csvs);

        // get or insert spreadsheet
        const spreadsheetId = await helpers.getOrCreateSpreadsheet(einvoiceObj.id, filename);

        // save data to spreadsheet and auto format
        await helpers.saveToSpreadsheet(spreadsheetId, rows);

        console.log(`onNewMessage(${msg.id}) done.`)
    } catch (err) {
        // Handle unexpected errors
        if (!err.message || err.message !== config.NO_LABEL_MATCH) {
            console.error(err);
        }
    }
};