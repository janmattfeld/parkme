'use strict';

// Declare app level module which depends on views, and components
var app = angular.module('playerApp', [
    'playerControllers',
    'ngMaterial',
    'ngAnimate'
]);

app.config(['$mdThemingProvider', function($mdThemingProvider) {
  $mdThemingProvider.theme('default')
      .primaryPalette('indigo')
      .accentPalette('red');
}]);
