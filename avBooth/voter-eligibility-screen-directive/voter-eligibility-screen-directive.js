/**
 * This file is part of voting-booth.
 * Copyright (C) 2024  Sequent Tech Inc <legal@sequentech.io>

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

angular.module('avBooth')
  .directive('avbVoterEligibilityScreen',  function($window, $timeout, $q, $modal, ConfigService) {

    function link(scope, element, attrs) {
    }
    return {
      restrict: 'AE',
      scope: true,
      link: link,
      templateUrl: 'avBooth/voter-eligibility-screen-directive/voter-eligibility-screen-directive.html'
    };
  });
