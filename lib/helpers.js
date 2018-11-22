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
const sheets = google.sheets('v4');
const drive = google.drive('v3');
const oauth = require('./oauth');
const pify = require('pify');
const iconv = require('iconv-lite');


/**
 * Get base64-encoded csv attachments in a GMail message
 * @param message The GMail message to extract images from
 * @returns A promise containing a list of base64-encoded images
 */
const _getCSVAttachments = async (message) => {
    // Get attachment data
    const attachmentIds = message.payload.parts
        .filter(x => x.mimeType && (x.mimeType.includes('application/octet-stream') || x.mimeType.includes('text/csv')))
        .map(x => x.body.attachmentId);

    return await Promise.all(attachmentIds.map(async attachmentId => {
        const res = await pify(gmail.users.messages.attachments.get)({
            auth: oauth.client,
            userId: 'me',
            id: attachmentId,
            messageId: message.id
        });

        // Convert from base64url to base64
        const csvData = res.data.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(csvData, 'base64');
    }))
};

/**
 * Get GMail base64-encoded attachments
 * @param message The GMail message to extract images from
 * @returns A promise containing a list of base64-encoded attachments
 */
exports.getAllCSV = (message) => _getCSVAttachments(message);

/**
 * List GMail message IDs
 * @returns A promise containing a list of GMail message IDs
 */
exports.listMessageIds = () => pify(gmail.users.messages.list)(
    {auth: oauth.client, userId: 'me'}
);

/**
 * Get a GMail message given a message ID
 * @param messageId The ID of the message to get
 * @returns A promise containing the specified GMail message
 */
exports.getMessageById = (messageId) => pify(gmail.users.messages.get)({
    auth: oauth.client,
    id: messageId,
    userId: 'me'
});

/**
 * Filter target einvoice message
 * @param message The GMail message to extract images from
 * @returns A promise containing the specified GMail message
 */
exports.isValidEinvoiceFormat = async (message) => {
    const subject = message.payload.headers.filter(h => h.name === 'Subject');

    if (subject.length && subject[0].value.indexOf('財政部電子發票整合服​務平台-消費發票彙整通知，手機條碼') > -1) {
        return message
    } else {
        return null
    }
};

/**
 * Get CSV attachment csv rows
 * @param CSV The base64-encode csv
 * @returns A promise containing the specified fileName and CSV rows
 */
exports.getCSVRows = async ([csv]) => {
    // decode csv to big5 encoding
    const text = iconv.decode(csv, 'Big5');
    const rows = text.split('\n').map(row => row.split('|'));
    const filename = rows[0][3].substr(0, 6);
    return [filename, rows];
};

/**
 * Get or create einvoice folder
 * @param folderName The einvoice folername
 * @returns A promise containing the specified drive foler id
 */
exports.getOrCreateEinvoiceFolder = async (folderName) => {

    const res = await pify(drive.files.list)({
        auth: oauth.client,
        q: `name='${folderName}'`,
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
    });

    if (res.files.length) {
        return res.files[0].id;
    } else {
        const file = await pify(drive.files.create)({
            auth: oauth.client,
            resource: {
                'name': folderName,
                'mimeType': 'application/vnd.google-apps.folder'
            },
            fields: 'id'
        });
        return file.id;
    }
};

/**
 * Get or create spreadsheet file in drive folder
 * @param parentId The einvoice drive folder id
 * @param spreadsheetName The einvoice spreadsheet name
 * @returns A promise containing the specified spreadsheet id
 */
exports.getOrCreateSpreadsheet = async (parentId, spreadsheetName) => {
    const res = await pify(drive.files.list)({
        auth: oauth.client,
        q: `name='${spreadsheetName}' and parents in '${parentId}'`,
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
    });

    if (res.files.length) {
        return res.files[0].id;
    } else {
        const file = await pify(drive.files.create)({
            auth: oauth.client,
            fields: 'id',
            resource: {
                'name': `${spreadsheetName}`,
                'mimeType': 'application/vnd.google-apps.spreadsheet',
                'parents': [parentId],
            }
        });
        return file.id;
    }
};

/**
 * Save data to specific spreadsheet
 * @param spreadsheetId The einvoice spreadsheet id
 * @param values The einvoice spreadsheet values range
 */
exports.saveToSpreadsheet = async (spreadsheetId, values) => {

    const resource = {
        values,
    };

    const res = await pify(sheets.spreadsheets.values.update)({
        auth: oauth.client,
        spreadsheetId,
        valueInputOption: 'USER_ENTERED',
        range: `A1:J${values.length}`,
        resource,
    });

    const res2 = await pify(sheets.spreadsheets.batchUpdate)({
        auth: oauth.client,
        spreadsheetId,
        resource: {
            "requests": [
                {
                    "autoResizeDimensions": {
                        "dimensions": {
                            "sheetId": 0,
                            "dimension": "COLUMNS",
                            "startIndex": 0,
                            "endIndex": 10
                        }
                    }
                }
            ]
        },
    });

    console.log('saveToSpreadsheet done.');
};