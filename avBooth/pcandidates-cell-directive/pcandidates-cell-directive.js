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
 * Directive that shows a draft option cell.
 */
angular.module('avBooth')
  .directive('avbPcandidatesCell', function($filter) {

    var link = function(scope, element, attrs) {
      scope.question_index = parseInt(attrs.avbPcandidatesCell);
      scope.team = scope.$parent.$parent.team;
      scope.candidates = scope.team.options[scope.question_index];
      scope.candidates.selected = $filter("avbCountSelectedOptions")(scope.candidates);

      scope.question_title = scope.$parent.question.title;

      scope.isOpenCell = function () {
        return scope.team["isOpen" + scope.question_index];
      };

      scope.toggleOpenCell = function () {
        scope.team["isOpen" + scope.question_index] =
          !scope.team["isOpen" + scope.question_index];
      };

      scope.getUrl = function(candidate, title) {
        return _.filter(candidate.urls, function (url) {
          return url.title === title;
        })[0];
      };
    };

    return {
      restrict: 'AE',
      link: link,
      scope: true,
      templateUrl: 'avBooth/pcandidates-cell-directive/pcandidates-cell-directive.html'
    };
  });