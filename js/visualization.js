((() => {

    const delimiter = ";";

    // load telemetry data
    Promise.all([
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T02.csv", parseT02),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T15.csv", parseT15),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T16.csv", parseT16),
    ]).then(function(files) {

        // get the average longitude and latitude; this will be our starting point for the map *for now*
        let t02 = files[0];
        let lat = [], lon = [];

        for (i = 0; i < t02.length; i++) {
            lat.push(t02[i].posLat);
            lon.push(t02[i].posLon);
        }

        let avgLat = (lat.reduce((prev, cur) => cur += prev)) / lat.length;
        let avgLon = (lon.reduce((prev, cur) => cur += prev)) / lon.length;

        // subsample GPS coordinates, we have trouble displaying more than 150 at the same time
        // we will probably switch from Google Maps API to leaflet or something similar
        let num = 150;
        let t02Subset = subsample(t02, num);
        t02Subset = t02Subset.reverse();

        // simple array that counts from zero to number of elements - 1
        // used to draw links between points
        let links = [];
        for (i = 0; i < num - 1; i++) {
            links.push(i);
        }

        // setup google map
        let map = new google.maps.Map(d3.select("#map").node(), {
            zoom: 16,
            center: new google.maps.LatLng(avgLat, avgLon),
            mapTypeId: google.maps.MapTypeId.TERRAIN
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
                padding = 10;

                // add marker SVG and markers
                let marker = layer.selectAll("svg.markers")
                    .data(t02Subset)
                    .each(transform) // update existing markers
                    .enter().append("svg")
                    .each(transform)
                    .attr("class", "marker");

                marker.append("circle")
                    .attr("r", 3.5)
                    .attr("cx", padding)
                    .attr("cy", padding);

                // add lines
                let line = layer.selectAll("svg.lines")
                    .data(links)
                    .each(transformLinkSvg)
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
                        left = p1.x;
                        width = p2.x - p1.x;
                    } else {
                        left = p2.x;
                        width = p1.x - p2.x;
                    }

                    if (p1.y < p2.y) {
                        top = p1.y;
                        height = p2.y - p1.y;
                    } else {
                        top = p2.y;
                        height = p1.y - p2.y;
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
                        x1 = p2.x - p1.x;
                        x2 = 0;
                    } else {
                        x1 = 0;
                        x2 = p1.x - p2.x;
                    }

                    if (p1.y < p2.y) {
                        y1 = p2.y - p1.y;
                        y2 = 0;
                    } else {
                        y1 = 0;
                        y2 = p1.y - p2.y;
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

        });

})());