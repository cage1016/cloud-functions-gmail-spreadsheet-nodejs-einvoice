const config = require('../config');
const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore();

exports.fetchFolder = (emailAddress) => {
    return datastore.get(datastore.key(['einvoice', emailAddress]))
        .then((einvoices) => {
            const einvoice = einvoices[0];

            // Check for new users
            if (!einvoice) {
                throw new Error(config.UNKNOWN_USER_EINVOICE_FOLDER);
            }

            return Promise.resolve(einvoice);
        });
};


exports.saveFolder = (emailAddress, data) => {
    return datastore.save({
        key: datastore.key(['einvoice', emailAddress]),
        data: data
    });
};