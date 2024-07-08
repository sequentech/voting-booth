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
      function expandObject(obj)
      {
        var result = {};
        // Helper function to handle the recursion
        function assignValue(ref, keys, value) {
            var key = keys.shift(); // Get the current key part
            if (keys.length === 0) {
                // If no more keys, assign the value directly
                ref[key] = value;
            } else {
                // Prepare the next level sub-object if necessary
                if (!ref[key]) {
                  ref[key] = {};
                }
                // Recurse with the next level of the key and the corresponding sub-object
                assignValue(ref[key], keys, value);
            }
        }
        // Iterate over each property in the input object
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                var keys = prop.split('.'); // Split the property by dots into parts
                assignValue(result, keys, obj[prop]); // Use the helper to assign the value in the result object
            }
        }
        return result;
      }

      // note that we do not send the language: by default, it will try the language
      // supported by the web browser
      $("#no-js").hide();
      window.i18next
        .use(window.i18nextChainedBackend)
        .init(_.extend(
          {
            debug: true,
            load: 'languageOnly',
            useCookie: true,
            // Preload is needed because the language selector shows an item for
            // each element in lngWhitelist, and the translation for each language
            // is contained at each language i18n file, so we either preload it
            // or it wouldn't work.
            preload: ConfigServiceProvider.i18nextInitOptions.lngWhitelist || [],
            useLocalStorage: false,
            fallbackLng: 'en',
            cookieName: 'lang',
            detectLngQS: 'lang',
            lngWhitelist: ['en', 'es'],
            // files to load
            ns: ['override', 'locales'],
            // default namespace (needs no prefix on calling t)
            defaultNS: 'override',
            // fallback, can be a string or an array of namespaces
            fallbackNS: 'locales',
            interpolation: {
              prefix: '__',
              suffix: '__',
            },
            // Define the backends to use in the chain
            backend: {
              backends: [
                {
                  type: 'backend',
                  /* use services and options */
                  init: function(services, backendOptions, i18nextOptions) {},
                  /* return resources */
                  read: function(language, namespace, callback)
                  {
                    if (namespace === 'override') {
                      if (
                        window.i18nOverride &&
                        typeof window.i18nOverride === 'object' &&
                        window.i18nOverride[language] &&
                        typeof window.i18nOverride[language] === 'object'
                      ) {
                        var override = expandObject(window.i18nOverride[language]);
                        callback(null, override);
                      } else {
                        callback(null, {noop: "noop"});
                      }
                    } else {
                      // not found
                      callback(true, null);
                    }
                  },
                  /* save the missing translation */
                  create: function(languages, namespace, key, fallbackValue) {}
                },
                window.i18nextHttpBackend, // Primary backend
              ],
              backendOptions: [
                // Configuration for custom backend
                {},
                // Configuration for http backend
                {
                  loadPath: '/booth/__ns__/__lng__.json',
                },
              ]
            },
            defaultLoadingValue: '' // ng-i18next option, *NOT* directly supported by i18next
          },
          ConfigServiceProvider.i18nextInitOptions
        ));

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
      .state('election.booth-demo', {
        url: '/:id/eligibility',
        templateUrl: 'avBooth/booth.html',
        controller: "BoothController",
        params: {
          isEligibility: true
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
      .state('election.booth-uuid-preview', {
        url: '/:id/uuid-preview-vote',
        templateUrl: 'avBooth/booth.html',
        controller: "BoothController",
        params: {
          isPreview: true,
          isUuidPreview: true
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
  $rootScope.$on(
    'i18nextLanguageChange',
    function () {
      console.log("i18nextLanguageChange: lang-change, calling safeApply()");
      $rootScope.safeApply();
    }
  );

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
