# Turn einovice email CSV attachment to Spreadsheet

> fork from [GoogleCloudPlatform/cloud-functions-gmail-nodejs: A demo app that processes Gmail messages with Cloud Functions](https://github.com/GoogleCloudPlatform/cloud-functions-gmail-nodejs)

This repository show how to setup custom mail processing logic for Gmail using the [Gmail API][gmail], [Drive][drive], [Spreadsheet][spreadsheet] and [Cloud Functions][gcf]. See the [blog post][blog] for more information.

Presentation [Cloud Native Forum - 當電子發票遇見 Google Cloud Function - Google Slides][presentation]

## Obtaining an OAuth 2.0 Client ID
In order for an OAuth 2.0 API to verify our program's identity, we must include
an _OAuth 2.0 client ID_ with some of our requests to the API. The following
steps show how to enable the Gmail API and download the client ID to your local
machine.

1.  Enable the Gmail API using the [the Gmail API page in the GCP Console][console_gmail].
2.  Enable the Drive API using the [the Drive API page in the GCP Console][console_drive].
3.  Enable the Spreadsheet API using the [the Spreadsheet API page in the GCP Console][console_spreadsheet].
4.  Find the [GCP region][docs_regions] you want to deploy your function to.
    (In general, response time is quickest for the regions closest to you.) For
    the rest of this tutorial, replace `[YOUR_GCF_REGION]` with your selected
    region's name (for example, `us-central1`).
5.  Generate a new OAuth 2.0 client ID by [visiting the GCP Console credentials page][console_credentials].
    Configure the fields as indicated below:

    - Application type: `Web application`
    - Name: an appropriate, memorable name for your client
    - Authorized JavaScript origins: `https://[YOUR_GCF_REGION]-[YOUR_GCP_PROJECT_ID].cloudfunctions.net/oauth2callback`

6.  Click _Create_, then close the resulting dialog box and click the
    **Download** icon next to your newly created client ID. The resulting file
    is your __Client Secret file__.

## Configuring local files
1.    Rename your __Client Secret file__ to `client_secret.json`, and move it to
    the directory that contains your `index.js` and `package.json` files.
1.    In `config.json`, update the values for `GCF_REGION`, `GCLOUD_PROJECT`,
    and `TOPIC_ID`.


[blog]: https://kaichu.io/2018/11/222/cloud-functions-gmail-spreadsheet-nodejs-einvoice/
[docs_regions]: http://cloud.google.com/functions/docs/locations
[console_gmail]: http://console.cloud.google.com/apis/api/gmail.googleapis.com/overview
[console_drive]: http://console.cloud.google.com/apis/api/drive.googleapis.com/overview
[console_spreadsheet]: http://console.cloud.google.com/apis/api/sheets.googleapis.com/overview
[console_credentials]: https://console.cloud.google.com/apis/credentials
[gmail]: https://developers.google.com/gmail/api
[drive]: https://developers.google.com/drive/api/v3/reference/
[spreadsheet]: https://developers.google.com/sheets/api/reference/rest/
[gcf]: https://cloud.google.com/functions
[presentation]:https://docs.google.com/presentation/d/174KhCOpXIgfzyMzUmcPxz3UZEz3m0W5s3AMNWu9ZO4k
