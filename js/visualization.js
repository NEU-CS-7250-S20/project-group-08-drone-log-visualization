((() => {

    const DELIMITED = ";";
    const SELECTION_STRING = "selection";
    const CHANGE_STRING = "change";

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
            linechartDispatchers.push(d3.dispatch(SELECTION_STRING, CHANGE_STRING));
        }

        // create groups of datapoint to display at once
        // e.g. we wnat to show the acceleration in all three axes at once
        let groups = createGroups(t02, t15);

        // create plots
        let map = mapplot().selectionDispatcher(mapDispatcher).mapStrokeWeight(3)("#map", "div#map-slider", t02, pathSegments);
        let log_console = consoleDisplay()("#console", log);

        let linecharts = [
            linechartPlot().selectionDispatcher(linechartDispatchers[0])("#line-chart-big", groups[0], groups)
        ];
        for (let i = 1; i < 8; i++) {
            linecharts.push(
                linechartPlot().selectionDispatcher(linechartDispatchers[i])("#line-chart-" + i, groups[i], groups)
            )
        }

        // link time range selection events
        mapDispatcher.on(SELECTION_STRING + ".map", map.updateSelection);
        mapDispatcher.on(SELECTION_STRING + ".log_console", log_console.updateSelection);
        for (let i = 0; i < 8; i++) {
            mapDispatcher.on(SELECTION_STRING + ".l" + i, linecharts[i].updateSelection);
            linechartDispatchers[i].on(SELECTION_STRING + ".map", map.updateSelection);
            linechartDispatchers[i].on(SELECTION_STRING + ".log_console", log_console.updateSelection);

            for (let j = 0; j < 8; j++) {
                linechartDispatchers[i].on(SELECTION_STRING + ".l" + j, linecharts[j].updateSelection);
            }
        }

        // link change attribute events
        function setOnChange(i) {
            linechartDispatchers[i].on(CHANGE_STRING, function(group) {

                let name;

                if (i === 0) {
                    name = "#line-chart-big";
                } else {
                    name = "#line-chart-" + i;
                }

                // https://stackoverflow.com/questions/14422198/how-do-i-remove-all-children-elements-from-a-node-and-then-apply-them-again-with
                d3.select(name).selectAll("*").remove();
                linecharts[i] = linechartPlot().selectionDispatcher(linechartDispatchers[i])(name, group, groups);

                mapDispatcher.on(SELECTION_STRING + ".l" + i, linecharts[i].updateSelection);

                for (let j = 0; j < 8; j++) {
                    linechartDispatchers[j].on(SELECTION_STRING + ".l" + i, linecharts[i].updateSelection);
                }

            });
        }

        for (let i = 0; i < 8; i++) {
            setOnChange(i);
        }

    });

})());