((() => {

    const DELIMITED = ";";
    const SELECTION_STRING = "selection";
    const CHANGE_STRING = "change";
    const HIGHLIGHT_STRING = "highlight";

    // load telemetry data
    Promise.all([
        d3.dsv(DELIMITED, "data/sn11401003-2018-09-11-14-13-ses-00.T02.csv", parseT02),
        d3.dsv(DELIMITED, "data/sn11401003-2018-09-11-14-13-ses-00.T15.csv", parseT15),
        d3.dsv(DELIMITED, "data/sn11401003-2018-09-11-14-13-ses-00.T16.csv", parseT16),
        d3.text("data/sn11401003-2018-09-11-14-13-ses-00.mes")
    ]).then(function(files) {
        // extract telemetry data
        let t02 = files[0],
            t15 = files[1],
            log = files[3];

        // parse log
        log = parseLog(log);

        // get errors from log and t15
        let linkErrors = getLinkErrorsFromLog(log);
        let gpsErrors = getGPSErrorsFromT15(t15);
        let sensorErrors = getSensorErrorsFromT15(t15);

        linkErrors = errorTimesIntoT2Indices(linkErrors, t02);
        gpsErrors = errorTimesIntoT2Indices(gpsErrors, t02);
        sensorErrors = errorTimesIntoT2Indices(sensorErrors, t02);

        // create error and non-error path segments
        let pathSegments = errorsIntoPathSegments(linkErrors, gpsErrors, sensorErrors, t02);

        // create a dispatcher for each chart
        let mapDispatcher = d3.dispatch(SELECTION_STRING);
        let linechartDispatchers = [];
        for (let i = 0; i < 8; i++) {
            linechartDispatchers.push(d3.dispatch(SELECTION_STRING, CHANGE_STRING, HIGHLIGHT_STRING));
        }

        // create groups of data points to display at once
        // e.g. we want to show the acceleration in all three axes at once
        let groupsBig = createGroupsBig(t02, t15);
        let groupsSmall = createGroupsSmall(t02, t15);

        // create plots
        let map = mapplot().selectionDispatcher(mapDispatcher).mapStrokeWeight(3)("#map", "div#map-slider", t02, pathSegments);
        let logConsole = consoleDisplay()("#console", log);

        let linecharts = [
            linechartPlotBig().selectionDispatcher(linechartDispatchers[0])("#line-chart-big", [groupsBig[0], groupsBig[1], null], groupsBig, 0)
        ];
        for (let i = 1; i < 8; i++) {
            linecharts.push(
                linechartPlot().selectionDispatcher(linechartDispatchers[i])("#line-chart-" + i, groupsSmall[i], groupsSmall, i)
            )
        }

        // link time range selection events
        mapDispatcher.on(SELECTION_STRING + ".map", map.updateSelection);
        mapDispatcher.on(SELECTION_STRING + ".logConsole", logConsole.updateSelection);
        for (let i = 0; i < 8; i++) {
            mapDispatcher.on(SELECTION_STRING + ".l" + i, linecharts[i].updateSelection);
            linechartDispatchers[i].on(SELECTION_STRING + ".map", map.updateSelection);
            linechartDispatchers[i].on(SELECTION_STRING + ".logConsole", logConsole.updateSelection);

            for (let j = 0; j < 8; j++) {
                linechartDispatchers[i].on(SELECTION_STRING + ".l" + j, linecharts[j].updateSelection);
                linechartDispatchers[i].on(HIGHLIGHT_STRING + ".l" + j, linecharts[j].moveHighlight)
            }
        }

        // link change attribute events
        function setOnLinechartChange(i) {
            linechartDispatchers[i].on(CHANGE_STRING, function(group) {

                let name, tmpGroups, fc;

                if (i === 0) {
                    // big line chart
                    fc = linechartPlotBig();
                    name = "#line-chart-big";
                    tmpGroups = groupsBig;
                } else {
                    // small line chart
                    fc = linechartPlot();
                    name = "#line-chart-" + i;
                    tmpGroups = groupsSmall;
                }

                // https://stackoverflow.com/questions/14422198/how-do-i-remove-all-children-elements-from-a-node-and-then-apply-them-again-with
                d3.select(name).selectAll("*").remove();
                linecharts[i] = fc.selectionDispatcher(linechartDispatchers[i]).extent(linecharts[i].extent())(
                    name, group, tmpGroups, i
                );

                mapDispatcher.on(SELECTION_STRING + ".l" + i, linecharts[i].updateSelection);

                for (let j = 0; j < 8; j++) {
                    linechartDispatchers[j].on(SELECTION_STRING + ".l" + i, linecharts[i].updateSelection);
                    linechartDispatchers[j].on(HIGHLIGHT_STRING + ".l" + i, linecharts[i].moveHighlight)
                }

            });
        }

        for (let i = 0; i < 8; i++) {
            setOnLinechartChange(i);
        }
        console.log("done");
    });

})());