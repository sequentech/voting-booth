/**
 * This file is part of agora-gui-booth.
 * Copyright (C) 2018  Agora Voting SL <agora@agoravoting.com>

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

angular.module('avBooth')
  .controller('SelectAllCategoryController',
    function($scope, $modalInstance, $cookies, category) {
      $scope.ok = function () {
        $modalInstance.close();
      };

      $scope.doNotShowAgain = function () {
        $cookies.put("do_not_show_select_all_category_dialog", true);
        $modalInstance.dismiss('cancel');
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };

      $scope.category = category;
    });
