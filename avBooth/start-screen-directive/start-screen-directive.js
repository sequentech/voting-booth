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
 * Start screen directive.
 *
 * Shows the steps to the user.
 */
angular
  .module('avBooth')
  .directive(
    'avbStartScreen',
    function(ConfigService)
    {
      function link(scope, element, attrs)
      {
        scope.tosTitle = ConfigService.tos.title;
        scope.tosText = ConfigService.tos.text;
        scope.extra_data = {};
        scope.organization = ConfigService.organization;
        scope.legal = false;
        if (attrs.extra && typeof attrs.extra === 'string')
        {
          scope.extra_data = JSON.parse(attrs.extra);
          var d = scope.extra_data;
          if (d.name && d.org && d.nif && d.contact)
          {
            scope.legal = true;
          }
        }
        scope.mandatory_tos = {
          enabled: (
            scope.parentElection.presentation &&
            !!scope.parentElection.presentation.mandatory_acceptance_tos_html
          ),
          value: false
        };

        /**
         * @returns whether the Start Voting button should be disabled or not
         */
        scope.startVotingDisabled = function ()
        {
          // Start voting should not be disabled when:
          // a) there's no mandatory tos (it's disabled)
          // b) mandatory_tos checkbox has been checked
          return (
            !scope.mandatory_tos.enabled ||
            !scope.mandatory_tos.value
          );
        };
        scope.fixToBottom = scope.checkFixToBottom();
      }

      return {
        restrict: 'AE',
        scope: true,
        link: link,
        templateUrl: 'avBooth/start-screen-directive/start-screen-directive.html'
      };
    }
  );
