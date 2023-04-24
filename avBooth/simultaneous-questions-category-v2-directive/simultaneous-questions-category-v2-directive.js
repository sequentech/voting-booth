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
 * Simultaneous question category screen directive.
 */
angular.module('avBooth')
  .directive(
    'avbSimultaneousQuestionsCategoryV2',
    function() 
    {

      return {
        restrict: 'AE',
        link: link,
        scope: {
          question: '=',
          category: '=',
          toggleSelectItem: '=',
          toggleSelectItemCumulative: '=',
          cumulativeChecks: '=',
          isReview: '='
        },
        templateUrl: 'avBooth/simultaneous-questions-category-v2-directive/simultaneous-questions-category-v2-directive.html'
      };
    }
  );
