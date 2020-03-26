((() => {

    const delimiter = ";";

    // load telemetry data
    Promise.all([
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T02.csv", parseT02),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T15.csv", parseT15),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T16.csv", parseT16),
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

        mapplot().width(0.5).height(0.5).maxPoints(10000).mapStrokeWeight(3)("#map", "div#map-slider", t02);
        linechartPlot().width(450).height(400).dataColor(["red"]).dataName(["groundSpeed"]).dataLegend(["gndS [km/h]"])("#line-chart-big", t02);
        linechartPlot().width(450).height(400).dataColor(["blue", "red"]).dataName(["airSpeed", "altitude"]).dataLegend(["AirS [km/h]", "Alt [m]"])("#line-chart-1", t02);
        linechartPlot().width(450).height(400).dataColor(["red"]).dataName(["airSpeed"]).dataLegend(["AirS [km/h]"])("#line-chart-2", t02);
        linechartPlot().width(450).height(400).dataColor(["red", "blue", "green"]).dataName(["phi", "theta", "psi"]).dataLegend(["phi [deg]", "theta [deg]", "psi [deg]"])("#line-chart-3", t02);
        linechartPlot().width(450).height(400).dataColor(["red", "blue", "green"]).dataName(["accX", "accY", "accZ"]).dataLegend(["aX [mps]", "aY [mps]", "aZ [mps]"])("#line-chart-4", t02);
        linechartPlot().width(450).height(400).dataColor(["red", "blue", "green"]).dataName(["P", "Q", "R"]).dataLegend(["p [rps]", "q [rps]", "r [rps]"])("#line-chart-5", t02);
        linechartPlot().width(450).height(400).dataColor(["red"]).dataName(["groundSpeed"]).dataLegend(["gndS [km/h]"])("#line-chart-6", t02);
        linechartPlot().width(450).height(400).dataColor(["red"]).dataName(["groundSpeed"]).dataLegend(["gndS [km/h]"])("#line-chart-7", t02);
    });

})());