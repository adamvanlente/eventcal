'use strict';

// Keep Parse available globally.
var Parse = Parse || {};

/**
 * @ngdoc function
 * @name eventcalApp.controller:CalCtrl
 * @description
 * # CalCtrl
 * Controller of the eventcalApp
 */
angular.module('eventcalApp')
  .controller('CalCtrl', ['$scope', '$routeParams', 'ParseService',
    function($scope, $routeParams, ParseService) {

      // Cal Id
      $scope.userId = $routeParams.calId.split('_')[0];
      $scope.calId = $routeParams.calId.split('_')[1];

      // Init Parse.
      ParseService.init($scope);

      // Get the calendars for the user.
      ParseService.getEvent($scope, function(response) {

        // Get the event or report an error.
        if (response.success) {
          $scope.currentEvent = response.res;

          if (!$scope.currentEvent.schedule) {
            $scope.noScheduledItems = true;
            return;
          }

          if (!$scope.currentEvent.schedule.length) {
            $scope.noScheduledItems = true;
            return;
          }

          if ($scope.currentEvent.schedule.length < 1) {
            $scope.noScheduledItems = true;
          }
        } else {
          $scope.errorFetchingCalendar = true;
        }
      });

  }]);
