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
    function(ConfigService, InsideIframeService)
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

        scope.fixToBottom = scope.checkFixToBottom();

        scope.translate = function ()
        {
          var presentation = scope.election.presentation;
          // reset $window.i18nOverride
          if (presentation && presentation.i18n_override)
          {
            I18nOverride(
              /* overrides = */ presentation.i18n_override,
              /* force = */ false
            );
          }
        };
      }

      return {
        restrict: 'AE',
        scope: true,
        link: link,
        templateUrl: 'avBooth/start-screen-directive/start-screen-directive.html'
      };
    }
  );
