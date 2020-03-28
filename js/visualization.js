((() => {

    const DELIMITED = ";";
    const SELECTION_STRING = "selection";

    // load telemetry data
    Promise.all([
        d3.dsv(DELIMITED, "data/sn11401003-2018-09-11-14-13-ses-00.T02.csv", parseT02),
        d3.dsv(DELIMITED, "data/sn11401003-2018-09-11-14-13-ses-00.T15.csv", parseT15),
        d3.dsv(DELIMITED, "data/sn11401003-2018-09-11-14-13-ses-00.T16.csv", parseT16),
        d3.text("data/sn11401003-2018-09-11-14-13-ses-00.mes")
    ]).then(function(files) {

        let t02 = files[0],
            t15 = files[1],
            t16 = files[2],
            log = files[3];

        log = parseLog(log);
        let linkErrors = getLinkErrorsFromLog(log);
        let gpsErrors = getGPSErrorsFromT15(t15);
        let sensorErrors = getSensorErrorsFromT15(t15);

        linkErrors = errorTimesIntoT2Indices(linkErrors, t02);
        gpsErrors = errorTimesIntoT2Indices(gpsErrors, t02);
        sensorErrors = errorTimesIntoT2Indices(sensorErrors, t02);

        let pathSegments = errorsIntoPathSegments(linkErrors, gpsErrors, sensorErrors, t02);

        let selectionDispatcher = d3.dispatch(SELECTION_STRING);

        let map = mapplot().selectionDispatcher(selectionDispatcher).mapStrokeWeight(3)("#map", "div#map-slider", t02, pathSegments);
        let l1 = linechartPlot().dataColor(["red"]).dataName(["groundSpeed"]).dataLegend(["gndS [km/h]"])("#line-chart-1", t02);
        let lBig = linechartPlot().dataColor(["blue", "red"]).dataName(["airSpeed", "altitude"]).dataLegend(["AirS [km/h]", "Alt [m]"])("#line-chart-big", t02);
        let l2 = linechartPlot().dataColor(["red"]).dataName(["airSpeed"]).dataLegend(["AirS [km/h]"])("#line-chart-2", t02);
        let l3 = linechartPlot().dataColor(["red", "blue", "green"]).dataName(["phi", "theta", "psi"]).dataLegend(["phi [deg]", "theta [deg]", "psi [deg]"])("#line-chart-3", t02);
        let l4 = linechartPlot().dataColor(["red", "blue", "green"]).dataName(["accX", "accY", "accZ"]).dataLegend(["aX [mps]", "aY [mps]", "aZ [mps]"])("#line-chart-4", t02);
        let l5 = linechartPlot().dataColor(["red", "blue", "green"]).dataName(["P", "Q", "R"]).dataLegend(["p [rps]", "q [rps]", "r [rps]"])("#line-chart-5", t02);
        let l6 = linechartPlot().dataColor(["red"]).dataName(["groundSpeed"]).dataLegend(["gndS [km/h]"])("#line-chart-6", t02);
        let l7 = linechartPlot().dataColor(["red"]).dataName(["windSpeed"]).dataLegend(["windS [km/h]"])("#line-chart-7", t02);

        map.selectionDispatcher().on(SELECTION_STRING + ".l1", l1.updateSelection);
        map.selectionDispatcher().on(SELECTION_STRING + ".l2", l2.updateSelection);
        map.selectionDispatcher().on(SELECTION_STRING + ".l3", l3.updateSelection);
        map.selectionDispatcher().on(SELECTION_STRING + ".l4", l4.updateSelection);
        map.selectionDispatcher().on(SELECTION_STRING + ".l5", l5.updateSelection);
        map.selectionDispatcher().on(SELECTION_STRING + ".l6", l6.updateSelection);
        map.selectionDispatcher().on(SELECTION_STRING + ".l7", l7.updateSelection);
        map.selectionDispatcher().on(SELECTION_STRING + ".lBig", lBig.updateSelection);

    });

})());