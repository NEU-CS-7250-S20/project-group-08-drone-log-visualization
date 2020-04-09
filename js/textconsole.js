function consoleDisplay() {

    let width = 460, height = 200;

    const BRUSHING_STRING = "brushing";

    const console_header = "<strong><center>System Messages</center></strong>"

    let brushingDispatcher = d3.dispatch(BRUSHING_STRING);

    function chart(selector, data) {

        height = d3.select(selector).node().getBoundingClientRect().height;
        width = d3.select(selector).node().getBoundingClientRect().width;

        // set the dimensions and margins of the graph
        let margin = {top: 1, right: 5, bottom: 1, left: 5},
        _width = width - margin.left - margin.right,
        _height = height - margin.top - margin.bottom;

        // append the svg object to the body of the page
        let svg = d3.select(selector)
            //.append("svg")
            .attr("style", "width: " + _width + "px; height: " + _height + "px;")
            .attr("style", "margin: " + margin.top + "px " + margin.right + "px " + margin.bottom + "px " + margin.left + "px;")
            .attr("class", "log-console");
            //.attr("width", _width + margin.left + margin.right)
            //.attr("height", _height + margin.top + margin.bottom)
            //.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let frObject = svg
                .append('foreignObject')
                .attr("width", _width)
                .attr("height", _height)
                .attr("x", 0)
                .attr("y", 0);

        let div = frObject
                    .append('xhtml:div')
                    .attr("class", "log-console")
                    .attr("style", "border-left: 1px solid; border-right: 1px solid")
                    .html("");

        let text2display = "";
        let maxTimeStep = data.length;
        for (i = 0; i < maxTimeStep; i++)
        {
            text2display += data[i].time + " " + data[i].message + "<br>";            
        }

        div.html("<p class='console-text-style'>" + "<font size='3px'; font-family='sans-serif'>" + console_header + text2display) + "</p>";

        // Update the text given boundaries
        brushingDispatcher.on(BRUSHING_STRING, function(d) {
            updateText(d);
        });

        function updateText(d) {

            // Get selected boundaries
            extent = d;

            indices = findIndexOfStartAndEndTime(extent[0], extent[1]);
            startStep = indices[0];
            currentStep = indices[1];

            text2display = "";

            for (i = startStep; i < currentStep; i++)
            {
                text2display += data[i].time + data[i].message + "<br>";            
            }

            div.html("<p class='console-text-style'>" + "<font size='3px'; font-family='sans-serif'>" + console_header + text2display + "</p>");

        }

        function findIndexOfStartAndEndTime(startTime, endTime) {

            let startIdx = null,
                endIdx = null;
    
            for (i = 0; i < data.length; i++) {
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