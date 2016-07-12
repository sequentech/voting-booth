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

angular.module(
 'avBooth', 
 ['ui.bootstrap',
 'ui.utils',
 'ui.router',
 'ngAnimate'
]);

angular.module('avBooth').config(function($stateProvider) {
    /* Add New States Above */
});

angular.module('avBooth').controller('BoothController',
  function($scope, $stateParams, $filter, ConfigService, $i18next, HmacService, InsideIframeService) {

    $scope.electionId = $stateParams.id;
    $scope.hmacHash = $stateParams.hmac || "";
    $scope.hmacMessage = $stateParams.message || "";
    $scope.baseUrl = ConfigService.baseUrl;
    $scope.voterId = "";
    $scope.config = $filter('json')(ConfigService);

    // checks that the general format of the input data (hmac hash & message)
    // is valid
    // Voting format: /hash/voterid:object_type:object_id:perm:timestamp
    function checkElectionUrl() {
      if ($scope.hmacHash.length === 0 || InsideIframeService()) {
        return null;
      }
      var hashFormat = /^[0-9a-f]{64}$/;
      var error = $i18next("avBooth.errorElectionUrl");

      if (!hashFormat.test($scope.hmacHash) ||
        $.type($scope.hmacMessage) !== "string")
      {
        return error;
      }

      var splitHmac = $scope.hmacMessage.split(":");
      if (splitHmac.length !== 5) {
        return error;
      }

      var voterId = splitHmac[0];
      var objectType = splitHmac[1];
      var objectId = splitHmac[2];
      var perm = splitHmac[3];
      var message = voterId + ":" + objectType + ":" + objectId + ":" + perm;
      var timestamp = splitHmac[4];
      var splitMessage = message.split("-");

      if (isNaN(parseInt(objectId, 10)))
      {
          return error;
      }

      $scope.voterId = voterId;

      return null;
    }

    checkElectionUrl();
    $scope.checkElectionUrl = checkElectionUrl;
});
