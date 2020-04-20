function mapplot() {

    const UPDATE_MAP_STRING = "updateMap";
    const SLIDER_WIDTH_FRACTION = 0.6;
    const SLIDER_MARGIN = 200;
    const LEGEND_TEXT = "<b>S</b>: start<br><b>E</b>: end<br><b>LI</b>: link error<br><b>GS</b>: GPS error<br><b>SE</b>: sensor error<br><i>(Click to hide)</i>";
    const SHOW_LEGEND_TEXT = "Show Legend";

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

        for (let i = 0; i < t02.length; i++) {
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
        let mapLegendShown = false;

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

        function MapLegend(legendDiv) {

            // Set CSS for the control border.
            let controlUI = document.createElement("div");
            controlUI.style.backgroundColor = "rgba(255, 255, 255, 1.0)";
            controlUI.style.border = "2px solid #fff";
            controlUI.style.borderRadius = "3px";
            controlUI.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
            controlUI.style.cursor = "pointer";
            controlUI.style.marginBottom = "22px";
            controlUI.style.textAlign = "center";
            controlUI.title = "";
            legendDiv.appendChild(controlUI);

            // Set CSS for the control interior.
            let controlText = document.createElement("div");
            controlText.style.color = "rgb(25,25,25)";
            controlText.style.fontFamily = "Roboto,Arial,sans-serif";
            controlText.style.fontSize = "16px";
            controlText.style.lineHeight = "38px";
            controlText.style.paddingLeft = "5px";
            controlText.style.paddingRight = "5px";
            controlText.style.textAlign = "left";
            controlText.innerHTML = SHOW_LEGEND_TEXT;
            controlUI.appendChild(controlText);

            // Setup the click event listeners
            controlUI.addEventListener("click", function() {
                if (mapLegendShown === true) {
                    controlText.innerHTML = SHOW_LEGEND_TEXT;
                } else {
                    controlText.innerHTML = LEGEND_TEXT;
                }
                mapLegendShown = !mapLegendShown;
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

        let mapLegendDiv = document.createElement("div");
        let mapLegend = new MapLegend(mapLegendDiv);
        mapLegendDiv.index = 2;

        map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(resetControlDiv);
        map.controls[google.maps.ControlPosition.LEFT_TOP].push(mapLegendDiv);

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
            // add path segments to the map
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
            // remove path segments from the map
            for (let i = 0; i < elements.length; i++) {
                if (elements[i] !== null) {
                    elements[i].setMap(null);
                }
            }
        }

        function addMarker(position, text, map) {
            // add markers for start, end and errors
            let marker = new google.maps.Marker({
                position: position,
                label: text,
                map: map
            });
            marker.addListener("mouseover", () => {
                deleteMapPopup(popup);
            });
            return marker;
        }

        function updateMapPopupContent(d, popupContent) {
            // update the text in the popup box that is shown on mouseover
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
            // update popups
            let lat = d.latLng.lat(), lon = d.latLng.lng();

            deleteMapPopup(popup);

            let newPopup = new Popup(new google.maps.LatLng(lat, lon), popupContent.node());
            newPopup.setMap(map);

            return newPopup;
        }

        function deleteMapPopup(popup) {
            // delete popups
            if (popup !== null) {
                popup.setMap(null);
            }
        }

        function findClosestPoint(lon, lat, data) {
            // find the closest point to a particular latitude and longitude
            let dist = null;
            let idx = null;

            for (let i = 0; i < data.length;i++) {

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
            // update segments based on the current selection
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
            // get error markers from segment data
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
        // filter various types of messages
        let startIdx = null,
            endIdx = null;

        for (let i = 0; i < t02.length; i++) {
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