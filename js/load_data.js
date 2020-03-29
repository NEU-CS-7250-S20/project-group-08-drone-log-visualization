const RADIO_LINK_BROKEN_MSG = "smon: Radio link broken";
const RADIO_LINK_RESTORED_MSG = "smon: Radio link restored";

const SEGMENT_NORMAL = 0;
const SEGMENT_SENSOR_ERROR = 1;
const SEGMENT_GPS_ERROR = 2;
const SEGMENT_LINK_ERROR = 3;


function objectsToGMapsCoordinates(objects) {
    // extract coordinates from data object and put them in a format for google maps js API
    let coords = [];

    for (i = 0; i < objects.length; i++) {
        coords.push({
            lat: objects[i].posLat,
            lng: objects[i].posLon
        })
    }

    return coords;
}

function parseFloatWithCommaDecimal(string) {
    // parse a float with a comma instead of a dot for the decimal
    let tmp = string.replace(",", ".");
    // TODO: deal with NANs somewhere, or assume the log is always valid
    return parseFloat(tmp);
}

function subsample(data, num) {
    // subsample data
    if (num >= data.length) {
        return data;
    }

    let stride = data.length / num;
    let newData = [];

    for (i = 0; i < num; i++) {
        newData.push(data[Math.floor(i * stride)]);
    }

    return newData;
}

function parseLog(log) {
    // parse log text file
    let newLog = [];
    let splitLines = log.split("\r\n");

    for (i = 0; i < splitLines.length; i++) {
        let line = splitLines[i];
        let split = line.split(":");

        if (split.length > 2) {
            let time = parseFloat(split[2]);
            let message = split.slice(3, split.length).join(":");
            message = message.trim();
            newLog.push({
                time: time,
                message: message
            })
        }
    }

    return newLog;

}

function getLinkErrorsFromLog(log) {
    // get link error segments from log messages
    let linkErrors = [];
    let errorStart = null;

    for (i = 0; i < log.length; i++) {

        let logItem = log[i];

        if (logItem.message === RADIO_LINK_BROKEN_MSG) {
            if (errorStart === null) {
                // error logged
                errorStart = logItem.time;
            }
        } else if (logItem.message === RADIO_LINK_RESTORED_MSG) {
            if (errorStart !== null) {
                // error resolved
                linkErrors.push({
                    start: errorStart,
                    end: logItem.time
                });
                errorStart = null;
            }
        }

    }

    if (errorStart !== null) {
        // error was never resolved, continue until the last time step
        linkErrors.push({
            start: errorStart,
            end: log[log.length - 1].time
        })
    }

    return linkErrors;

}

function getGPSErrorsFromT15(t15) {

    let GPSErrors = [];
    let GPSErrorStart = null;

    for (i = 0; i < t15.length; i++) {

        let line = t15[i];

        if (line.gpsErr >= 1) {
            if (GPSErrorStart === null) {
                GPSErrorStart = line.time;
            }
        } else if (line.gpsErr === 0) {
            if (GPSErrorStart !== null) {
                GPSErrors.push({
                    start: GPSErrorStart,
                    end: line.time
                });
                GPSErrorStart = null;
            }
        }

    }

    if (GPSErrorStart !== null) {
        // error was never resolved, continue until the last time step
        GPSErrors.push({
            start: GPSErrorStart,
            end: t15[t15.length - 1].time
        })
    }

    return GPSErrors;

}

function getSensorErrorsFromT15(t15) {

    let sensorErrors = [];
    let sensorErrorStart = null;

    for (i = 0; i < t15.length; i++) {

        let line = t15[i];

        if (line.sensorErr >= 1) {
            if (sensorErrorStart === null) {
                sensorErrorStart = line.time;
            }
        } else if (line.sensorErr === 0) {
            if (sensorErrorStart !== null) {
                sensorErrors.push({
                    start: sensorErrorStart,
                    end: line.time
                });
                sensorErrorStart = null;
            }
        }

    }

    if (sensorErrorStart !== null) {
        // error was never resolved, continue until the last time step
        sensorErrors.push({
            start: sensorErrorStart,
            end: t15[t15.length - 1].time
        })
    }

    return sensorErrors;

}

