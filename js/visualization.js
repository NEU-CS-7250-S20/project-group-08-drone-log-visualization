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

                let marker = layer.selectAll("svg")
                    .data(subsample(t02, 150))
                    .each(transform) // update existing markers
                    .enter().append("svg")
                    .each(transform)
                    .attr("class", "marker");

                // Add a circle.
                marker.append("circle")
                    .attr("r", 4.5)
                    .attr("cx", padding)
                    .attr("cy", padding);

                // Add a label.
                marker.append("text")
                    .attr("x", padding + 7)
                    .attr("y", padding)
                    .attr("dy", ".31em")
                    .text(function(d) { return d.key; });

                function transform(d) {
                    d = new google.maps.LatLng(d.posLat, d.posLon);
                    d = projection.fromLatLngToDivPixel(d);
                    return d3.select(this)
                    .style("left", (d.x - padding) + "px")
                    .style("top", (d.y - padding) + "px");
                }
            };
        };

        // Bind our overlay to the map…
        overlay.setMap(map);

        });

})());