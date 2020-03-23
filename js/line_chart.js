function linechartPlot() {

    let width = 460, height = 400;
    let color = "red";
    let dataName="altitude";

    function chart(selector, data) {

        // set the dimensions and margins of the graph
        var margin = {top: 10, right: 30, bottom: 30, left: 60},
        _width = width - margin.left - margin.right,
        _height = height - margin.top - margin.bottom;

        // append the svg object to the body of the page
        var svg = d3.select(selector)
            .append("svg")
            .attr("width", _width + margin.left + margin.right)
            .attr("height", _height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let t02 = data;
        let data2draw = [];
        let timeStep = [];

        // Get data2draw from log
        // TODO: Should get things to draw from an input data index
        for (i = 0; i < t02.length; i++) {
            data2draw.push(t02[i][dataName]);
            timeStep.push(t02[i].time);
        }

        minTime = d3.min(timeStep);
        maxTime = d3.max(timeStep);

        minY = d3.min(data2draw);
        maxY = d3.max(data2draw);        

        // Set proper range for x axis
        let xScale = d3.scaleLinear()
            .domain([0, maxTime - minTime])
            .range([0, _width]);

        svg.append("g")
            .attr("transform", "translate(0," + _height + ")")
            .call(d3.axisBottom(xScale));

        // Set proper range for y axis
        let yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([_height - margin.bottom - margin.top, 0]);

        svg.append("g")
            .call(d3.axisLeft(yScale));

        // Add the line
        svg.append("path")
            .datum(t02)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("d", d3.line()
            .x(function(d) { return xScale(d.time - minTime) })
            .y(function(d) { return yScale(d.altitude) })
          );          

    }

    chart.width = function(_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function(_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.color = function(_) {
        if (!arguments.length) return color;
        color = _;
        return chart;
    };

    chart.dataName = function(_) {
        if (!arguments.length) return dataName;
        dataName = _;
        return chart;
    };   

    // chart.dataLegend = function(_) {
    //     if (!arguments.dataLegend) return data_legend;
    //     dataLegend = _;
    //     return dataLegend;
    // };      

    return chart;

}