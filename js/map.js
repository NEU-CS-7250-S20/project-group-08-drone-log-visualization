// slider: https://bl.ocks.org/johnwalley/e1d256b81e51da68f7feb632a53c3518

function mapplot() {

    let width = 1.0, height = 1.0, maxPoints = 100;

    function chart(selector, data) {

        // get the average longitude and latitude; this will be our starting point for the map *for now*
        let t02 = data;
        let lat = [], lon = [];

        for (i = 0; i < t02.length; i++) {
            lat.push(t02[i].posLat);
            lon.push(t02[i].posLon);
        }

        let avgLat = (lat.reduce((prev, cur) => cur += prev)) / lat.length;
        let avgLon = (lon.reduce((prev, cur) => cur += prev)) / lon.length;

        d3.select(selector).attr("style", "width: " + width * 100 + "%; height: " + height * 100 + "%;");

        // subsample GPS coordinates, we have trouble displaying more than 150 at the same time
        // we will probably switch from Google Maps API to leaflet or something similar
        let t02Subset = subsample(t02, maxPoints);
        t02Subset = t02Subset.reverse();

        // simple array that counts from zero to number of elements - 1
        // used to draw links between points
        let links = [];
        for (i = 0; i < maxPoints - 1; i++) {
            links.push(i);
        }

        // setup google map
        let map = new google.maps.Map(d3.select(selector).node(), {
            zoom: 16,
            center: new google.maps.LatLng(avgLat, avgLon),
            mapTypeId: google.maps.MapTypeId.HYBRID
        });

        // get overlay for drawing on the map
        let overlay = new google.maps.OverlayView();

        overlay.onAdd = function() {

            let layer = d3.select(this.getPanes().overlayLayer).append("div").attr("class", "path");

            // draw each marker and line as a separate element
            // this is probably a bad way of doing things, but we didn't manage to force a single SVG
            // to fit over the whole map
            overlay.draw = function() {

                let projection = this.getProjection(),
                    padding = 10,
                    paddingForLines = 10;

                layer.selectAll("svg").remove();

                // add marker SVG and markers
                let marker = layer.selectAll("svg.markers")
                    .data(t02Subset)
                    //.each(transform) // update existing markers
                    .enter().append("svg")
                    .each(transform)
                    .attr("class", "marker");

                marker.append("circle")
                    .attr("r", 1)
                    .attr("cx", padding)
                    .attr("cy", padding);

                // add lines
                let line = layer.selectAll("svg.lines")
                    .data(links)
                    //.each(transformLinkSvg)
                    .enter().append("svg")
                    .each(transformLinkSvg);

                line.append("line")
                    .each(transformLinkLine);

                function latLongToPos(d) {
                    // position in GPS to position in the map window
                    let p = new google.maps.LatLng(d.posLat, d.posLon);
                    return projection.fromLatLngToDivPixel(p);
                }

                function latLongToPosSubtractPadding(d) {
                    // subtract padding for markers
                    p = latLongToPos(d);
                    p.x = p.x - padding;
                    p.y = p.y - padding;
                    return p;
                }

                function transform(d) {
                    // update positions of markers
                    d = latLongToPosSubtractPadding(d);
                    return d3.select(this)
                        .style("left", d.x + "px")
                        .style("top", d.y + "px");
                }

                function transformLinkSvg(d) {
                    // update positions of SVG holding lines
                    let p1 = latLongToPos(t02Subset[d]),
                    p2 = latLongToPos(t02Subset[d + 1]);

                    let left, top, width, height;

                    if (p1.x < p2.x) {
                        left = p1.x - paddingForLines;
                        width = p2.x - p1.x + 2 * paddingForLines;
                    } else {
                        left = p2.x - paddingForLines;
                        width = p1.x - p2.x + 2 * paddingForLines;
                    }

                    if (p1.y < p2.y) {
                        top = p1.y - paddingForLines;
                        height = p2.y - p1.y + 2 * paddingForLines;
                    } else {
                        top = p2.y - paddingForLines;
                        height = p1.y - p2.y + 2 * paddingForLines;
                    }

                    d3.select(this)
                        .style("left", left + "px")
                        .style("top", top + "px")
                        .style("width", width + "px")
                        .style("height", height + "px")
                        .style('fill', 'none')
                        .style("stroke-width", "2px")
                        .style('stroke', 'red');
                }

                function transformLinkLine(d) {
                    // update settings of lines
                    let p1 = latLongToPos(t02Subset[d]),
                    p2 = latLongToPos(t02Subset[d + 1]);

                    let x1, y1, x2, y2;

                    if (p1.x < p2.x) {
                        x1 = p2.x - p1.x + paddingForLines;
                        x2 = paddingForLines;
                    } else {
                        x1 = paddingForLines;
                        x2 = p1.x - p2.x + paddingForLines;
                    }

                    if (p1.y < p2.y) {
                        y1 = p2.y - p1.y + paddingForLines;
                        y2 = paddingForLines;
                    } else {
                        y1 = paddingForLines;
                        y2 = p1.y - p2.y + paddingForLines;
                    }

                    d3.select(this)
                        .attr("x1", x1)
                        .attr("y1", y1)
                        .attr("x2", x2)
                        .attr("y2", y2);

                }

            };
        };

        // bind overlay to map
        overlay.setMap(map);

        // setup slider
        let sliderSimple = d3
            .sliderBottom()
            .min(0.0)
            .max(1.0)
            .width(300)
            .tickFormat(d3.format('.2'))
            .ticks(5)
            .default(0.5)
            .on('onchange', function(val) {
                // subsample GPS coordinates, we have trouble displaying more than 150 at the same time
                // we will probably switch from Google Maps API to leaflet or something similar
                let tmpNumPoints = Math.round(val * t02.length);
                let tmpT02 = t02.slice(0, tmpNumPoints);
                let tmpMaxPoints = Math.min(tmpNumPoints, maxPoints);

                t02Subset = subsample(tmpT02, tmpMaxPoints);
                t02Subset = t02Subset.reverse();

                // simple array that counts from zero to number of elements - 1
                // used to draw links between points
                links = [];
                for (i = 0; i < tmpMaxPoints - 1; i++) {
                    links.push(i);
                }

                overlay.draw()
            });


        var gSimple = d3
            .select('div#slider-simple')
            .append('svg')
            .attr('width', 500)
            .attr('height', 100)
            .append('g')
            .attr('transform', 'translate(30,30)');


        gSimple.call(sliderSimple);

        /*
        d3.select('p#value-simple').text(d3.format('.2%')(sliderSimple.value()));
        */

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

    chart.maxPoints = function(_) {
        if (!arguments.length) return maxPoints;
        maxPoints = _;
        return chart;
    };

    return chart;

}