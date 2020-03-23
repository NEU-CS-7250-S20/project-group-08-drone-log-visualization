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

        let t02Subset = subsample(t02, maxPoints);

        // setup google map
        let map = new google.maps.Map(d3.select(selector).node(), {
            zoom: 16,
            center: new google.maps.LatLng(avgLat, avgLon),
            mapTypeId: google.maps.MapTypeId.HYBRID
        });

        var flightPlanCoordinates = objectsToGMapsCoordinates(t02Subset);

        var flightPath = new google.maps.Polyline({
          path: flightPlanCoordinates,
          geodesic: true,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 2
        });

        flightPath.setMap(map);

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

                flightPath.setMap(null);

                flightPlanCoordinates = objectsToGMapsCoordinates(t02Subset);

                flightPath = new google.maps.Polyline({
                  path: flightPlanCoordinates,
                  geodesic: true,
                  strokeColor: '#FF0000',
                  strokeOpacity: 1.0,
                  strokeWeight: 2
                });

                flightPath.setMap(map);
            });


        var gSimple = d3.select('div#slider-simple')
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