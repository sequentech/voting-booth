/**
 * This file is part of agora-gui-booth.
 * Copyright (C) 2015-2016  Agora Voting SL <agora@agoravoting.com>

 * agora-gui-booth is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.

 * agora-gui-booth  is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with agora-gui-booth.  If not, see <http://www.gnu.org/licenses/>.
**/

/*
 * Help screen directive.
 */
angular.module('avBooth')
  .directive('avbHelpScreen', function(ConfigService) {
    function link(scope, element, attrs) {
      scope.extra = {};
      if (_.isObject(scope.election)) {
        scope.extra.election = scope.election;
      }
      if (_.isObject(scope.authEvent)) {
        scope.extra.authEvent = scope.authEvent;
      }
    }
    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/help-screen-directive/help-screen-directive.html'
    };
  });
