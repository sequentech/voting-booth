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
    function(ConfigService, $modal, $i18next)
    {
      var link = function(scope, _element, _attrs) {
        scope.configService = ConfigService;
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

        scope.showVersionsModal = function () {
          $modal
            .open({
              templateUrl: "avBooth/confirm-modal-controller/confirm-modal-controller.html",
              controller: "ConfirmModal",
              size: 'lg',
              resolve: {
                data: function () {
                  var versionList = (
                    "<li><strong>Main Version (agora-dev-box):</strong> " +
                    ConfigService.mainVersion +
                    "<br/></li>"
                  );
                  _.each(
                    ConfigService.repoVersions,
                    function (repo) {
                      versionList += (
                        "<li><strong>" +
                        repo.repoName +
                        ":</strong> " +
                        repo.repoVersion +
                        "</li>"
                      );
                    }
                  );
                  var body = $i18next(
                    'avBooth.showVersionModal.body',
                    {
                      versionList: versionList
                    }
                  );
                  return {
                    i18n: {
                      header: $i18next('avBooth.showVersionModal.header'),
                      body: body,
                      confirmButton: $i18next('avBooth.showVersionModal.confirmButton')
                    }
                  };
                },
              }
            });
        };
      };
      return {
        restrict: 'AE',
        link: link,
        templateUrl: 'avBooth/booth-header-directive/booth-header-directive.html'
      };
    }
  );