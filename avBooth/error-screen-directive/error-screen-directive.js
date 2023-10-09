/**
 * This file is part of voting-booth.
 * Copyright (C) 2015-2023  Sequent Tech Inc <legal@sequentech.io>

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

      scope.errorCode = scope.stateData.errorCode || 500;
      scope.errorCodeTranslation = "avBooth.errorScreen." + scope.errorCode;
      scope.showBackButton = true;

      if (
        scope.stateData.errorData &&
        scope.stateData.errorData.showBackButton === false
      ) {
        scope.showBackButton = false;
      }

      scope.showErrorIdentifier = true;
      if (
        scope.stateData.errorData &&
        scope.stateData.errorData.showErrorIdentifier === false
      ) {
        scope.showErrorIdentifier = false;
      }

      scope.goBack = function () {
        if (
          scope.stateData.errorData &&
          angular.isString(scope.stateData.errorData.backButtonUrl)
        ) {
          $window.location.href = scope.stateData.errorData.backButtonUrl;
        }
          scope.setState(scope.stateEnum.startScreen, {});
      };
    }
    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/error-screen-directive/error-screen-directive.html'
    };
  });
