const moment = require('moment-timezone');
const TZ = "Europe/Madrid";

/**
 * Get timestamp of today at 00:00:00
 * @returns timestamp
 */
function getDayTimestamp() {
    const now = moment().tz(TZ);
    const startOfDay = now.clone().startOf('day');
    const timestamp = startOfDay.valueOf();

    return timestamp;
}

module.exports = getDayTimestamp;
