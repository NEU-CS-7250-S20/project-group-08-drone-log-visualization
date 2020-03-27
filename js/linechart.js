function linechartPlot() {

    // let width = 460, height = 200;
    let dataColor = "red";
    let dataName="altitude";
    let dataLegend = "Altitude [m]";

    function chart(selector, data) {

        height = d3.select(selector).node().getBoundingClientRect().height;
        width = d3.select(selector).node().getBoundingClientRect().width;

        // set the dimensions and margins of the graph
        let margin = {top: 50, right: 50, bottom: 50, left: 50},
        _width = width - margin.left - margin.right,
        _height = height - margin.top - margin.bottom;

        // append the svg object to the body of the page
        let svg = d3.select(selector)
            .append("svg")
            .attr("width", _width + margin.left + margin.right)
            .attr("height", _height + margin.top + margin.bottom)
            .attr("style", "")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let t02 = data;
        let timeStep = [];

        let data2draw = new Array(dataName.length);
        let minData = new Array(dataName.length);
        let maxData = new Array(dataName.length);

        for (i = 0; i < dataName.length; i++) {
            data2draw[i] = [];
        }

        // Get data2draw from log
        for (name_index = 0; name_index < dataName.length; name_index++)
        {
            for (i = 0; i < t02.length; i++) 
            {
                data2draw[name_index].push(t02[i][dataName[name_index]]);
                timeStep.push(t02[i].time);
            }

            minData[name_index] = d3.min(data2draw[name_index]);
            maxData[name_index] = d3.max(data2draw[name_index]);
        }

        minTime = d3.min(timeStep);
        maxTime = d3.max(timeStep);

        minY = d3.min(minData);
        maxY = d3.max(maxData);   

        // Set proper range for x axis
        let xScale = d3.scaleLinear()
            .domain([0, maxTime - minTime])
            .range([0, _width]);

        let x2 = d3.scaleTime().range([0, _width]);

        svg.append("g")
            .attr("transform", "translate(0," + _height + ")")
            .call(d3.axisBottom(xScale));

        // Set proper range for y axis
        let yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([_height, 0]);

        svg.append("g")
            .call(d3.axisLeft(yScale));

        // // Add lines
        // for (i = 0; i < dataName.length; i++) {
        //     svg.append("path")
        //         .datum(t02)
        //         .attr("fill", "none")
        //         .attr("stroke", dataColor[i])
        //         .attr("stroke-width", 2)
        //         .attr("d", d3.line()
        //         .x(function(d) { return xScale(d.time - minTime) })
        //         .y(function(d) { return yScale(d[dataName[i]]) })
        //     );          
        // }

        let line = d3.line()
        .x(function (d) { return xScale(d.time); })
        .y(function (d) { return yScale(d[dataName[0]]); });    

        // gridlines in x axis function
        function make_y_gridlines() {		
            return d3.axisLeft(yScale)
                .ticks(10)
        }

        // gridlines in X axis function
        function make_x_gridlines() {		
            return d3.axisBottom(xScale)
                .ticks(10)
        }

        // add the Y gridlines
        svg.append("g")			
            .attr("class", "grid")
            .call(make_y_gridlines()
                .tickSize(-_width)
                .tickFormat(""));

        // add the X gridlines
        svg.append("g")			
            .attr("class", "grid")
            .attr("transform", "translate(0," + _height + ")")
            .call(make_x_gridlines()
                .tickSize(-_height)
                .tickFormat(""));
                
        for (i = 1; i <= dataName.length; i++) {
            svg.append("circle").attr("cx",_width/ (dataName.length + 1) * i).attr("cy", -10).attr("r", 6).style("fill", dataColor[i - 1]);
            svg.append("text").attr("x", _width/ (dataName.length + 1) * i + 8).attr("y",-5).text(dataLegend[i-1]).style("font-size", "15px").attr("alignment-baseline","middle");
        }

        var clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", width)
            .attr("height", height)
            .attr("x", 0)
            .attr("y", 0); 


    var Line_chart = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("clip-path", "url(#clip)");

    Line_chart.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);

    var xAxis = d3.axisBottom(xScale)
    var yAxis = d3.axisLeft(yScale)

    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    focus.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);    

        let zoom = d3.zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[0, 0], [_width, _height]])
            .extent([[0, 0], [_width, _height]])
            .on("zoom", zoomed);            

        svg.append("rect")
            .attr("class", "zoom")
            .attr("width", _width)
            .attr("height", _height)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);

        function zoomed() {
            let t = d3.event.transform;
            xScale.domain(t.rescaleX(xScale).domain());
            focus.select(".axis--x").call(xAxis);
            //  g.attr("transform", d3.event.transform);
            //  Line_chart.select(".line").attr("d", line);
            // focus.select(".axis--x").call(d3.axisBottom(xScale));
            // context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
            }

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

    chart.dataColor = function(_) {
        if (!arguments.length) return dataColor;
        dataColor = _;
        return chart;
    };

    chart.dataName = function(_) {
        if (!arguments.length) return dataName;
        dataName = _;
        return chart;
    };   

    chart.dataLegend = function(_) {
        if (!arguments.length) return dataLegend;
        dataLegend = _;
        return chart;
    };      

    return chart;

}