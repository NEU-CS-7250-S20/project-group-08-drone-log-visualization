function linechartPlot() {

    const BRUSHING_STRING = "brushing";

    // width and height will be computed automatically
    let width = null, height = null, widthMinusMargins = null, heightMinusMargins = null;
    let margin = {top: 20, right: 5, bottom: 20, left: 30};
    let dataColor = "red";
    let dataName="altitude";
    let dataLegend = "Altitude [m]";
    let dataSource = null;

    let data2draw, minTime, maxTime, selectionDispatcher;
    let brushingDispatcher = d3.dispatch(BRUSHING_STRING);

    function chart(selector, group, groups, index) {

        // get a categorical color scheme
        let colorMap = d3.scaleOrdinal(d3.schemeSet1);

        // get information about what we're plotting
        let dataLen = group.keys.length;
        dataLegend = group.legends;
        dataName = group.keys;
        dataSource = group.source;

        dataColor = [];
        for (i = 0; i < dataLen; i++) {
            dataColor.push(colorMap(i));
        }

        // get the size of the container
        setWidthHeightAndWHMinusMargins();

        // append the svg object to the body of the page
        let svgBase = d3.select(selector)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("style", "");

        let svg = svgBase
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // add dropdown menu for selecting which attribute to display
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

        // draw figure
        let timeStep = [];

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
            .range([0, widthMinusMargins]);

        let xAxis = svg.append("g")
            .attr("transform", "translate(0," + heightMinusMargins + ")")
            .call(d3.axisBottom(xScale));

        // Set proper range for y axis
        let yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([heightMinusMargins, 0]);

        let yAxis = svg.append("g").call(d3.axisLeft(yScale));

        // add clip path
        /*
        let clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", widthMinusMargins)
            .attr("height", heightMinusMargins)
            .attr("x", 0)
            .attr("y", 0);
        */
        // add brushing
        let brush = d3.brushX()
            .extent([[0, 0], [widthMinusMargins, heightMinusMargins]])
            .on("end", function() {
                // prevent infinite recursion
                // (selection triggers update, which clears the selection, which triggers an update, ...)
                // https://stackoverflow.com/questions/45035506/how-to-prevent-d3-brush-events-from-firing-after-calling-brush-move
                if (d3.event.sourceEvent === null || d3.event.sourceEvent.type !== "mouseup") return;

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
        let lineBrush = new Array(dataLen);
        let lineObj = [];

        for (let i = 0; i < dataLen; i++)
        {
            line[i] = svg.append("g")
                .attr("clip-path", "url(#clip)");
        }

        // Add lines
        for (let i = 0; i < dataLen; i++) {

            let tmpLineObj = d3.line()
                .x(function(d) { return xScale(d.time) })
                .y(function(d) { return yScale(d[dataName[i]]) });
            lineObj.push(tmpLineObj);

            line[i].append("path")
                .datum(dataSource)
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", dataColor[i])
                .attr("stroke-width", 2)
                .attr("d", tmpLineObj);

        }

        for (let i = 0; i < dataLen; i++) {
            lineBrush[i] = line[i].append("g")
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
        let yGridLines = svg.append("g")
            .attr("class", "grid")
            .call(make_y_gridlines()
                .tickSize(- widthMinusMargins)
                .tickFormat(""));

        // add the X gridlines
        let xGridLines = svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + heightMinusMargins + ")")
            .call(make_x_gridlines()
                .tickSize(- heightMinusMargins)
                .tickFormat(""));

        let xLegend = svg.append("text")
            .attr("x", widthMinusMargins - 30)
            .attr("y", heightMinusMargins - 15)
            .text("t [s]")
            .style("font-size", "10px", "font-family", "sans-serif")
            .attr("alignment-baseline", "middle");

        let yLegendCircles = [];
        let yLegendTexts = [];

        for (let i = 1; i <= dataLen; i++) {
            yLegendCircles.push(
                svg.append("circle")
                    .attr("cx", widthMinusMargins / (dataLen + 1) * i)
                    .attr("cy", -10)
                    .attr("r", 6)
                    .style("fill", dataColor[i - 1])
            );
            yLegendTexts.push(
                svg.append("text")
                    .attr("x", widthMinusMargins / (dataLen + 1) * i + 8)
                    .attr("y",-5).text(dataLegend[i-1])
                    .style("font-size", "10px", "font-family", "sans-serif")
                    .attr("alignment-baseline","middle")
            );
        }

        let idleTimeout;
        function idled() { idleTimeout = null; }

        // Update the chart given boundaries
        brushingDispatcher.on(BRUSHING_STRING, function(d) {
            updateChart(d);
        });

        function updateChart(d) {

            // clear selection
            for (let i = 0; i < lineBrush.length; i++) {
                brush.move(lineBrush[i], null);
            }

            // Get selected boundaries
            extent = d;

            // If no selection, back to initial coordinate. Otherwise, update X axis domain
            if(!extent) {
                console.log("BAD");
                if (!idleTimeout) 
                    return idleTimeout = setTimeout(idled, 350);
            }
            else {
                xScale.domain([ extent[0], extent[1]])
            }

            // Update axis and line position
            xAxis//.transition().duration(1000)
                .call(d3.axisBottom(xScale));

            for (let i = 0; i < dataLen; i++) {
                line[i]
                    .select(".line")
                    .attr("d", d3.line()
                    .x(function(d) { return xScale(d.time) })
                    .y(function(d) { return yScale(d[dataName[i]]) })
                ); 
            }
        }

        // If user double-clicks, reinitialize the chart
        svg.on("dblclick",function(){
            xScale.domain(d3.extent(dataSource, function(d) { return d.time; }));
            xAxis.transition().call(d3.axisBottom(xScale));
            for (i = 0; i < dataLen; i++) {
                line[i]
                    .select(".line")
                    //.transition()
                    .attr("d", d3.line()
                    .x(function(d) { return xScale(d.time) })
                    .y(function(d) { return yScale(d[dataName[i]]) })
                );  
            }
            
        });

        // resize figure on window resize event
        d3.select(window).on("resize." + index, function() {
            // update size
            setWidthHeightAndWHMinusMargins();
            // update svg size
            svgBase
                .attr("width", width)
                .attr("height", height);



            //clip
            //    .attr("width", widthMinusMargins )
            //    .attr("height", heightMinusMargins);

            // update axes
            xScale.range([0, widthMinusMargins]);
            yScale.range([heightMinusMargins, 0]);

            xAxis.call(d3.axisBottom(xScale));
            xAxis.attr("transform", "translate(0," + heightMinusMargins + ")");
            yAxis.call(d3.axisLeft(yScale));
            // update brushing
            brush.extent([[0,0], [widthMinusMargins, heightMinusMargins]]);

            for (let i = 0; i < dataLen; i++) {
                lineBrush[i]
                    .call(brush);
            }
            // redraw lines
            for (let i = 0; i < dataLen; i++) {
                line[i].selectAll(".line")
                    .attr("d", function (d) {
                        return lineObj[i](d);
                    });
            }
            // update grid lines
            xGridLines
                .attr("transform", "translate(0," + heightMinusMargins + ")")
                .call(
                    make_x_gridlines()
                        .tickSize(- heightMinusMargins)
                        .tickFormat("")
                );
            yGridLines
                .attr("x", widthMinusMargins - 30)
                .attr("y", heightMinusMargins - 15)
                .call(make_y_gridlines()
                    .tickSize(- widthMinusMargins)
                    .tickFormat("")
                );
            // update legends
            xLegend
                .attr("x", widthMinusMargins - 30)
                .attr("y", heightMinusMargins - 15);

            for (let i = 0; i < dataLen; i++) {

                yLegendCircles[i].attr("cx",widthMinusMargins / (dataLen + 1) * i);
                yLegendTexts[i].attr("x", widthMinusMargins / (dataLen + 1) * i + 8);

            }

        });

        function brushEventToTime(brushEvent) {
            return [xScale.invert(brushEvent[0]), xScale.invert(brushEvent[1])];
        }

        function setWidthHeightAndWHMinusMargins() {
            // get the size of the container
            width = d3.select(selector).node().getBoundingClientRect().width;
            height = d3.select(selector).node().getBoundingClientRect().height - 50;

            // set the dimensions and margins of the graph
            widthMinusMargins = width - margin.left - margin.right;
            heightMinusMargins = height - margin.top - margin.bottom;
        }

        return chart;

    }

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