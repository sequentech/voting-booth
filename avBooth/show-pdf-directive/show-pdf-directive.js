/**
 * This file is part of voting-booth.
 * Copyright (C) 2022  Sequent Tech Inc <legal@sequentech.io>

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
 * Selected Options directive.
 *
 * Lists the selected options for a question, allowing to change selection.
 */
angular.module('avBooth')
  .directive('avbShowPdf', function($window, IsService) {

    var link = function(scope, element, attrs) {
      scope.show_pdf = angular.isObject(scope.election.presentation.pdf_url);
      scope.enable_vote = ["started", "resumed"].includes(scope.election.state);
      scope.pdf_url = scope.election.presentation.pdf_url;
    };

    return {
      restrict: 'AE',
      scope: true,
      link: link,
      templateUrl: 'avBooth/show-pdf-directive/show-pdf-directive.html'
    };
  });
