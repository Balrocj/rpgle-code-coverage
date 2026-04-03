'use strict';

const path = require('path');

function normalizeUri(uri) {
    if (uri.startsWith('member:')) {
        return uri.replace(/\.([a-zA-Z]+)$/, (match, ext) => '.' + ext.toLowerCase());
    }
    return uri;
}

function getCleanFileName(filePath) {
    let fileName;

    if (filePath.startsWith('member:')) {
        const parts = filePath.replace('member:', '').split('/').filter(p => p);
        if (parts.length >= 3) {
            fileName = parts[2];
        } else {
            fileName = filePath;
        }
    } else {
        fileName = filePath.includes('/') ? filePath.split('/').pop() : path.basename(filePath);
    }

    if (fileName.includes('?')) {
        fileName = fileName.split('?')[0];
    }

    return fileName;
}

module.exports = {
    normalizeUri,
    getCleanFileName
};
