((() => {

    const delimiter = ";";

    // load telemetry data
    // https://stackoverflow.com/questions/21842384/importing-data-from-multiple-csv-files-in-d3
    Promise.all([
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T02.csv", parseT02),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T15.csv", parseT15),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T16.csv", parseT16),
    ]).then(function(files) {
        console.log(files);
    });

})());