function linechartPlot() {

    let width = 460, height = 200;
    let color = "red";
    let dataName="altitude";

    function chart(selector, data) {

        // set the dimensions and margins of the graph
        var margin = {top: 10, right: 30, bottom: 60, left: 60},
        _width = width - margin.left - margin.right,
        _height = height - margin.top - margin.bottom;

        // append the svg object to the body of the page
        var svg = d3.select(selector)
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

        svg.append("g")
            .attr("transform", "translate(0," + _height + ")")
            .call(d3.axisBottom(xScale));

        // Set proper range for y axis
        let yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([_height, 0]);

        svg.append("g")
            .call(d3.axisLeft(yScale));

        // Add lines
        for (i = 0; i < dataName.length; i++) {
            svg.append("path")
                .datum(t02)
                .attr("fill", "none")
                .attr("stroke", color[i])
                .attr("stroke-width", 2)
                .attr("d", d3.line()
                .x(function(d) { return xScale(d.time - minTime) })
                .y(function(d) { return yScale(d[dataName[i]]) })
            );          
        }

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
                .tickFormat("")
      )                

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