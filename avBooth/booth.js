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

angular.module(
  'avBooth', 
  [
    'ui.bootstrap',
    'ui.utils',
    'ui.router',
    'ngAnimate',
    'avUi'
  ]
);

angular.module('avBooth').config(function($stateProvider) {
    /* Add New States Above */
});

angular
  .module('avBooth')
  .controller(
    'BoothController',
    function(
      $scope, 
      $stateParams, 
      $filter, 
      ConfigService, 
      $i18next, 
      $cookies,
      InsideIframeService
    ) {
      $scope.isDemo = $stateParams.isDemo || false;
      $scope.isPreview = $stateParams.isPreview || false;
      $scope.electionId = $stateParams.id;
      $scope.baseUrl = ConfigService.baseUrl;
      $scope.config = $filter('json')(ConfigService);
    }
  );
