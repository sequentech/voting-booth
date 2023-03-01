/**
 * This file is part of voting-booth.
 * Copyright (C) 2015-2021  Sequent Tech Inc <legal@sequentech.io>

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
 * Simultaneous question answers screen directive.
 */
angular.module('avBooth')
  .directive(
    'avbSimultaneousQuestionAnswerV2',
    function() 
    {
      /**
       * @returns true if the url with the specific title and url appears in the
       * urls list.
       */
      function hasUrl(urls, title, url)
      {
        const u = _.find(
          urls,
          function(urlObject)
          {
            return urlObject.title === title && urlObject.url === url;
          }
        );

        return !!u;
      }

      function link(scope, _element, _attrs)
      {
        scope.isCategoryList = hasUrl(scope.answer.urls, 'isCategoryList', 'true');
        scope.isWriteIn = hasUrl(scope.answer.urls, 'isWriteIn', 'true');

        if (scope.isWriteIn && scope.writeInTextChange) 
        {
          scope.$watch(
            "answer.text",
            function () 
            {
              scope.writeInTextChange();
            }
          );
        }

        scope.isCheckSelected = function(answer, check)
        {
          return scope.cumulativeChecks[scope.question.title][answer.id][check];
        };

        if (scope.cumulativeChecks)
        {
          scope.answer_cumulative_checks = _.map(
            Array(scope.question.extra_options.cumulative_number_of_checkboxes),
            function (_value, index) { return index; }
          );
        }
      }

      return {
        restrict: 'AE',
        link: link,
        scope: {
          question: '=',
          answer: '=',
          toggleSelectItem: '=',
          toggleSelectItemCumulative: '=',
          cumulativeChecks: '=',
          isInvalidVoteAnswer: '=',
          writeInTextChange: '=',
          readOnly: '&'
        },
        templateUrl: 'avBooth/simultaneous-question-answer-v2-directive/simultaneous-question-answer-v2-directive.html'
      };
    }
  );
