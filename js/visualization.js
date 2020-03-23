((() => {

    const delimiter = ";";

    // load telemetry data
    Promise.all([
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T02.csv", parseT02),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T15.csv", parseT15),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T16.csv", parseT16),
    ]).then(function(files) {

        let t02 = files[0],
            t15 = files[1],
            t16 = files[2];

        mapplot().width(0.5).height(0.5).maxPoints(1000)("#map", "div#map-slider", t02);
        linechartPlot().width(450).height(400).color("red").dataName("altitude")("#line-chart-1", t02);

    });

})());