function errorTimesIntoT2Indices(errors, t2) {

    let newErrors = [];

    for (i = 0; i < errors.length; i++) {
        newErrors.push({
            start: null,
            end: null
        })
    }

    for (i = 0; i < t2.length; i++) {
        let currentTime = t2[i].time;
        for (j = 0; j < errors.length; j++) {
            if (currentTime >= errors[j].start && newErrors[j].start === null) {
                newErrors[j].start = i;
            } else if (currentTime >= errors[j].end && newErrors[j].end === null) {
                // this else if enforces that an error does not start and end at the same time step
                newErrors[j].end = i;
            }
        }
    }

    return newErrors;

}

function errorsIntoPathSegments(linkErrors, gpsErrors, sensorErrors, t02) {

    let segments = [];

    // add sensor errors (lowest priority)
    sensorErrors.forEach(error => {
        segments.push({
            start: error.start,
            end: error.end,
            type: SEGMENT_SENSOR_ERROR
        });
    });

    // add gps errors (medium priority) and maybe modify sensor errors so that there aren't any overlaps
    gpsErrors.forEach(error => {
        let toDelete = [];
        segments.forEach((segment, index) => {
            if ((segment.start >= error.start && segment.end <= error.end) ||
                (segment.start <= error.start && segment.end >= error.end)) {
                // another segment is inside the current segment
                // the current segment has higher priority, so the prior one will be deleted
                toDelete.push(index);
            } else if (segment.start <= error.end && segment.end > error.end) {
                // segment starts in the middle of the error and ends after it
                // move its start point
                segment.start = error.end;
            } else if (segment.start < error.start && segment.end > error.start) {
                // segment start before the error and ends in the middle of it
                // move its end point
                segment.end = error.start;
            }
        });

        if (toDelete.length > 0) {
            for (i = toDelete.length - 1; i >= 0; i--) {
                segments.splice(toDelete[i], 1);
            }
        }

        segments.push({
            start: error.start,
            end: error.end,
            type: SEGMENT_GPS_ERROR
        })
    });

    // add link errors (highest priority) and maybe modify all the previous errors
    linkErrors.forEach(error => {
        let toDelete = [];
        segments.forEach((segment, index) => {
            if ((segment.start >= error.start && segment.end <= error.end) ||
                (segment.start <= error.start && segment.end >= error.end)) {
                // another segment is inside the current segment
                // the current segment has higher priority, so the prior one will be deleted
                toDelete.push(index);
            } else if (segment.start <= error.end && segment.end > error.end) {
                // segment starts in the middle of the error and ends after it
                // move its start point
                segment.start = error.end;
            } else if (segment.start < error.start && segment.end > error.start) {
                // segment start before the error and ends in the middle of it
                // move its end point
                segment.end = error.start;
            }
        });

        if (toDelete.length > 0) {
            for (i = toDelete.length - 1; i >= 0; i--) {
                segments.splice(toDelete[i], 1);
            }
        }

        segments.push({
            start: error.start,
            end: error.end,
            type: SEGMENT_LINK_ERROR
        })
    });

    // sort errors by time ascending
    segments.sort((a, b) => {
        return a.start > b.start;
    });

    // add path segments, where no errors happened
    let toAdd = [];
    let toAddIndices = [];

    segments.forEach((segment, index) => {
        if (index === 0 && segment.start > 0) {
            toAdd.push({
                start: 0,
                end: segment.start,
                type: SEGMENT_NORMAL
            });
            toAddIndices.push(index);
        } else if ((index !== segments.length - 1) && (segment.end !== segments[index + 1].start)) {
            toAdd.push({
                start: segment.end,
                end: segments[index + 1].start,
                type: SEGMENT_NORMAL
            });
            toAddIndices.push(index + 1);
        }
    });

    if (toAdd.length > 0) {
        for (let i = toAdd.length - 1; i >= 0; i--) {
            segments.splice(toAddIndices[i], 0, toAdd[i]);
        }
    }

    return segments;

}

