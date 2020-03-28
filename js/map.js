function mapplot() {

    const UPDATE_MAP_STRING = "updateMap";

    let width = 1.0,
        height = 1.0,
        mapStrokeWeight= 2,
        selectionDispatcher;

    let updateMapDispatcher = d3.dispatch(UPDATE_MAP_STRING);

    function chart(mapSelector, sliderSelector, data, pathSegments) {

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
        /*
        d3.select(mapSelector)
            .attr(
                "style", "width: " + width * 100 +
                "%; height: " + height * 100 +
                "%; float: left; display: inline-block;"
            );


         */
        // setup google map
        let t02Subset = t02;
        let pathSegmentsSubset = pathSegments;
        let pathMarkerData = getErrorMarkersForSegments(pathSegmentsSubset);
        let pathMarkers = [];
        let startPoint = 0,
            endPoint = t02.length - 1;

        let map = new google.maps.Map(d3.select(mapSelector).node(), {
            zoom: 15,
            center: new google.maps.LatLng(avgLat, avgLon),
            mapTypeId: google.maps.MapTypeId.HYBRID
        });

        // get coordinates for map
        let coordinates = objectsToGMapsCoordinates(t02Subset);

        // setup a popup for on hover
        Popup = createPopupClass();
        let popup = null;
        let popupContent = d3.select(mapSelector).append("div").attr("id", "map-on-hover");

        let flightPaths = [];

        // selection variables
        let selectStartIdx = null,
            selectEndIdx = null;

        // start and end markers
        let startMarker = null;
        let endMarker = null;

        // setup slider
        let slider = d3.sliderBottom()
            .min(0.0)
            .max(1.0)
            .width(800) // TODO: should be relative
            .tickFormat(d3.format('.2'))
            .ticks(5)
            .default([0.0, 1.0])
            .fill("#2196f3")
            .on('onchange', function(val) {

                // get new path data
                startPoint = Math.round(val[0] * t02.length);
                endPoint = Math.round(val[1] * t02.length);

                t02Subset = t02.slice(startPoint, endPoint);
                pathSegmentsSubset = moveSegments(pathSegments, startPoint);
                coordinates = objectsToGMapsCoordinates(t02Subset);
                pathMarkerData = getErrorMarkersForSegments(pathSegmentsSubset);

                // update map
                updateMapDispatcher.call(UPDATE_MAP_STRING);

                // propagate selection
                let dispatchString = Object.getOwnPropertyNames(selectionDispatcher._)[0];
                selectionDispatcher.call(dispatchString, this, [startPoint, endPoint]);

            });

        let sliderGroup = d3.select(sliderSelector)
            .attr("style", "margin-left: 10%;")
            //.attr("hidden", null)
            .append("svg")
            .attr("width", 1000) // TODO: should be relative
            .attr("height", 100)
            .append("g")
            .attr("transform", "translate(30,30)");

        sliderGroup.call(slider);

        // add slider to map
        map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(d3.select(sliderSelector).node());

        // setup map update function
        updateMapDispatcher.on(UPDATE_MAP_STRING, function(d) {

            // make sure slider is shown
            d3.select(sliderSelector).attr("hidden", null);

            // remove old path and add a new one
            removeFromMap(flightPaths);
            flightPaths = addPath(coordinates, map, pathSegmentsSubset);

            // add listeners for on hover
            for (i = 0; i < flightPaths.length; i++) {
                flightPaths[i].addListener('mouseover', function(d) {
                    updateMapPopupContent(d, popupContent);
                    popup = updateMapPopup(d, popup, popupContent);
                });

                flightPaths[i].addListener('mouseout', function(d) {
                    deleteMapPopup(popup);
                });

                flightPaths[i].addListener("click", updateSelection);
            }

            // remove end marker and add a new one
            removeFromMap([startMarker, endMarker]);
            startMarker = addMarker(coordinates[0], "S", map);
            endMarker = addMarker(coordinates[coordinates.length - 1], "E", map);

            removeFromMap(pathMarkers);
            pathMarkers = [];
            pathMarkerData.forEach(marker => {

                let text;

                if (marker.type === SEGMENT_GPS_ERROR)
                    text = "GS";
                else if (marker.type === SEGMENT_SENSOR_ERROR)
                    text = "SE";
                else
                    text = "LI";

                let tmpMarker = addMarker(coordinates[marker.index], text, map);

                tmpMarker.addListener("click", function() {

                    // get new path data
                    endPoint = pathSegmentsSubset[marker.segmentIndex].end + startPoint + 20;
                    startPoint = pathSegmentsSubset[marker.segmentIndex].start + startPoint - 20;

                    if (startPoint < 0)
                        startPoint = 0;
                    if (endPoint > t02.length - 1)
                        endPoint = t02.length - 1;

                    // set slider value, which triggers map update
                    slider.value([startPoint / t02.length, endPoint / t02.length]);

                });

                pathMarkers.push(tmpMarker);
            });

        });

        // update map
        updateMapDispatcher.call(UPDATE_MAP_STRING);

        function addPath(coordinates, map, pathSegments) {

            let paths = [];

            pathSegments.forEach(segment => {
                let coords = coordinates.slice(segment.start, segment.end + 1);
                let color;

                if (segment.type === SEGMENT_NORMAL) {
                    color = "#19ff58";
                } else if (segment.type === SEGMENT_SENSOR_ERROR) {
                    color = "#fffe3c";
                } else if (segment.type === SEGMENT_GPS_ERROR) {
                    color = "#ffb21d";
                } else {
                    color = "#ff341b";
                }

                let path = new google.maps.Polyline({
                    path: coords,
                    geodesic: true,
                    strokeColor: color,
                    strokeOpacity: 1.0,
                    strokeWeight: mapStrokeWeight
                });
                path.setMap(map);

                paths.push(path);

            });

            return paths;
        }

        function removeFromMap(elements) {
            for (i = 0; i < elements.length; i++) {
                if (elements[i] !== null) {
                    elements[i].setMap(null);
                }
            }
        }

        function addMarker(position, text, map) {
            return new google.maps.Marker({
                position: position,
                label: text,
                map: map
            });
        }

        function updateMapPopupContent(d, popupContent) {
            let lat = d.latLng.lat(), lon = d.latLng.lng();
            let index = findClosestPoint(lon, lat, t02Subset);

            let altitude = t02Subset[index].altitude,
                airSpeed = t02Subset[index].airSpeed;

            popupContent.html(
                altitude.toFixed(2) + " m" +
                "<br/>" + airSpeed.toFixed(2) + " km/h"
            );
        }

        function updateMapPopup(d, popup, popupContent) {
            let lat = d.latLng.lat(), lon = d.latLng.lng();

            deleteMapPopup(popup);

            let newPopup = new Popup(new google.maps.LatLng(lat, lon), popupContent.node());
            newPopup.setMap(map);

            return newPopup;
        }

        function deleteMapPopup(popup) {
            if (popup !== null) {
                popup.setMap(null);
            }
        }

        function findClosestPoint(lon, lat, data) {

            let dist = null;
            let idx = null;

            for (i = 0; i < data.length;i++) {

                let tmpDist = Math.abs(lon - data[i].posLon) + Math.abs(lat - data[i].posLat);

                if (dist === null) {
                    dist = tmpDist;
                    idx = i;
                } else if (tmpDist < dist) {
                    dist = tmpDist;
                    idx = i;
                }

            }

            return idx;
        }

        function updateSelection(d) {
            let lat = d.latLng.lat(), lon = d.latLng.lng();
            let index = findClosestPoint(lon, lat, t02Subset);

            if (selectEndIdx !== null) {
                // reset previous selection
                selectStartIdx = null;
                selectEndIdx = null;
                updateMapDispatcher.call(UPDATE_MAP_STRING);
            }

            if (selectStartIdx !== null) {
                // selection completed
                selectEndIdx = index;

                if (selectStartIdx > selectEndIdx) {
                    let tmp = selectEndIdx;
                    selectEndIdx = selectStartIdx;
                    selectStartIdx = tmp;
                }

                // update map
                updateMapDispatcher.call(UPDATE_MAP_STRING);

            } else {
                // selection started
                selectStartIdx = index;
            }
        }

        function moveSegments(segments, startIdx) {

            let newSegments = [];

            segments.forEach(segment => {

                let segmentStart = segment.start - startIdx;
                let segmentEnd = segment.end - startIdx;

                if (segmentEnd > 0) {
                    if (segmentStart < 0) {
                        segmentStart = 0;
                    }

                    newSegments.push({
                        start: segmentStart,
                        end: segmentEnd,
                        type: segment.type
                    });
                }

            });

            return newSegments;

        }

        function getErrorMarkersForSegments(segments) {

            let markers = [];

            segments.forEach((segment, index) => {
                if (segment.type !== SEGMENT_NORMAL) {
                    let middleIndex = Math.round((segment.end - segment.start) / 2) + segment.start;
                    markers.push({
                        index: middleIndex,
                        type: segment.type,
                        segmentIndex: index
                    });
                }
            });

            return markers;

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

    chart.mapStrokeWeight = function(_) {
        if (!arguments.length) return mapStrokeWeight;
        mapStrokeWeight = _;
        return chart;
    };

    chart.selectionDispatcher = function(_) {
        if (!arguments.length) return selectionDispatcher;
        selectionDispatcher = _;
        return chart;
    };

    return chart;

}