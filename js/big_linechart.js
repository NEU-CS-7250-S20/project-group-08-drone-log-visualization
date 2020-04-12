function linechartPlotBig() {

    const BRUSHING_STRING = "brushing";

    // width and height will be computed automatically
    let width = null, height = null, widthMinusMargins = null, heightMinusMargins = null, svg = null, xScale, yScale,
        lines, extent = null;
    let margin = {top: 20, right: 5, bottom: 20, left: 30};
    let dataColor = "red";
    let dataName="altitude";
    let dataLegend = "Altitude [m]";
    let dataSource = null;

    let data2draw, minTime, maxTime, selectionDispatcher;
    let brushingDispatcher = d3.dispatch(BRUSHING_STRING);

    function chart(selector, show_groups, groups, index) {

        // get a categorical color scheme
        let colorMap = d3.scaleOrdinal(d3.schemeSet1);

        // get information about what we're plotting
        let dataLen = 0;
        dataLegend = [];
        dataName = [];
        dataSource = [];

        show_groups.forEach((g) => {
            if (g !== null) {
                dataLen += g.keys.length;
                for (let i = 0; i < g.keys.length; i++) {
                    dataLegend.push(g.legends[i]);
                    dataName.push(g.keys[i]);
                    dataSource.push(g.source);
                }
            }
        });

        let maxDataRaw = [];
        let scales = [];

        for (let i = 0; i < dataName.length; i++) {
            maxDataRaw.push(d3.max(dataSource[i], d => d[dataName[i]]));
            // scales.push(maxValueOfFirst / tmpMaxValue);
        }

        let maxValueRaw = d3.max(maxDataRaw);

        for (let i = 0; i < maxDataRaw.length; i++) {
            let tempScale = maxValueRaw / maxDataRaw[i];
            if (tempScale < 5)
                scales.push(1.0);
            else if (tempScale < 10)
                scales.push(5.0);
            else if (tempScale < 20)
                scales.push(10.0);
            else if (tempScale < 50)
                scales.push(20.0);
            else if (tempScale < 100)
                scales.push(50.0); 
            else
                scales.push(100.0);
        }        

        dataColor = [];
        for (let i = 0; i < dataLen; i++) {
            dataColor.push(colorMap(i));
        }  
        dataColor = [ 
            "#4477AA",
            "#66CCEE",
            "#228833"]

        // get the size of the container
        setWidthHeightAndWHMinusMargins();

        // append the svg object to the body of the page
        let svgBase = d3.select(selector)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("style", "");

        svg = svgBase
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // add dropdown menu for selecting which attribute to display
        let dropdowns = [];

        for (let i = 0; i < 3; i++) {
            let dropdown = d3.select(selector)
                .insert("select", "svg")
                .attr("style", "display: block; float: left;")
                .on("change", function() {

                    let name = d3.select(this).property("value");

                    if (name === "None") {
                        show_groups[i] = null;
                    } else {
                        for (let j = 0; j < groups.length; j++) {

                            if (groups[j].name === name) {
                                show_groups[i] = groups[j];
                            }
                        }
                    }

                    let dispatchString = Object.getOwnPropertyNames(selectionDispatcher._)[1];
                    selectionDispatcher.call(dispatchString, this, show_groups);

                });

            dropdown.selectAll("option")
                .data(groups.concat([{name: "None"}]))
                .enter().append("option")
                .attr("value", function(d) { return d.name; })
                .attr("selected", function(d) {
                    if (show_groups[i] === null) {
                        if (d.name === "None") {
                            return "";
                        } else {
                            return null;
                        }
                    } else {
                        if (d.name === show_groups[i].name) {
                            return "";
                        } else {
                            return null;
                        }
                    }
                })
                .text(function (d) {
                    return d.name;
                });

            dropdowns.push(dropdown);
        }

        // draw figure
        let timeStep = [];

        data2draw = new Array(dataLen);
        let minData = new Array(dataLen);
        let maxData = new Array(dataLen);

        for (let i = 0; i < dataLen; i++) {
            data2draw[i] = [];
        }

        // Get data to draw from log
        for (let name_index = 0; name_index < dataLen; name_index++)
        {
            for (let i = 0; i < dataSource[name_index].length; i++)
            {
                data2draw[name_index].push(dataSource[name_index][i][dataName[name_index]] * scales[name_index]);
                timeStep.push(dataSource[name_index][i].time);
            }

            minData[name_index] = d3.min(data2draw[name_index]);
            maxData[name_index] = d3.max(data2draw[name_index]);
        }

        minTime = d3.min(timeStep);
        maxTime = d3.max(timeStep);

        minY = d3.min(minData);
        maxY = d3.max(maxData);   

        // Set proper range for x axis
        xScale = d3.scaleLinear()
            .domain([minTime, maxTime])
            .range([0, widthMinusMargins]);

        let xAxis = svg.append("g")
            .attr("transform", "translate(0," + heightMinusMargins + ")")
            .call(d3.axisBottom(xScale));

        // Set proper range for y axis
        yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([heightMinusMargins, 0]);

        let yAxis = svg.append("g").call(d3.axisLeft(yScale));

        // add clip path
        let clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", widthMinusMargins)
            .attr("height", heightMinusMargins)
            .attr("x", 0)
            .attr("y", 0);

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
                .y(function(d) { return yScale(d[dataName[i]] * scales[i]) });
            lineObj.push(tmpLineObj);

            line[i].append("path")
                .datum(dataSource[i])
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
                    .attr("y", -5).text(dataLegend[i-1] + "     [" + d3.format("d")(scales[i - 1]) + "x]")
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

        // create  a group for mouseover effects
        let mouseG = svg.append("g").attr("class", "mouse-over-effects");

        // add a vertical line
        mouseG.append("path")
            .attr("class", "mouse-line")
            .attr("pointer-events", "none")
            .style("stroke", "black")
            .style("stroke-width", "1px")
            .style("opacity", "0");

        // add a circle for each attribute
        let mousePerLine = mouseG.selectAll(".mouse-per-line")
            .data(dataName)
            .enter()
            .append("g")
            .attr("class", "mouse-per-line");

        mousePerLine.append("circle")
            .attr("r", 7)
            .style("stroke", function(d) {
                let tmpIndex = dataName.findIndex((element) => element === d);
                return dataColor[tmpIndex];
            })
            .style("fill", "none")
            .style("stroke-width", "0px")
            .style("opacity", "0");

        // add a text box for each attribute
        mousePerLine.append("text")
            .attr("transform", "translate(10, 3)");

        // add the trigger area for mouseover
        lines = svg.node().getElementsByClassName("line");

        svg
            .on("mouseout", function() {
                // hide all mouse over effects when the pointer exists the graph
                d3.selectAll(".mouse-line")
                    .style("opacity", "0");
                d3.selectAll(".mouse-per-line circle")
                    .style("opacity", "0");
                d3.selectAll(".mouse-per-line text")
                    .style("opacity", "0");
            })
            .on("mouseover", function () {
                // show mouse over effects when inside of the graph
                d3.selectAll(".mouse-line")
                    .style("opacity", "1");
                d3.selectAll(".mouse-per-line circle")
                    .style("opacity", "1");
                d3.selectAll(".mouse-per-line text")
                    .style("opacity", "1");
            })
            .on("mousemove", function() {
                // get mouse location and time
                let mouse = d3.mouse(this);
                let time = xScale.invert(mouse[0]);

                // propagate selection
                let dispatchString = Object.getOwnPropertyNames(selectionDispatcher._)[2];
                selectionDispatcher.call(dispatchString, this, time);
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
                    .y(function(d) { return yScale(d[dataName[i]] * scales[i]) })
                ); 
            }
        }

        // If user double-clicks, reinitialize the chart
        svg.on("dblclick",function(){
            xScale.domain(d3.extent(dataSource[0], function(d) { return d.time; }));
            xAxis.transition().call(d3.axisBottom(xScale));
            for (let i = 0; i < dataLen; i++) {
                line[i]
                    .select(".line")
                    //.transition()
                    .attr("d", d3.line()
                    .x(function(d) { return xScale(d.time) })
                    .y(function(d) { return yScale(d[dataName[i]] * scales[i]) })
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

            // update axes
            xScale.range([0, widthMinusMargins]);
            yScale.range([heightMinusMargins, 0]);

            xAxis.call(d3.axisBottom(xScale));
            xAxis.attr("transform", "translate(0," + heightMinusMargins + ")");
            yAxis.call(d3.axisLeft(yScale));

            // update brushing
            clip
                .attr("width", widthMinusMargins )
                .attr("height", heightMinusMargins);

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

                yLegendCircles[i].attr("cx",widthMinusMargins / (dataLen + 1) * (i + 1));
                yLegendTexts[i].attr("x", widthMinusMargins / (dataLen + 1) * (i + 1) + 8);

            }

        });

        if (extent !== null) {
            updateChart(extent);
        }

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

    chart.moveHighlight = function(time) {

        let mouseX = xScale(time);

        // move the mouse line to mouse location
        svg.select(".mouse-line")
            .attr("d", function() {
                let top = (height - margin.bottom - margin.top),
                    bottom = 0,
                    loc = mouseX;

                return "M" + loc + "," + top + " " + loc + "," + bottom;
            });

        // move the circle and update text box value
        svg.selectAll(".mouse-per-line")
            .attr("transform", function(d, i) {

                /*
                We know the x position of the mouse and we want to find the corresponding y
                position of the two lines at x. Do a binary search on the total length
                of the line to find a point with the x position corresponding to the mouse x.
                https://bl.ocks.org/larsenmtl/e3b8b7c2ca4787f77d78f58d41c3da91
                */

                // the initial interval is 0 - line length
                let beginning = 0,
                    end = lines[i].getTotalLength(),
                    target = null;

                while (true) {

                    target = Math.floor((beginning + end) / 2);

                    pos = lines[i].getPointAtLength(target);
                    if ((target === end || target === beginning) && pos.x !== mouseX) {
                        // search converged, ignoring fractions
                        break;
                    }

                    if (pos.x > mouseX) {
                        // target is to the left of the end of the interval
                        end = target;
                    } else if (pos.x < mouseX) {
                        // target is to the right of the beginning of the interval
                        beginning = target;
                    } else{
                        // search converged including all decimal places; never happens
                        break;
                    }
                }

                // add the correct value to the text box
                d3.select(this).select("text")
                    .text(d3.format(".2f")(yScale.invert(pos.y)));

                // move the circle
                return "translate(" + mouseX + "," + pos.y + ")";
            });    
    };

    chart.selectionDispatcher = function(_) {
        if (!arguments.length) return selectionDispatcher;
        selectionDispatcher = _;
        return chart;
    };

    chart.extent = function(_) {
        if (!arguments.length) return extent;
        extent = _;
        return chart;
    };

    return chart;

}