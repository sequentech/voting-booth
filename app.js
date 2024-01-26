/**
 * This file is part of voting-booth.
 * Copyright (C) 2015-2016  Sequent Tech Inc <legal@sequentech.io>

 * voting-booth is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.

 * voting-booth  is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with voting-booth.  If not, see <http://www.gnu.org/licenses/>.
**/

window.SequentConfigData.base = '/booth';
window.localStorage.clear();

angular.module(
  'voting-booth',
  ['ui.bootstrap',
  'ui.utils',
  'ui.router',
  'ngAria',
  'ngAnimate',
  'ngResource',
  'ngCookies',
  'ipCookie',
  'ngSanitize',
  'infinite-scroll',
  'angularMoment',
  'SequentConfig',
  'jm.i18next',
  'avUi',
  'avBooth',
  'avTest',
  'avCrypto',
  'angularFileUpload',
  'dndLists',
  'angularLoad',
  'ng-autofocus',
  'common-ui'
]);

angular
  .module('jm.i18next')
  .config(
    function ($i18nextProvider, ConfigServiceProvider)
    {
      // note that we do not send the language: by default, it will try the language
      // supported by the web browser
      $("#no-js").hide();
      var loading = {};
      window.i18nOriginal = {};

      function getExtended(data, lngValue) {
        var override = {};
        if (window.i18nOverride && lngValue in window.i18nOverride) {
          var baseOverride = window.i18nOverride[lngValue];
          override = angular.copy(baseOverride);
        }
        return angular.merge({}, data, override);
      }

      $i18nextProvider.options = _.extend(
        {
          useCookie: true,
          useLocalStorage: false,
          fallbackLng: 'en',
          cookieName: 'lang',
          detectLngQS: 'lang',
          lngWhitelist: ['en', 'es', 'gl', 'ca'],
          customLoad: function (lngValue, nsValue, options, loadComplete) {
            var url = '/booth/locales/' + lngValue + '.json';
            if (window.i18nOriginal && lngValue in window.i18nOriginal) {
              console.log("customLoad: RET ORIGINAL EXTENDED lng=" + lngValue);
              // if we already loaded the original, then we don't reload it. 
              // Otherwise the language selector goes crazy
              return;
            }
            if (lngValue in loading) {
              console.log("customLoad: already loading lng=" + lngValue);
              loadComplete(/*err*/ "customLoad: already loading lng=" + lngValue, null);
              return;
            }
            loading[lngValue] = true;
            var req = new XMLHttpRequest();
            // Configure it: GET-request for the URL /your/api/endpoint
            req.open('GET', url, true);
            req.onload = function() {
              console.log("customLoad: complete lng=" + lngValue + ", req.status=" + req.status);
              if (req.status >= 200 && req.status < 300) {
                  var data = JSON.parse(req.responseText);
                  window.i18nOriginal[lngValue] = angular.copy(data);
                  var extended = getExtended(window.i18nOriginal[lngValue], lngValue);
                  console.log("customLoad: complete lng=" + lngValue + " DONE");
                  loadComplete(/*err*/ null, extended);
              } else {
                console.log("customLoad: complete lng=" + lngValue + " ERROR");
                  loadComplete(/*err*/ "Error loading locale at url=" + url, null);
              }
            };
            console.log("customLoad: sending GET url=" + url);
            req.send("");
          },
          defaultLoadingValue: '' // ng-i18next option, *NOT* directly supported by i18next
        },
        ConfigServiceProvider.i18nextInitOptions
      );

      // Prevent site translation if configured
      if (ConfigServiceProvider.preventSiteTranslation) {
        $('html').attr('translate', 'no');
      }
    }
  );

angular.module('voting-booth').config(function($sceDelegateProvider, ConfigServiceProvider) {
  $sceDelegateProvider.resourceUrlWhitelist(ConfigServiceProvider.resourceUrlWhitelist);
});

angular.module('voting-booth').config(
  function(
    $stateProvider,
    $urlRouterProvider,
    $httpProvider,
    $locationProvider,
    ConfigServiceProvider)
  {
    // CSRF verification
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';

    $urlRouterProvider.otherwise(ConfigServiceProvider.defaultRoute);

    // use the HTML5 History API
    $locationProvider.html5Mode(ConfigServiceProvider.locationHtml5mode);

    /* App states and urls are defined here */
    $stateProvider
      .state('election', {
        abstract: true,
        url: '/booth',
        template: '<div ui-view></div>'
      })
      .state('election.booth', {
        url: '/:id/vote/:hmac/:message',
        templateUrl: 'avBooth/booth.html',
        controller: "BoothController"
      })
      .state('election.booth-nohmac', {
        url: '/:id/vote',
        templateUrl: 'avBooth/booth.html',
        controller: "BoothController"
      })
      .state('election.booth-demo', {
        url: '/:id/demo-vote',
        templateUrl: 'avBooth/booth.html',
        controller: "BoothController",
        params: {
          isDemo: true
        }
      })
      .state('election.booth-preview', {
        url: '/:id/preview-vote',
        templateUrl: 'avBooth/booth.html',
        controller: "BoothController",
        params: {
          isPreview: true
        }
      })
      .state('election.public.show.home.simple', {
        template: '<div ave-simple-question></div>'
      })
      .state('election.public.show.home.plurality-at-large', {
        template: '<div av-plurality-at-large-results></div>',
      })
      .state('election.public.show.home.borda', {
        template: '<div av-borda-results></div>',
      })
      .state('election.public.show.logout', {
        url: '/logout',
        controller: "LogoutController"
      })
      .state('election.results.show.home.borda', {
        template: '<div av-borda-results></div>',
      })
      .state('election.results.show.plurality-at-large', {
        template: '<div av-plurality-at-large-results></div>',
      });
    $stateProvider
      .state('unit-test-e2e', {
        url: '/unit-test-e2e',
        templateUrl: 'test/unit_test_e2e.html',
        controller: "UnitTestE2EController"
      });
});

angular.module('voting-booth').run(function($http, $rootScope, ConfigService, $window) {
  document.title = ConfigService.webTitle;
  $rootScope.safeApply = function(fn) {
    var phase = $rootScope.$$phase;
    if (phase === '$apply' || phase === '$digest') {
      if (fn && (typeof(fn) === 'function')) {
        fn();
      }
    } else {
      this.$apply(fn);
    }
  };

  $rootScope.$on('$stateChangeStart',
    function(event, toState, toParams, fromState, fromParams) {
      console.log("change start from " + fromState.name + " to " + toState.name);
      $("#angular-preloading").show();
    });
  $rootScope.$on('$stateChangeSuccess',
    function(event, toState, toParams, fromState, fromParams) {
      console.log("change success");
      $("#angular-preloading").hide();
    });
  
  /**
   * Warns the user about leaving the page, using a standard browser
   * prompt dialog (there's no way to use any custom one).
   */
  $window.onbeforeunload = function(e) {
    // Cancel the event
    e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
    // Chrome requires returnValue to be set
    e.returnValue = '';
  };
});


/*
This directive allows us to pass a function in on an enter key to do what we want.
 */
angular.module('voting-booth').directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});

/**
 * Truncate Filter
 * @Param text
 * @Param length, default is 10
 * @Param end, default is "..."
 * @return string
 */
angular.module('voting-booth').filter('truncate', function () {
        return function (text, length, end) {
            if (isNaN(length)) {
                length = 10;
            }

            if (end === undefined) {
                end = "...";
            }

            if (text.length <= length || text.length - end.length <= length) {
                return text;
            }
            else {
                return String(text).substring(0, length-end.length) + end;
            }

        };
    });
