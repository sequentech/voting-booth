/**
 * This file is part of voting-booth.
 * Copyright (C) 2023  Sequent Tech Inc <legal@sequentech.io>

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
 * steps: 'election-list', 'ballot', 'review', 'confirmation'
 */

angular
  .module('avBooth')
  .directive(
    'avbVotingStep',
    function()
    {
      function link(scope, element, attrs)
      {
        var STEP_LIST = ['election-list', 'ballot', 'review', 'confirmation', 'audit'];

        if (undefined === scope.step) {
          scope.step = attrs.step;
        }

        scope.initialNumber = 1;
        if (scope.withElectionList) {
          scope.initialNumber = 0;
        }

        scope.getStepNumber = function (step) {
          return STEP_LIST.indexOf(step) + scope.initialNumber;
        };
      }

      return {
        restrict: 'AE',
        scope: {
          step: '=',
          withElectionList: '='
        },
        link: link,
        templateUrl: 'avBooth/voting-step-directive/voting-step-directive.html'
      };
    }
  );
