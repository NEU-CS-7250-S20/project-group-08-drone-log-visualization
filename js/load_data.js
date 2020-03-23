function objectsToGMapsCoordinates(objects) {
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

function parseT02(d) {
    // parse a single line of telemetry 2
    return {
        time: parseFloatWithCommaDecimal(d.time),
        altitude: parseFloatWithCommaDecimal(d.altitude),
        posLat: parseFloatWithCommaDecimal(d.posLat),
        posLon: parseFloatWithCommaDecimal(d.posLon),
        psi: parseFloatWithCommaDecimal(d.psi),
        theta: parseFloatWithCommaDecimal(d.theta),
        phi: parseFloatWithCommaDecimal(d.phi),
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
