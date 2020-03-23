// slider: https://bl.ocks.org/johnwalley/e1d256b81e51da68f7feb632a53c3518
// https://developers.google.com/maps/documentation/javascript/examples/polyline-simple
// https://developers.google.com/maps/documentation/javascript/examples/polyline-remove

function mapplot() {

    let width = 1.0, height = 1.0, maxPoints = 100;

    function chart(mapSelector, sliderSelector, data) {

        // get the average longitude and latitude; this will be our starting point for the map *for now*
        let t02 = data;
        let lat = [], lon = [];

        for (i = 0; i < t02.length; i++) {
            lat.push(t02[i].posLat);
            lon.push(t02[i].posLon);
        }

        let avgLat = (lat.reduce((prev, cur) => cur += prev)) / lat.length;
        let avgLon = (lon.reduce((prev, cur) => cur += prev)) / lon.length;

        // modify map styles
        d3.select(mapSelector)
            .attr(
                "style", "width: " + width * 100 +
                "%; height: " + height * 100 +
                "%; float: left; display: inline-block;"
            );

        // subsample data and setup google map
        let t02Subset = subsample(t02, maxPoints);

        let map = new google.maps.Map(d3.select(mapSelector).node(), {
            zoom: 15,
            center: new google.maps.LatLng(avgLat, avgLon),
            mapTypeId: google.maps.MapTypeId.HYBRID
        });

        // add path to the map
        let coordinates = objectsToGMapsCoordinates(t02Subset);
        let flightPath = addPath(coordinates, map);

        // add markers for start and end
        let startMarker = addMarker(coordinates[0], "S", map);
        let endMarker = addMarker(coordinates[coordinates.length - 1], "E", map);

        // setup slider
        let slider = d3.sliderBottom()
            .min(0.0)
            .max(1.0)
            .width(300)
            .tickFormat(d3.format('.2'))
            .ticks(5)
            .default(1.0)
            .on('onchange', function(val) {

                let tmpNumPoints = Math.round(val * t02.length);
                let tmpT02 = t02.slice(0, tmpNumPoints);
                let tmpMaxPoints = Math.min(tmpNumPoints, maxPoints);

                t02Subset = subsample(tmpT02, tmpMaxPoints);
                coordinates = objectsToGMapsCoordinates(t02Subset);

                removeFromMap(flightPath);
                flightPath = addPath(coordinates, map);

                removeFromMap(endMarker);
                endMarker = addMarker(coordinates[coordinates.length - 1], "E", map);

            });

        let sliderGroup = d3.select(sliderSelector)
            .append("svg")
            .attr("width", 500)
            .attr("height", 100)
            .append("g")
            .attr("transform", "translate(30,30)");

        sliderGroup.call(slider);

    }

    function addPath(coordinates, map) {

        let flightPath = new google.maps.Polyline({
            path: coordinates,
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2
        });

        flightPath.setMap(map);
        return flightPath

    }

    function removeFromMap(element) {
        element.setMap(null);
    }

    function addMarker(position, text, map) {
        return new google.maps.Marker({
            position: position,
            label: text,
            map: map
        });
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