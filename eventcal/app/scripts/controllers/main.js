'use strict';

// Keep Parse available globally.
var Parse = Parse || {};

// Keep Highsmith globally.
var Highsmith = Highsmith || {};

/**
 * @ngdoc function
 * @name eventcalApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the eventcalApp
 */
angular.module('eventcalApp')
  .controller('MainCtrl', function ($scope, ParseService) {

    /**
     * Some items needed for initializing.
     *
     */

    // Initially set user has events to hide 'no events exist' message.
    $scope.userHasEvents = true;

    // Init Parse.
    ParseService.init($scope);

    /*
     * User related funtions.
     *
     */

    // Sign a user in.
    $scope.signUserIn = function() {
      ParseService.signIn($scope);
    };

    // Sign the current user out.
    $scope.signUserOut = function() {
      ParseService.signOut($scope);
    };

    $scope.resetPassword = function() {
      ParseService.resetPassword($scope);
      $scope.resettingPassword = true;
    };

    /**
     * Functions for adding new events.
     *
     */

    // Show add event module.
    $scope.launchAddEventModule = function() {

      // Clear out from variables.
      $scope.newEventName = '';
      $scope.newEventDescription = '';
      $scope.newEventLocation = '';
      document.getElementById('new_event_start_date').value = '';
      document.getElementById('new_event_end_date').value = '';

      // Create calendar listeners for calendar inputs.
      $scope.setCalendars(['new_event_start_date', 'new_event_end_date']);

      // Let UI know we're adding a new event.
      $scope.addingNewEvent = true;
    };

    // Stop adding a new event.
    $scope.cancelAddingNewEvent = function() {
      $scope.addingNewEvent = false;
      $scope.currentLogoUrl = false;
      $scope.updateFilePicker('newEventImage', 'newEventImageUploader');
    };

    // Update the img/file picker input.
    $scope.updateFilePicker = function(parentId, childId) {
      var parent = document.getElementById(parentId);
      var input = document.getElementById(childId);
      parent.removeChild(input);
      var newInput = document.createElement('input');
      newInput.type = 'file';
      newInput.id = childId;
      newInput.setAttribute('onchange',
          'angular.element(this).scope().imgPickerListener(\'' + childId + '\')');
      parent.appendChild(newInput);
    };

    // Listen for changes on an image picker.
    $scope.imgPickerListener = function(id) {
      var fileUploadControl = document.getElementById(id);
      var parseFile;
      if (fileUploadControl.files.length > 0) {
        var file = fileUploadControl.files[0];
        var name = 'logo.jpg';
        parseFile = new Parse.File(name, file);
        parseFile.save().then(function() {
          if ($scope.editingWithinEditPage) {
            $scope.currentlyEditingEvent.logo = parseFile._url;
          } else {
            $scope.currentLogoUrl = parseFile._url;
          }
        });
      }
    };

    // Commit adding event.
    $scope.commitAddingNewEvent = function() {

      // Pull out start and end date.
      var startDate = document.getElementById('new_event_start_date').value || null;
      var endDate = document.getElementById('new_event_end_date').value || null;

      // Grab the logo url.
      var logoUrl = $scope.currentLogoUrl ? $scope.currentLogoUrl : '';

      // Define new event.
      var newEvent = {
        'event_name': $scope.newEventName,
        'location': $scope.newEventLocation,
        'startDate': startDate,
        'endDate': endDate,
        'description': $scope.newEventDescription,
        'customUrl': $scope.customUrl,
        'logo': logoUrl
      };

      // Push new event and reset state.
      if (!$scope.eventsList) {
        $scope.eventsList = [];
      }
      $scope.eventsList.push(newEvent);
      $scope.addingNewEvent = false;
      $scope.checkForEvents();

      // Reset image settings.
      $scope.currentLogoUrl = false;
      $scope.updateFilePicker('newEventImage', 'newEventImageUploader');
    };

    /**
     * Functions for editing entire events, eg view event details, add
     * schedule items, and see options for updating event details.
     *
     */

    // Edit an event.
    $scope.editEvent = function(item) {
      $scope.currentlyEditingEvent = item;
      $scope.editingExistingEvent = true;
      $scope.checkForScheduledItems();
    };

    // Cancel editing an event.
    $scope.cancelEditingEvent = function() {
      $scope.currentlyEditingEvent = undefined;
      $scope.editingExistingEvent = false;
      $scope.editingWithinEditPage = false;
      document.body.removeEventListener('click', $scope.updateEditingDates);
    };

    /**
     * Function for editing event details, eg update date, name, etc of event.
     *
     */

    // Edit the details of an event.
    $scope.editEventDetails = function() {
      $scope.setCalendars(['editing_start_date', 'editing_end_date']);
      document.body.addEventListener('click', $scope.updateEditingDates);
      $scope.editingWithinEditPage = true;
    };

    // Update the dates for an editing item.
    $scope.updateEditingDates = function() {
      $scope.currentlyEditingEvent.startDate =
          document.getElementById('editing_start_date').value;
      $scope.currentlyEditingEvent.endDate =
          document.getElementById('editing_end_date').value;
      setTimeout(function() {
        ParseService.saveEventsList($scope);
      }, 10);
    };

    // Finish editing an event.
    $scope.finshEditingEvent = function() {
      $scope.editingWithinEditPage = false;
      document.body.removeEventListener('click', $scope.updateEditingDates);
      $scope.updateFilePicker('editingEventImage', 'editEventImageUploader');
    };

    /**
     * Functions for adding an item to the event schedule.
     *
     */

    // Set up the UI to add a new schedule element.
    $scope.addScheduleItemToEvent = function() {

      // Clear the variables.
      $scope.eventItemName = '';
      $scope.eventItemSpeaker = '';
      $scope.eventItemSpeakerDetails = '';
      $scope.eventItemLocation = '';
      $scope.eventItemStartTime = '';
      $scope.eventItemEndTime = '';
      document.getElementById('newScheduleItemDate').value = '';

      // Add a Highsmith listener
      $scope.setCalendars(['newScheduleItemDate']);
      $scope.addingScheduleItemToEvent = true;
    };

    // Cancel adding an item to the schedule.
    $scope.cancelAddingScheduleItem = function() {
      $scope.addingScheduleItemToEvent = false;
    };

    // Create the new item for the schedule.
    $scope.createNewScheduleItem = function() {

      // Make sure a schedule exists.
      if (!$scope.currentlyEditingEvent.schedule) {
        $scope.currentlyEditingEvent.schedule = [];
      }

      // Create and push the new item.
      var newScheduleItem = {
        name: $scope.eventItemName,
        speaker: $scope.eventItemSpeaker,
        speakerDetails: $scope.eventItemSpeakerDetails,
        location: $scope.eventItemLocation,
        date: document.getElementById('newScheduleItemDate').value,
        startTime: $scope.eventItemStartTime,
        endTime: $scope.eventItemEndTime
      };
      $scope.currentlyEditingEvent.schedule.push(newScheduleItem);

      // See if there are any items on the schedule for this event.
      $scope.checkForScheduledItems();

      // Clear the UI.
      $scope.cancelAddingScheduleItem();
    };

    /**
     * Functions for editing an individual item on a schedule.
     *
     */

    // Edit an item in an event's schedule.
    $scope.editScheduleItem = function(name, date, start, end) {

      // Make sure there is an item to be edited.
      if (!$scope.currentlyEditingEvent) {
        return;
      }

      if (!$scope.currentlyEditingEvent.schedule) {
        return;
      }

      if ($scope.currentlyEditingEvent.schedule.length < 1) {
        return;
      }

      for (var i = 0; i < $scope.currentlyEditingEvent.schedule.length; i++) {
        var item = $scope.currentlyEditingEvent.schedule[i];
        if (item.name === name && item.date === date &&
            item.startTime === start && item.endTime === end) {

              // Grab the selected item.
              $scope.currentlyEditingScheduleItem = item;
        }
      }

      // Add a listener.
      document.body.addEventListener('click', $scope.updateScheduleItemDate);

      // Set a calendar.
      $scope.setCalendars(['editingScheduleItemDate']);

      // Store a global signifying that we are editing an item.
      $scope.editingScheduleItem = true;

    };

    // Update the dates for an editing item.
    $scope.updateScheduleItemDate = function() {
      $scope.currentlyEditingScheduleItem.date =
          document.getElementById('editingScheduleItemDate').value;
      setTimeout(function() {
        ParseService.saveEventsList($scope);
      }, 10);
    };

    // Finish editing an item.
    $scope.finishEditingScheduleItem = function() {
      $scope.editingScheduleItem = false;
      $scope.currentlyEditingScheduleItem = undefined;
      document.body.removeEventListener('click', $scope.updateScheduleItemDate);
    };

    // Delete an item.
    $scope.deleteEditingScheduleItem = function() {
      var schedEvent = $scope.currentlyEditingScheduleItem;
      var index;
      for (var i = 0; i < $scope.currentlyEditingEvent.schedule.length; i++) {
        var item = $scope.currentlyEditingEvent.schedule[i];
        if (item.name === schedEvent.name && item.date === schedEvent.date &&
            item.startTime === schedEvent.startTime &&
            item.endTime === schedEvent.endTime) {
              index = i;
              continue;
        }
      }
      $scope.currentlyEditingEvent.schedule.splice(index, 1);
      $scope.finishEditingScheduleItem();
    };

    /**
     * General helper functions.
     *
     */

    // Attach Highsmith calendars to each date input.
    $scope.setCalendars = function(cals) {

      // Disable default styling within options.
      var opt = {
       style: {
         disable: true
       }
      };

      // Create calendars.
      for (var i = 0; i < cals.length; i++) {
       new Highsmith(cals[i], opt);
      }
    };

    // Check if an editing event has a schedule.
    $scope.checkForScheduledItems = function() {
      if ($scope.currentlyEditingEvent) {
        if ($scope.currentlyEditingEvent.schedule &&
            $scope.currentlyEditingEvent.schedule.length > 0) {
              $scope.editingEventHasItems = true;
            } else {
              $scope.editingEventHasItems = false;
            }
      } else {
        $scope.editingEventHasItems = false;
      }
    };

    // Force the my events view back into focus.
    $scope.myEventsView = function() {
      $scope.addingNewEvent = false;
      $scope.editingExistingEvent = false;
      $scope.editingWithinEditPage = false;
      $scope.editingScheduleItem = false;
      $scope.addingScheduleItemToEvent = false;
      $scope.shareLink = undefined;
    };

    // Check and see if events exist.
    $scope.checkForEvents = function() {
      if ($scope.eventsList) {
        if ($scope.eventsList.length > 0) {
          $scope.userHasEvents = true;
        } else {
          $scope.userHasEvents = false;
        }
      } else {
        $scope.userHasEvents = false;
      }
    };

    // Share the link for an event.
    $scope.shareEvent = function(item) {
      $scope.currentlySharingEvent = item;

      if (item.vanityUrl) {
        document.getElementById('createVanityUrlButton').style.display = 'none';
        document.getElementById('shareLink').style.display = 'none';
        document.getElementById('vanityLink').style.display = 'inline-block';
        document.getElementById('vanityLink').value = 'http://evnt.link/' +
            item.vanityUrl;
        setTimeout(function() {
          document.getElementById('vanityLink').select();
        }, 100);
      } else {
        document.getElementById('createVanityUrlButton').style.display = 'block';
        document.getElementById('shareLink').style.display = 'inline-block';
        document.getElementById('vanityLink').style.display = 'none';
        setTimeout(function() {
          document.getElementById('shareLink').select();
        }, 10);
      }

      var index = $scope.eventsList.indexOf(item);
      var userId = $scope.currentUser.id;
      $scope.shareLink = 'http://eventcal.io/#/cal/' + userId + '_' + index;
      document.body.addEventListener('keyup', $scope.validateVanityUrl);
    };

    // Cancel creating vanity url.
    $scope.cancelCreatingVanityUrl = function() {
      $scope.creatingVanityUrl = false;
    };

    // Validate the vanity url as the user types.
    $scope.validateVanityUrl = function() {
      if (document.activeElement.id === 'vanityLink') {
        var url = document.activeElement.value.replace('http://evnt.link/', '');
        url = url.split(' ').join('');
        if ($scope.vanityUrls[url] && $scope.vanityUrls[url] !== $scope.shareLink) {
          while ($scope.vanityUrls[url]) {
            url = '_' + url;
          }
        }
        document.getElementById('vanityLink').value = 'http://evnt.link/' + url;
        $scope.currentlySharingEvent.vanityUrl = url;
      }
    };

    // Hide the showing event link box.
    $scope.finishSharingEventLink = function() {
      if ($scope.currentlySharingEvent.vanityUrl) {
        ParseService.validateVanityUrl($scope);
      } else {
        $scope.shareLink = undefined;
        $scope.currentlySharingEvent = undefined;
        document.body.removeEventListener('keyup', $scope.validateVanityUrl);
      }
    };

    // Create a vanity share url.
    $scope.createVanityShareLink = function() {
      if ($scope.currentlySharingEvent) {
        $scope.creatingVanityUrl = true;
      }
    };

    // Complete the process of creating a vanity url.
    $scope.finishCreatingVanityUrl = function() {
      var url = $scope.currentlySharingEvent.vanityUrl;
      if (url) {
        url = url.split(' ').join('');
        if ($scope.vanityUrls[url] && $scope.vanityUrls[url] !== $scope.shareLink) {
          while ($scope.vanityUrls[url]) {
            url = '_' + url;
          }
        }
        $scope.currentlySharingEvent.vanityUrl = url;
        document.getElementById('createVanityUrlButton').style.display = 'none';
        document.getElementById('shareLink').style.display = 'none';
        document.getElementById('vanityLink').style.display = 'inline-block';
        document.getElementById('vanityLink').value = 'http://evnt.link/' +
            url;
      }
      $scope.creatingVanityUrl = false;
    };

    /**
     * Watch for changes.
     *
     */

    // Watch events object for changes.
    $scope.$watch('eventsList', function() {
      ParseService.saveEventsList($scope);
    }, true);

  });
