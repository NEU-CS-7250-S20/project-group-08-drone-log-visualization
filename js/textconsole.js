function consoleDisplay() {

    // will be set automatically
    let width = null, height = null;

    const BRUSHING_STRING = "brushing";
    const CONSOLE_HEADER = "<strong><center>System Messages</center></strong>"
    const FILTER_GROUPS = ["Filter Smon+Comm", "Filter Smon", "Filter Comm", "No Filter"];

    let brushingDispatcher = d3.dispatch(BRUSHING_STRING);

    function chart(selector, data) {
        // set width and height
        height = d3.select(selector).node().getBoundingClientRect().height;
        width = d3.select(selector).node().getBoundingClientRect().width;

        // set the dimensions and margins of the graph
        let margin = {top: 1, right: 5, bottom: 1, left: 5},
        _width = width - margin.left - margin.right,
        _height = height - margin.top - margin.bottom;

        // append the svg object to the body of the page
        let svg = d3.select(selector)
            .attr("style", "width: " + _width + "px; height: " + _height + "px;")
            .attr("style", "margin: " + margin.top + "px " + margin.right + "px " + margin.bottom + "px " + margin.left + "px;")
            .attr("class", "log-console");

        // add dropdown menu for filtering messages
        let startStep = 0;
        let currentStep = data.length;
        let filterLevel = FILTER_GROUPS[0];
        let dropdown = d3.select(selector)
            .insert("select", "svg")
            .attr("style", "display: block;")
            .on("change", function() {
                filterLevel = d3.select(this).property("value");
                filterText(filterLevel);
            });            

        dropdown.selectAll("option")
            .data(FILTER_GROUPS)
            .enter().append("option")
            .attr("value", function(d) { return d; })
            .text(function (d) {
                return d;
            });

        let frObject = svg
            .append('foreignObject')
            .attr("width", _width)
            .attr("height", _height)
            .attr("x", 0)
            .attr("y", 0);

        let div = frObject
            .append('xhtml:div')
            .attr("class", "log-console")
            .html("");

        // add console text
        // Default is filter Comm + Smon
        filterText(filterLevel);

        // Update the text given boundaries
        brushingDispatcher.on(BRUSHING_STRING, function(d) {
            updateText(d);
        });

        function updateText(d) {

            // Get selected boundaries
            let indices = findIndexOfStartAndEndTime(d[0], d[1]);

            startStep = indices[0];
            currentStep = indices[1];

            // update text
            filterText(filterLevel)

        }

        function filterText(level) {
            // filter various types of messages
            let text2display = "";

            for (let i = startStep; i < currentStep; i++) {
                if (level === FILTER_GROUPS[1]) {
                    // show ping messages
                    if (!data[i].message.includes("smon"))
                        text2display += data[i].time + " " + data[i].message + "<br>";   
                }
                else if (level === FILTER_GROUPS[2]) {
                    // show communication messages
                    if ((!data[i].message.includes("[K")) && (!data[i].message.includes("[U]")))
                        text2display += data[i].time + " " + data[i].message + "<br>";   
                }
                else if (level === FILTER_GROUPS[0]) {
                    // show ping and communication messages
                    if ((!data[i].message.includes("[K")) && (!data[i].message.includes("[U")) && (!data[i].message.includes("smon")))
                        text2display += data[i].time + " " + data[i].message + "<br>";   
                }
                else {
                    // show everything else
                    text2display += data[i].time + " " + data[i].message + "<br>";   
                }
            }

            div.html("<p class='console-text-style'>" + "<font-size='3px'; font-family='sans-serif'>" + CONSOLE_HEADER + text2display + "</p>");

        }

        function findIndexOfStartAndEndTime(startTime, endTime) {
            // given a start and end time, find start and end index in an array of data points with timestamps
            let startIdx = null,
                endIdx = null;
    
            for (let i = 0; i < data.length; i++) {
                if (data[i].time > startTime && startIdx === null) {
                    startIdx = i;
                } else if (data[i].time > endTime && endIdx === null) {
                    endIdx = i;
                }
            }
    
            if (startIdx === null) {
                startIdx = data.length - 2;
            }
    
            if (endIdx === null) {
                endIdx = data.length - 1;
            }
    
            return [startIdx, endIdx];
    
        }

        return chart;

    }

    chart.updateSelection = function(selectedData) {
        if (!arguments.length) return;
        brushingDispatcher.call(BRUSHING_STRING, this, selectedData);
    };

    return chart;
}