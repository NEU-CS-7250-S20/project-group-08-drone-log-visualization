((() => {

    const delimiter = ";";

    // load telemetry data
    // https://stackoverflow.com/questions/21842384/importing-data-from-multiple-csv-files-in-d3
    Promise.all([
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T02.csv", parseT02),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T15.csv", parseT15),
        d3.dsv(delimiter, "data/sn11401003-2018-09-11-14-13-ses-00.T16.csv", parseT16),
    ]).then(function(files) {

        let t02 = files[0];
        let lat = [], lon = [];

        for (i = 0; i < t02.length; i++) {
            lat.push(t02[i].posLat);
            lon.push(t02[i].posLon);
        }

        let avgLat = (lat.reduce((prev, cur) => cur += prev)) / lat.length;
        let avgLon = (lon.reduce((prev, cur) => cur += prev)) / lon.length;

        // https://bl.ocks.org/mbostock/899711
        // https://stackoverflow.com/questions/35703407/on-a-google-maps-overlay-how-do-i-create-lines-between-svg-elements-in-d3
        let map = new google.maps.Map(d3.select("#map").node(), {
            zoom: 16,
            center: new google.maps.LatLng(avgLat, avgLon),
            mapTypeId: google.maps.MapTypeId.TERRAIN
        });

        let overlay = new google.maps.OverlayView();

        // Add the container when the overlay is added to the map.
        overlay.onAdd = function() {
            let layer = d3.select(this.getPanes().overlayLayer).append("div").attr("class", "stations");

            // Draw each marker as a separate SVG element.
            // We could use a single SVG, but what size would it have?
            overlay.draw = function() {
                let projection = this.getProjection(),
                padding = 10;

                layer.selectAll("svg").remove();

                let marker = layer.selectAll("svg")
                    .data(subsample(t02, 150))
                    .each(transform) // update existing markers
                    .enter().append("svg")
                    .each(transform)
                    .attr("class", "marker");

                // this works as long as
                // 1. tmpPos1.x is before tmpPos2.x and so on
                // 2. both of the points are inside of the current view
                /*
                let tmpPos1 = latLongToPos(t02[100]);
                let tmpPos2 = latLongToPos(t02[2000]);

                let line = layer.append("svg")
                    .style("left", tmpPos1.x + "px")
                    .style("right", tmpPos1.y + "px")
                    .style("width", (tmpPos2.x - tmpPos1.x) + "px")
                    .style("height", (tmpPos2.y - tmpPos1.y) + "px")
                    .append("line")
                    .attr("x1", tmpPos1.x)
                    .attr("x2", tmpPos2.x)
                    .attr("y1", tmpPos1.y)
                    .attr("y2", tmpPos2.y)
                    .style("fill", "none")
                    .style("stroke", "steelblue");
                 */

                // Add a circle.
                marker.append("circle")
                    .attr("r", 4.5)
                    .attr("cx", padding)
                    .attr("cy", padding);

                function latLongToPos(d) {
                    let p = new google.maps.LatLng(d.posLat, d.posLon);
                    p = projection.fromLatLngToDivPixel(p);
                    p.x = p.x - padding;
                    p.y = p.y - padding;
                    return p;
                }

                function transform(d) {
                    d = latLongToPos(d);
                    return d3.select(this)
                    .style("left", d.x + "px")
                    .style("top", d.y + "px");
                }
            };
        };

        // Bind our overlay to the map…
        overlay.setMap(map);

        });

})());