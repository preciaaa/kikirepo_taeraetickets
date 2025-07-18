const crypto = require('crypto');

function generateFingerprint(fields) {
    const sortedEntries = Object.entries(fields)
        .map(([k, v]) => `${(k || '').trim().toLowerCase()}=${(v == null ? '' : v.toString().trim().toLowerCase())}`)
        .sort();

    const joined = sortedEntries.join('|'); 

    return crypto.createHash('sha256').update(joined).digest('hex');
}

module.exports = { generateFingerprint };