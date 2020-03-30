function linechartPlot() {

    const BRUSHING_STRING = "brushing";

    let width = 460, height = 200;
    let dataColor = "red";
    let dataName="altitude";
    let dataLegend = "Altitude [m]";
    let dataSource = null;

    let data2draw, minTime, maxTime, selectionDispatcher;
    let brushingDispatcher = d3.dispatch(BRUSHING_STRING);

    function chart(selector, group, groups, index) {

        let colorMap = d3.scaleOrdinal(d3.schemeSet1);

        let dataLen = group.keys.length;
        dataLegend = group.legends;
        dataName = group.keys;
        dataSource = group.source;

        dataColor = [];

        for (i = 0; i < dataLen; i++) {
            dataColor.push(colorMap(i));
        }

        height = d3.select(selector).node().getBoundingClientRect().height - 50;
        width = d3.select(selector).node().getBoundingClientRect().width;

        // set the dimensions and margins of the graph
        let margin = {top: 20, right: 0, bottom: 20, left: 30},
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

        // add dropdown
        // http://bl.ocks.org/williaster/10ef968ccfdc71c30ef8?fbclid=IwAR0_lHlF2CTFXSeZluFu9OHC1qGud08Is1XWyVN58bNI6-xr0nrGL_F38OM
        let dropdown = d3.select(selector)
            .insert("select", "svg")
            .attr("style", "display: block;")
            .on("change", function() {

                let group = null;
                let name = d3.select(this).property("value");

                for (i = 0; i < groups.length; i++) {
                    if (groups[i].name === name) {
                        group = groups[i];
                    }
                }

                let dispatchString = Object.getOwnPropertyNames(selectionDispatcher._)[1];
                selectionDispatcher.call(dispatchString, this, group);

            });

        dropdown.selectAll("option")
            .data(groups)
            .enter().append("option")
            .attr("value", function(d) { return d.name; })
            .attr("selected", function(d) {
                if (d.name === group.name) {
                    return "";
                } else {
                    return null;
                }
            })
            .text(function (d) {
                return d.name;
            });

        let timeStep = [];

        d3.select(window).on("resize." + index, function() {
            let dispatchString = Object.getOwnPropertyNames(selectionDispatcher._)[1];
            selectionDispatcher.call(dispatchString, this, group);
        });

        data2draw = new Array(dataLen);
        let minData = new Array(dataLen);
        let maxData = new Array(dataLen);

        for (i = 0; i < dataLen; i++) {
            data2draw[i] = [];
        }

        // Get data to draw from log
        for (name_index = 0; name_index < dataLen; name_index++)
        {
            for (i = 0; i < dataSource.length; i++)
            {
                data2draw[name_index].push(dataSource[i][dataName[name_index]]);
                timeStep.push(dataSource[i].time);
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
            .domain([minTime, maxTime])
            .range([0, _width]);

        let xAxis = svg.append("g")
            .attr("transform", "translate(0," + _height + ")")
            .call(d3.axisBottom(xScale));

        // Set proper range for y axis
        let yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([_height, 0]);

        let yAxis = svg.append("g")
                    .call(d3.axisLeft(yScale));

        // add clip path
        let clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", _width )
            .attr("height", _height )
            .attr("x", 0)
            .attr("y", 0);

        // add brushing
        let brush = d3.brushX()
            .extent( [ [0,0], [_width,_height] ] )
            .on("end", function() {
                let timeExtent = null;
                if (d3.event.selection !== null) {
                    timeExtent = brushEventToTime(d3.event.selection);
                } else {
                    timeExtent = [minTime, maxTime];
                }

                let dispatchString = Object.getOwnPropertyNames(selectionDispatcher._)[0];
                selectionDispatcher.call(dispatchString, this, timeExtent);
            });


        let line = new Array(dataLen);
        for (i = 0; i < dataLen; i++)
        {
            line[i] = svg.append('g')
                .attr("clip-path", "url(#clip)");
        }

        // Add lines
        for (i = 0; i < dataLen; i++) {
            line[i].append("path")
                .datum(dataSource)
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", dataColor[i])
                .attr("stroke-width", 2)
                .attr("d", d3.line()
                .x(function(d) { return xScale(d.time) })
                .y(function(d) { return yScale(d[dataName[i]]) })
            );          

        }

        for (i = 0; i < dataLen; i++) {
            line[i].append("g")
                .attr("class", "brush")
                .call(brush);

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
                .tickFormat(""));
                
        for (i = 1; i <= dataLen; i++) {
            svg.append("circle").attr("cx",_width / (dataLen + 1) * i).attr("cy", -10).attr("r", 6).style("fill", dataColor[i - 1]);
            svg.append("text").attr("x", _width / (dataLen + 1) * i + 8).attr("y",-5).text(dataLegend[i-1]).style("font-size", "15px").attr("alignment-baseline","middle");
        }

        let idleTimeout;
        function idled() { idleTimeout = null; }

        // Update the chart given boundaries
        brushingDispatcher.on(BRUSHING_STRING, function(d) {
            updateChart(d);
        });

        function updateChart(d) {

            // Get selected boundaries
            extent = d;

            // If no selection, back to initial coordinate. Otherwise, update X axis domain
            if(!extent) {
                if (!idleTimeout) 
                    return idleTimeout = setTimeout(idled, 350);
            }
            else {
                xScale.domain([ extent[0], extent[1]])
            }

            // Update axis and line position
            xAxis.transition().duration(1000)
                .call(d3.axisBottom(xScale));

            for (i = 0; i < dataLen; i++) {
                line[i]
                    .select('.line')
                    //.transition()
                    //.duration(1000)
                    .attr("d", d3.line()
                    .x(function(d) { return xScale(d.time) })
                    .y(function(d) { return yScale(d[dataName[i]]) })
                ); 
            }
        }

        // If user double-clicks, reinitialize the chart
        svg.on("dblclick",function(){
            xScale.domain(d3.extent(dataSource, function(d) { return d.time; }))
            xAxis.transition().call(d3.axisBottom(xScale))
            for (i = 0; i < dataLen; i++) {
                line[i]
                    .select('.line')
                    .transition()
                    .attr("d", d3.line()
                    .x(function(d) { return xScale(d.time) })
                    .y(function(d) { return yScale(d[dataName[i]]) })
                );  
            }
            
        });

        function brushEventToTime(brushEvent) {
            return [xScale.invert(brushEvent[0]), xScale.invert(brushEvent[1])];
        }

        return chart;

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

    chart.updateSelection = function(selectedData) {

        if (!arguments.length) return;

        brushingDispatcher.call(BRUSHING_STRING, this, selectedData);

    };

    chart.selectionDispatcher = function(_) {
        if (!arguments.length) return selectionDispatcher;
        selectionDispatcher = _;
        return chart;
    };

    return chart;

}