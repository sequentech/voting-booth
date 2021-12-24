/**
 * This file is part of agora-gui-booth.
 * Copyright (C) 2015-2021 Sequent Tech Inc <legal@sequentech.io>

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
 * Directive that shows the booth header.
 */
angular
  .module('avBooth')
  .directive(
    'avbBoothHeader',
    function()
    {
      var link = function(scope, _element, _attrs) {
        scope.enableLogOut = function () {
          var election = (
            (!!scope.parentElection) ?
            scope.parentElection :
            scope.election
          );
  
          return (
            !election ||
            !election.presentation ||
            !election.presentation.extra_options ||
            !election.presentation.extra_options.booth_log_out__disable
          );
        };
      };
      return {
        restrict: 'AE',
        link: link,
        templateUrl: 'avBooth/booth-header-directive/booth-header-directive.html'
      };
    }
  );