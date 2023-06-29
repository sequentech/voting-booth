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

/*
 * Error indicator directive.
 */
angular.module('avBooth')
  .directive('avbErrorScreen', function($resource, $window) {

    function link(scope, element, attrs) {
      try {
      scope.errorId = scope.authorizationHeader.split('-')[2].substr(0, 6);
      } catch(e) {
        scope.errorId = "generic";
      }

      var codeTranslationMap = {
        404: "avBooth.errorScreen.404",
        500: "avBooth.errorScreen.500",
      };
      scope.errorCode = scope.stateData.errorCode || 404;
      scope.errorCodeTranslation = codeTranslationMap[scope.errorCode];
    }
    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/error-screen-directive/error-screen-directive.html'
    };
  });
