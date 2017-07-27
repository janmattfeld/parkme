'use strict';

/* Controllers */


var playerControllers = angular.module('playerControllers', ['ngMaterial']);


playerControllers.controller('mainController', ['$scope', '$timeout', '$mdSidenav', '$mdDialog', '$mdUtil', '$log', '$http', function ($scope, $timeout, $mdSidenav, $mdDialog, $mdUtil, $log, $http) {

    var self = this;

    // Side panel logic
    $scope.isSidenavOpen = false;
    $scope.toggleLeft = function () {
        $mdSidenav('left').toggle()
    };

    // Map data
    $scope.myPosition = null;
    $scope.myPositionMarker = null;
    $scope.sites = [];
    $scope.siteMarkers = [];
    $scope.selectedSite = null;
    $scope.stations = null;

    // Initialize Map
    var map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    });

    // Prepare Geocoding to get parking space addresses
    var geocodeService = L.esri.Geocoding.geocodeService();

    // Prepare API Token
    L.MakiMarkers.accessToken = "pk.eyJ1IjoiamFubWF0dGZlbGQiLCJhIjoiY2o1bXR2bDNiMzhsNDMybzIzcG0zdzNlaSJ9.GtZwP41YKdXl-o4bFjAxyw";

    // Add tile layer
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + L.MakiMarkers.accessToken, {id: 'mapbox.streets'}).addTo(map);

    // Find user's position and zoom to closest parking space
    $scope.locateMe = function () {
        // Not available over insecure HTTP anymore
        // map.locate({setView: true});
        var position = {lat:52.5, lng:13.05}
        map.flyTo(position);
        $scope.myPosition = position;
        _addMyLocationMarker();
        _showClosestParkingSpace();
    };
    map.on('locationfound', function (oEvent) {
        $scope.myPosition = oEvent.latlng;
        _addMyLocationMarker();
        _showClosestParkingSpace();
    });

    var _addMyLocationMarker = function () {

        // Remove old marker
        if (map && map.removeControl && $scope.myPositionMarker) {
            map.removeControl($scope.myPositionMarker);
        }
        if ($scope.router) {
            map.removeControl($scope.router);
        }

        // Create marker for current position
        $scope.myPositionMarker = L.marker($scope.myPosition, {
            "riseOnHover": true,
            "title": "You are here"
        }).addTo(map);
    };

    var _showClosestParkingSpace = function () {

        // Find nearest parking space to current position
        var closestSite = L.GeometryUtil.closestLayer(map, $scope.siteMarkers, $scope.myPosition).latlng;

        // Zoom map on current position and nearest parking space
        map.flyToBounds(L.latLngBounds([closestSite, $scope.myPosition]), {padding: L.point(20, 20)});
    };

    var _addStations = function (aStations) {
        $scope.stations = aStations.data.results;
    };

    var _addSiteMarkers = function (aSites) {

        $scope.sites = aSites;

        angular.forEach(aSites.data.results, function (site) {

            // Do not add closed parking spaces
            if (site.parkraumIsAusserBetrieb) return;

            // Indicate type of parking with icon
            var icon = L.MakiMarkers.icon({icon: "parking", color: "#F01414", size: "l"});
            if (site.parkraumParkart === "Parkhaus" || site.parkraumParkart === "Tiefgarage") {
                icon = L.MakiMarkers.icon({icon: "parking-garage", color: "#F01414", size: "l"});
            }

            // Find a title for the parking space
            var title = site.parkraumBahnhofName;
            if (site.parkraumName !== "") {
                title = site.parkraumName;
            }
            if (site.parkraumDisplayName !== "") {
                title = site.parkraumDisplayName;
            }

            // Find type and directions
            if (site.parkraumZufahrt !== "") {
                site.hinweise = "Zufahrt " + site.parkraumZufahrt;
            }

            // Costs
            if (site.tarif30Min !== "") {
                site.tarif30MinText = "30 Min: " + site.tarif30Min;
            }
            if (site.tarif1Std !== "") {
                site.tarif1StdLabel = site.tarif1Std + " (Stunde)";
                site.tarif1StdText = "Stunde: " + site.tarif1Std;
            }
            if (site.tarif1Tag !== "") {
                site.tarif1TagText = "Tag: " + site.tarif1Tag;
            }

            // Who owns the space?
            if (site.parkraumBetreiber !== "") {
                site.parkraumBetreiber = "Betreiber: " + site.parkraumBetreiber;
            }

            // Create a marker for the parking space
            var marker = L.marker([site.parkraumGeoLatitude, site.parkraumGeoLongitude], {
                "riseOnHover": true,
                "title": title,
                "icon": icon
            });
            $scope.siteMarkers.push(marker);
            L.layerGroup($scope.siteMarkers).addTo(map);

            // Bind the onclick event
            // Show parking space details in sidenav
            marker.on('click', function () {
                $scope.selectedSite = site;
                $scope.selectedSite.title = title;

                // Remove dialogs of old site
                if ($scope.dialog) {
                    $mdDialog.hide($scope.dialog)
                }

                // Try to get parking space occupancy
                try {
                    $http.get("http://opendata.dbbahnpark.info/api/beta/occupancy/" + site.parkraumId).then(function (occupancy) {
                        $scope.selectedSite.freeSpace = "Freie Plätze: " + occupancy.data.allocation.text;
                    });
                } catch (error) {
                    // No occupancy available
                }

                // Load a photo of the station to display in the sidenav
                var flickrAPI = "http://api.flickr.com/services/feeds/photos_public.gne"
                    + "?jsoncallback=JSON_CALLBACK"
                    + "&tags=" + encodeURIComponent(site.parkraumBahnhofName)
                    + "&tagmode=" + "any"
                    + "&format=json";

                // Flickr Alternative aus https://github.com/dbopendata/bahnhofsquartett
                // "http://www.deutschlands-bahnhoefe.org/sites/default/files/previewbig/" + site.parkraumBahnhofNummer + "_1.jpg";

                // Send AJAX query to Flickr API
                $http.jsonp(flickrAPI)
                    .success(function (data) {
                            $scope.selectedSite.picture = data.items[0]['media']['m'].replace("_m", "_b");
                        }
                    );

                // Remove previous Routes
                if ($scope.router) {
                    map.removeControl($scope.router);
                }

                $scope.findRoute = function () {
                    // Remove previous Routes
                    if ($scope.router) {
                        map.removeControl($scope.router);
                    }
                    // Find Route to selected Parking Space
                    $scope.router = L.Routing.control({
                        waypoints: [
                            $scope.myPosition,
                            [site.parkraumGeoLatitude, site.parkraumGeoLongitude]
                        ],
                        router: L.Routing.mapbox(L.MakiMarkers.accessToken),
                        show: true
                    }).addTo(map);
                    // Close Sidenav to make space for route directions
                    if ($scope.isSidenavOpen) {
                        $scope.toggleLeft();
                    }
                };

                // Find station id for departure api
                angular.forEach($scope.stations, function (station) {
                    if (site.parkraumBahnhofNummer == station.bahnhofsNummer) {
                        site.station_id = station.evaNummer;
                    }
                });

                // Get departure plan for station
                if (site.station_id) {
                    $http.get("http://" + window.location.host + "/departures/get?station_id=" + site.station_id)
                        .success(function (departures) {
                                site.departures = departures.slice(0, 5);
                                ;
                            }
                        );
                }

                // Find address for selected parking space
                // Esri Alternative: https://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452
                geocodeService.reverse().latlng([site.parkraumGeoLatitude, site.parkraumGeoLongitude]).run(function (error, result) {
                    $scope.selectedSite.address = result.address.Address + ", " + result.address.Postal + " " + result.address.City;
                    $scope.$apply();
                });

                // Open sidenav to show details
                if (!$scope.isSidenavOpen) {
                    $scope.toggleLeft();
                }
                // Show price dialog
                $scope.showPriceDialog = function (event) {
                    $scope.dialog = $mdDialog.show({
                        controller: DialogController,
                        parent: angular.element(document.querySelector('#left')),
                        title: 'Preisübersicht',
                        templateUrl: 'templates/DIALOG.PRICE.TEMPL.html',
                        targetEvent: event,
                        clickOutsideToClose: true,
                        locals: {
                            site: $scope.selectedSite
                        }
                    });
                };

                // Show departure dialog
                $scope.showDepartureDialog = function (event) {
                    $scope.dialog = $mdDialog.show({
                        controller: DialogController,
                        parent: angular.element(document.querySelector('#left')),
                        title: 'Preisübersicht',
                        templateUrl: 'templates/DIALOG.DEPARTURE.TEMPL.html',
                        targetEvent: event,
                        clickOutsideToClose: true,
                        locals: {
                            site: $scope.selectedSite
                        }
                    });
                };
            })
        });

        function DialogController($scope, $mdDialog, site) {
            $scope.site = site;
            $scope.closeDialog = function () {
                $mdDialog.hide();
            };
        }

        // Initialize App
        $scope.locateMe();
    };

    // Load parking sites and add to map
    // TODO Load static data from DB API
    $http.get('./data/stations.json').then(_addStations).then(function () {
        $http.get('./data/sites.json').then(_addSiteMarkers);
    });
}])
;
