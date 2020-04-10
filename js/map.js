function mapplot() {

    const UPDATE_MAP_STRING = "updateMap";
    const SLIDER_WIDTH_FRACTION = 0.6;
    const SLIDER_MARGIN = 200;

    let mapStrokeWeight= 2,
        selectionDispatcher,
        slider,
        minTime,
        timeLength,
        startPoint,
        endPoint,
        t02;

    let updateMapDispatcher = d3.dispatch(UPDATE_MAP_STRING);

    function chart(mapSelector, sliderSelector, data, pathSegments) {

        // get the average longitude and latitude; this will be our starting point for the map *for now*
        t02 = data;
        let lat = [], lon = [];

        for (i = 0; i < t02.length; i++) {
            lat.push(t02[i].posLat);
            lon.push(t02[i].posLon);
        }

        let avgLat = (lat.reduce((prev, cur) => cur += prev)) / lat.length;
        let avgLon = (lon.reduce((prev, cur) => cur += prev)) / lon.length;

        // setup google map
        let t02Subset = t02;
        minTime = t02[0].time;
        let maxTime = t02[t02.length - 1].time;
        timeLength = maxTime - minTime;
        let pathSegmentsSubset = pathSegments;
        let pathMarkerData = getErrorMarkersForSegments(pathSegmentsSubset);
        let pathMarkers = [];
        startPoint = 0;
        endPoint = t02.length - 1;

        function ResetControl(controlDiv) {

            // Set CSS for the control border.
            let controlUI = document.createElement("div");
            controlUI.style.backgroundColor = "#fff";
            controlUI.style.border = "2px solid #fff";
            controlUI.style.borderRadius = "3px";
            controlUI.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
            controlUI.style.cursor = "pointer";
            controlUI.style.marginBottom = "22px";
            controlUI.style.textAlign = "center";
            controlUI.title = "Click to reset selection";
            controlDiv.appendChild(controlUI);

            // Set CSS for the control interior.
            let controlText = document.createElement("div");
            controlText.style.color = "rgb(25,25,25)";
            controlText.style.fontFamily = "Roboto,Arial,sans-serif";
            controlText.style.fontSize = "16px";
            controlText.style.lineHeight = "38px";
            controlText.style.paddingLeft = "5px";
            controlText.style.paddingRight = "5px";
            controlText.innerHTML = "Reset Selection";
            controlUI.appendChild(controlText);

            // Setup the click event listeners
            controlUI.addEventListener("click", function() {
                let dispatchString = Object.getOwnPropertyNames(selectionDispatcher._)[0];
                selectionDispatcher.call(dispatchString, this, [t02[0].time, t02[t02.length-1].time]);
            });

        }

        let map = new google.maps.Map(d3.select(mapSelector).node(), {
            zoom: 15,
            streetViewControl: false,
            center: new google.maps.LatLng(avgLat, avgLon),
            mapTypeId: google.maps.MapTypeId.HYBRID
        });

        let resetControlDiv = document.createElement("div");
        let resetControl = new ResetControl(resetControlDiv);
        resetControlDiv.index = 1;

        map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(resetControlDiv);

        // get coordinates for map
        let coordinates = objectsToGMapsCoordinates(t02Subset);

        // setup a popup for on hover
        Popup = createPopupClass();
        let popup = null;
        let popupContent = d3.select(mapSelector).append("div").attr("id", "map-on-hover");

        let flightPaths = [];

        // start and end markers
        let startMarker = null;
        let endMarker = null;

        // setup slider
        let width = d3.select(mapSelector).node().getBoundingClientRect().width;

        slider = d3.sliderBottom()
            .min(minTime)
            .max(maxTime)
            .width(Math.round(width * SLIDER_WIDTH_FRACTION))
            //.tickFormat(d3.format(".2"))
            .ticks(10)
            .default([minTime, maxTime])
            .fill("#2196f3")
            .on("onchange", function(val) {

                // propagate selection
                let dispatchString = Object.getOwnPropertyNames(selectionDispatcher._)[0];
                selectionDispatcher.call(dispatchString, this, [val[0], val[1]]);

            });

        let sliderSvg = d3.select(sliderSelector)
            .attr("style", "margin-left: 10%;")
            //.attr("hidden", null)
            .append("svg")
            .attr("width", Math.round(width * SLIDER_WIDTH_FRACTION) + SLIDER_MARGIN)
            .attr("height", 100);

        let sliderGroup = sliderSvg
            .append("g")
            .attr("transform", "translate(30,30)");

        sliderGroup.call(slider);

        d3.select(window).on("resize", function() {
            width = d3.select(mapSelector).node().getBoundingClientRect().width;
            slider.width(Math.round(width * SLIDER_WIDTH_FRACTION));
            sliderSvg.attr("width", Math.round(width * SLIDER_WIDTH_FRACTION) + SLIDER_MARGIN);
            sliderGroup.call(slider);
        });

        // add slider to map
        map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(d3.select(sliderSelector).node());

        // setup map update function
        updateMapDispatcher.on(UPDATE_MAP_STRING, function(d) {

            // make sure slider is shown
            d3.select(sliderSelector).attr("hidden", null);

            // get data
            t02Subset = t02.slice(startPoint, endPoint);
            pathSegmentsSubset = moveSegments(pathSegments, startPoint);
            coordinates = objectsToGMapsCoordinates(t02Subset);
            pathMarkerData = getErrorMarkersForSegments(pathSegmentsSubset);

            // remove old path and add a new one
            removeFromMap(flightPaths);
            flightPaths = addPath(coordinates, map, pathSegmentsSubset);

            // add listeners for on hover
            for (let i = 0; i < flightPaths.length; i++) {
                flightPaths[i].addListener("mouseover", function(d) {
                    updateMapPopupContent(d, popupContent);
                    popup = updateMapPopup(d, popup, popupContent);
                });

                flightPaths[i].addListener("mouseout", function(d) {
                    deleteMapPopup(popup);
                });
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
                    slider.value([t02[startPoint].time, t02[endPoint].time]);

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

    chart.updateSelection = function(selectedData) {

        if (!arguments.length) return;

        let startTime, endTime;

        if (selectedData === null) {
            startTime = 0;
            endTime = timeLength;
        } else {
            startTime = selectedData[0];
            endTime = selectedData[1];
        }

        slider.silentValue([startTime, endTime]);

        let tmp = findIndexOfStartAndEndTime(startTime, endTime);
        startPoint = tmp[0];
        endPoint = tmp[1];

        // update map
        updateMapDispatcher.call(UPDATE_MAP_STRING);

    };

    function findIndexOfStartAndEndTime(startTime, endTime) {

        let startIdx = null,
            endIdx = null;

        for (i = 0; i < t02.length; i++) {
            if (t02[i].time > startTime && startIdx === null) {
                startIdx = i;
            } else if (t02[i].time > endTime && endIdx === null) {
                endIdx = i;
            }
        }

        if (startIdx === null) {
            startIdx = t02.length - 2;
        }

        if (endIdx === null) {
            endIdx = t02.length - 1;
        }

        return [startIdx, endIdx];

    }

    return chart;

}