function parseT02(d) {
    // parse a single line of telemetry 2
    return {
        time: parseFloatWithCommaDecimal(d.time),
        altitude: parseFloatWithCommaDecimal(d.altitude),
        posLat: parseFloatWithCommaDecimal(d.posLat),
        posLon: parseFloatWithCommaDecimal(d.posLon),
        // Change units to degree
        psi: 57.3 * parseFloatWithCommaDecimal(d.psi),
        theta: 57.3 * parseFloatWithCommaDecimal(d.theta),
        phi: 57.3 * parseFloatWithCommaDecimal(d.phi),
        R: parseFloatWithCommaDecimal(d.R),
        Q: parseFloatWithCommaDecimal(d.Q),
        P: parseFloatWithCommaDecimal(d.P),
        accZ: parseFloatWithCommaDecimal(d.accZ),
        accY: parseFloatWithCommaDecimal(d.accY),
        accX: parseFloatWithCommaDecimal(d.accX),
        windHdg: parseFloatWithCommaDecimal(d.windHdg),
        windSpeed: parseFloatWithCommaDecimal(d.windSpeed),
        airSpeed: parseFloatWithCommaDecimal(d.airSpeed),
        groundSpeed: parseFloatWithCommaDecimal(d.groundSpeed),
        track: parseFloatWithCommaDecimal(d.track),
        amslCorr: parseFloatWithCommaDecimal(d.amslCorr),
        TAS: parseFloatWithCommaDecimal(d.TAS),
        OAT: parseFloatWithCommaDecimal(d.OAT)
    };
}

function parseT15(d) {
    // parse a single line of telemetry 15
    return {
        time: parseFloatWithCommaDecimal(d.time),
        uUpper: parseInt(d.uUpper),
        iUpper: parseInt(d.iUpper),
        gpsErr: parseInt(d.gpsErr),
        sensorErr: parseInt(d.sensorErr),
        uLower: parseInt(d.uLower),
        iLower: parseInt(d.iLower),
        qLower: parseInt(d.qLower),
        lastLink: parseInt(d.lastLink),
        timeLeft: parseInt(d.timeLeft),
        userTimeLeft: parseInt(d.userTimeLeft),
        yy: parseInt(d.yy),
        MM: parseInt(d.MM),
        dd: parseInt(d.dd),
        hh: parseInt(d.hh),
        mm: parseInt(d.mm),
        ss: parseInt(d.ss),
        msec: parseInt(d.msec),
        flags: parseInt(d.flags)
    };
}

function parseT16(d) {
    // parse a single line of telemetry 16
    return {
        time: parseFloatWithCommaDecimal(d.time),
        flags: parseInt(d.flags),
        procId: parseInt(d.procId),
        fpStatus: parseInt(d.fpStatus),
        refAs: parseInt(d.refAs),
        refAlt: parseInt(d.refAlt),
        fpItemId: parseInt(d.fpItemId)
    }
}

function createGroups(t02, t15) {

    return [
        {
            keys: ["groundSpeed"],
            name: "Ground Speed",
            legends: ["gndS [km/h]"],
            source: t02
        },
        {
            keys: ["airSpeed"],
            name: "Air Speed",
            legends: ["airS [km/h]"],
            source: t02
        },
        {
            keys: ["windSpeed"],
            name: "Wind Speed",
            legends: ["windS [km/h]"],
            source: t02
        },
        {
            keys: ["altitude"],
            name: "Altitude",
            legends: ["alt [m]"],
            source: t02
        },
        {
            keys: ["phi", "theta", "psi"],
            name: "Angles",
            legends: ["phi [deg]", "theta [deg]", "psi [deg]"],
            source: t02
        },
        {
            keys: ["accX", "accY", "accZ"],
            name: "Accelerations",
            legends: ["aX [mps]", "aY [mps]", "aZ [mps]"],
            source: t02
        },
        {
            keys: ["P", "Q", "R"],
            name: "Angular Velocities",
            legends: ["p [rps]", "q [rps]", "r [rps]"],
            source: t02
        },
        {
            keys: ["uUpper", "iUpper"],
            name: "Battery Voltage and Current",
            legends: ["u [mV]", "i [mA]"],
            source: t15
        }
    ];

}