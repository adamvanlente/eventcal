'use strict';

// Keep Parse available globally.
var Parse = Parse || {};

/**
 * @ngdoc overview
 * @name eventcalApp
 * @description
 * # eventcalApp
 *
 * Main module of the application.
 */
angular
  .module('eventcalApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ])
  .factory('ParseService',function() {

    // Initialize Parse
    var _init = function(scope) {
      if (!scope.parseInitialized) {
        Parse.initialize('l69F2ZCIy5Hj2RPqDOpnoFJXDRFUkJx3gCYFZcY1',
                         'vGSDFW3BkDJ5c7bK3Y8hWQdoAOjTDbiFlLHrdAfo');
        scope.parseInitialized = true;
      }
      _fetchAllVanityUrls(scope);
      _checkForUser(scope);
    };

    // Check for an existing user.
    var _checkForUser = function(scope) {
      if (Parse.User.current()) {
        scope.currentUser = Parse.User.current();
      } else {
        scope.currentUser = false;
      }
      scope.signingIn = false;
      _getCurrentUserEvents(scope);
    };

    // Sign a Parse user in.
    var _signIn = function(scope) {
      scope.errorLoginMessage = false;
      Parse.User.logIn(scope.username, scope.password, {
        success: function() {
          scope.signingIn = 'logging you in...';
          _storeUserEmail(scope.username);
          _checkForUser(scope);
          _getCurrentUserEvents(scope);
        }, error: function(user, error) {
          _handleErrorLogin(scope);
        }
      });
    };

    // Handle bad login.  Either user exists (bad password) or we need to create
    // them a new account.
    var _handleErrorLogin = function(scope) {
      var UserEmailRecord = Parse.Object.extend('UserEmailRecord');
      var query = new Parse.Query(UserEmailRecord);
      query.matches('email', scope.username);
      query.find({
        success: function(results) {

          // Store this user's email if it doesn't exist.
          if (results.length === 0) {
            _createNewUser(scope);
          } else {
            scope.errorLoginMessage = 'Incorrect password.  Please try again';
            scope.$apply();
          }
        }
      });
    };

    // Create a new user.
    var _createNewUser = function(scope) {
      var user = new Parse.User();
      user.set('username', scope.username);
      user.set('email', scope.username);
      user.set('password', scope.password);

      user.signUp(null, {
        success: function(user) {
          scope.signingIn = 'signing you up...';
          _storeUserEmail(scope.username);
          _checkForUser(scope);
          _getCurrentUserEvents(scope);
          scope.$apply();
        },
        error: function(error, user) {
          console.log(error, user);
        }
      });
    };

    // Reset the user's password.
    var _resetPassword = function(scope) {
      Parse.User.requestPasswordReset(scope.username, {
        success: function() {
          // reset password email has been sent.
          console.log('reset email sent');
        },
        error: function(error, other) {
          console.log(error, other);
        }
      });
    };

    // Store the user email address.
    var _storeUserEmail = function(username) {
      var UserEmailRecord = Parse.Object.extend('UserEmailRecord');
      var query = new Parse.Query(UserEmailRecord);
      query.matches('email', username);
      query.find({
        success: function(results) {

          // Store this user's email if it doesn't exist.
          if (results.length === 0) {
            var userEmailRecord = new UserEmailRecord();
            userEmailRecord.set('email', username);
            userEmailRecord.save();
          }
        }
      });
    };

    // Sign a user out.
    var _signOut = function(scope) {
      Parse.User.logOut();
      window.location.reload();
    };

    // Get the current user's events.
    var _getCurrentUserEvents = function(scope) {

      // Quit if object already exists.
      if (scope.userEventsParseObject || !scope.currentUser) {
        return;
      }

      // Get the user's id and events list.
      var id = scope.currentUser.id;

      // Make a new Parse object and query it.
      var UserEventList = Parse.Object.extend('UserEventList');
      var query = new Parse.Query(UserEventList);
      query.matches('userId', id);
      query.find({
        success: function(results) {

          // User has no events.  Set as empty array and return.
          if (results.length === 0) {
            scope.eventsList = [];
            scope.userHasEvents = false;
            return;
          }

          // If user has events, populate the object in scope.
          scope.userEventsParseObject = results[0];
          scope.eventsList = results[0].attributes.events;
          if (scope.checkForEvents) {
            scope.checkForEvents();
          }
          scope.$apply();
        }
      });
    };

    // Get a single event from a user's events.
    var _getEvent = function(scope, callback) {

      // Define user and cal ID.
      var userId = scope.userId;
      var calId = scope.calId;

      // Make a new Parse object.
      var UserEventList = Parse.Object.extend('UserEventList');

      // Look to see if this object already exists.
      var query = new Parse.Query(UserEventList);
      query.matches('userId', userId);
      query.find({
        success: function(results) {

          // Define default response object.
          var responseObj = {
            success: false,
            res: undefined
          };

          // Return the event, or an error message.
          if (results && results.length > 0) {
              if (results[0].attributes.events[calId]) {
                responseObj.success = true;
                responseObj.res = results[0].attributes.events[calId];
                callback(responseObj);
              } else {
                callback(responseObj);
              }
          } else {
            callback(responseObj);
          }
          scope.$apply();
        },
        error: function(results, error) {
          console.log(results, error);
        }
      });
    };

    // Check if a vanity url exists, store it if not, update it if so.
    var _validateVanityUrl = function(scope) {

      // Make a new Parse object.
      var VanityUrls = Parse.Object.extend('VanityUrls');

      // Look to see if this object already exists.
      var query = new Parse.Query(VanityUrls);
      query.matches('calendarId', scope.shareLink);
      query.find({
        success: function(results) {
          if (results.length === 0) {

            // Save this new vanity url.
            var newVanityUrl = new VanityUrls();
            newVanityUrl.set('calendarId', scope.shareLink);
            newVanityUrl.set('vanityUrl', scope.currentlySharingEvent.vanityUrl);
            newVanityUrl.save(null, {
              success: function(newUrl) {
                // no actions.
              },
              error: function(eventsList, error) {
                console.log(eventsList, error);
              }
            });
          } else {
            var existingUrl = results[0];
            existingUrl.set('vanityUrl', scope.currentlySharingEvent.vanityUrl);
            existingUrl.save();
          }

          scope.shareLink = undefined;
          scope.currentlySharingEvent = undefined;
          document.body.removeEventListener('keyup', scope.validateVanityUrl);
          scope.$apply();
          _fetchAllVanityUrls(scope);
        },
        error: function(results, error) {
          console.log(results, error);
        }
      });
    };

    // Get all the vanity URLs in the database.
    var _fetchAllVanityUrls = function(scope) {
      // Make a new Parse object.
      var VanityUrls = Parse.Object.extend('VanityUrls');

      // Look to see if this object already exists.
      var query = new Parse.Query(VanityUrls);
      query.find({
        success: function(results) {
          scope.vanityUrls = {};
          for (var i = 0; i < results.length; i++) {
            var url = results[i].attributes.vanityUrl;
            scope.vanityUrls[url] = results[i].attributes.calendarId;
          }
        },
        error: function(results, error) {
          console.log(results, error);
        }
      });
    };

    // Update the Parse record of the User's events list.
    var _saveEventsList = function(scope) {
      console.log('saving item');
      // Quit if no user.
      if (!scope.currentUser) {
        return;
      }

      // Get the user's id and events list.
      var id = scope.currentUser.id;

      // Check for an existing Parse user events object.
      if (scope.userEventsParseObject) {

        // Parse object exists.
        scope.userEventsParseObject.set('events', scope.eventsList);
        scope.userEventsParseObject.save();

      } else {

        // Make a new Parse object.
        var UserEventList = Parse.Object.extend('UserEventList');

        // Look to see if this object already exists.
        var query = new Parse.Query(UserEventList);
        query.matches('userId', id);
        query.find({
          success: function(results) {
            if (results.length === 0) {

              // The user is creating events for the first time.  We'll create a
              // Parse object for the user.
              var userEventList = new UserEventList();
              userEventList.set('events', scope.eventsList);
              userEventList.set('userId', id);
              userEventList.save(null, {
                success: function(eventList) {
                  scope.userEventsParseObject = eventList;
                },
                error: function(eventsList, error) {
                  console.log(eventsList, error);
                }
              });
              return;
            }
            scope.userEventsParseObject = results[0];
            scope.userEventsParseObject.set('events', scope.eventsList);
            scope.userEventsParseObject.save();
          },
          error: function(results, error) {
            console.log(results, error);
          }
        });
      }
    };

    // Expose public functions.
    return {
      signIn: _signIn,
      signOut: _signOut,
      getEvent: _getEvent,
      saveEventsList: _saveEventsList,
      init: _init,
      validateVanityUrl: _validateVanityUrl,
      resetPassword: _resetPassword
    };

  })
  .filter('groupBy', ['$parse', function ($parse) {
    return function (list, group_by) {

        var filtered = [];
        var prev_item = null;
        var group_changed = false;
        // this is a new field which is added to each item where we append '_CHANGED'
        // to indicate a field change in the list
        //was var new_field = group_by + '_CHANGED'; - JB 12/17/2013
        var new_field = 'group_by_CHANGED';

        // loop through each item in the list
        angular.forEach(list, function (item) {

            group_changed = false;

            // if not the first item
            if (prev_item !== null) {

                // check if any of the group by field changed

                //force group_by into Array
                group_by = angular.isArray(group_by) ? group_by : [group_by];

                //check each group by parameter
                for (var i = 0, len = group_by.length; i < len; i++) {
                    if ($parse(group_by[i])(prev_item) !== $parse(group_by[i])(item)) {
                        group_changed = true;
                    }
                }


            }// otherwise we have the first item in the list which is new
            else {
                group_changed = true;
            }

            // if the group changed, then add a new field to the item
            // to indicate this
            if (group_changed) {
                item[new_field] = true;
            } else {
                item[new_field] = false;
            }

            filtered.push(item);
            prev_item = item;

        });

        return filtered;
    };
  }])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/cal/:calId', {
        templateUrl: 'views/cal.html',
        controller: 'CalCtrl'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
