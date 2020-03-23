((() => {

    // set the dimensions and margins of the graph
    var margin = {top: 10, right: 30, bottom: 30, left: 60},
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#line-chart-1")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const delimiter = ";";

    // load telemetry data
    Promise.all([
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T02.csv", parseT02),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T15.csv", parseT15),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T16.csv", parseT16),
    ]).then(function(files) {

        let t02 = files[0];
        let altitude = [];
        let timeStep = [];

        // Get altitude from log
        for (i = 0; i < t02.length; i++) {
            altitude.push(t02[i].altitude);
            timeStep.push(t02[i].time);
        }

        minTime = d3.min(timeStep);
        maxTime = d3.max(timeStep);

        minAlt = d3.min(altitude);
        maxAlt = d3.max(altitude);

        // Set proper range for x axis
        let xScale = d3.scaleLinear()
            .domain([0, maxTime - minTime])
            .range([0, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));

        // Set proper range for y axis
        let yScale = d3.scaleLinear()
            .domain([minAlt, maxAlt])
            .range([height - margin.bottom - margin.top, 0]);

        svg.append("g")
            .call(d3.axisLeft(yScale));

        // Add the line
        svg.append("path")
            .datum(t02)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", d3.line()
            .x(function(d) { return xScale(d.time - minTime) })
            .y(function(d) { return yScale(d.altitude) })
          )  

        });

})());