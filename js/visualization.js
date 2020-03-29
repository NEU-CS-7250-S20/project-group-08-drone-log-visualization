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

        let groups = createGroups(t02, t15);

        let map = mapplot().selectionDispatcher(selectionDispatcher).mapStrokeWeight(3)("#map", "div#map-slider", t02, pathSegments);

        let lBig = linechartPlot().selectionDispatcher(selectionDispatcher)("#line-chart-big", groups[0]);
        let l1 = linechartPlot().selectionDispatcher(selectionDispatcher)("#line-chart-1", groups[1]);
        let l2 = linechartPlot().selectionDispatcher(selectionDispatcher)("#line-chart-2", groups[2]);
        let l3 = linechartPlot().selectionDispatcher(selectionDispatcher)("#line-chart-3", groups[3]);
        let l4 = linechartPlot().selectionDispatcher(selectionDispatcher)("#line-chart-4", groups[4]);
        let l5 = linechartPlot().selectionDispatcher(selectionDispatcher)("#line-chart-5", groups[5]);
        let l6 = linechartPlot().selectionDispatcher(selectionDispatcher)("#line-chart-6", groups[6]);
        let l7 = linechartPlot().selectionDispatcher(selectionDispatcher)("#line-chart-7", groups[7]);

        selectionDispatcher.on(SELECTION_STRING + ".map", map.updateSelection);
        selectionDispatcher.on(SELECTION_STRING + ".l1", l1.updateSelection);
        selectionDispatcher.on(SELECTION_STRING + ".l2", l2.updateSelection);
        selectionDispatcher.on(SELECTION_STRING + ".l3", l3.updateSelection);
        selectionDispatcher.on(SELECTION_STRING + ".l4", l4.updateSelection);
        selectionDispatcher.on(SELECTION_STRING + ".l5", l5.updateSelection);
        selectionDispatcher.on(SELECTION_STRING + ".l6", l6.updateSelection);
        selectionDispatcher.on(SELECTION_STRING + ".l7", l7.updateSelection);
        selectionDispatcher.on(SELECTION_STRING + ".lBig", lBig.updateSelection);


    });

})());