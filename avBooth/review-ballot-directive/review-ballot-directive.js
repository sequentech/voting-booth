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

/*
 * Review Ballot directive.
 *
 * Shows a list with question and user answers.
 */
angular.module('avBooth')
  .directive('avbReviewBallot', function()
  {
    var link = function(scope, element, attrs)
    {
      scope.showPoints = function (question)
      {
        return angular.isDefined(question.extra_options) &&
          !!question.extra_options.show_points;
      };

      scope.markedAsInvalid = function (question)
      {
        return (
          question.invalidVoteAnswer && 
          question.invalidVoteAnswer.selected !== -1
        );
      }

      /**
       * @returns number of points this ballot is giving to this option
       */
      scope.getPoints = function (question, answer)
      {
        if (!scope.showPoints(question)) {
          return 0;
        }
        if (answer.selected < 0) {
          return 0;
        }
        return {
          "plurality-at-large": function ()
          {
            return 1;
          },
          "borda": function()
          {
            return question.max - answer.selected;
          },
          "borda-mas-madrid": function()
          {
            return scope.question.max - scope.option.selected;
          },
          "borda-nauru": function()
          {
            return "1/" + (1 + answer.selected);
          },
          "pairwise-beta": function()
          {
            return;
          },
          "desborda3": function()
          {
            return Math.max(1, Math.floor(question.num_winners * 1.3) - answer.selected);
          },
          "desborda2": function()
          {
            return Math.max(1, Math.floor(question.num_winners * 1.3) - answer.selected);
          },
          "desborda": function()
          {
            return 80 - answer.selected;
          },
          "cumulative": function ()
          {
            return answer.selected + 1;
          }
        }[question.tally_type]();
      };
    };

    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/review-ballot-directive/review-ballot-directive.html'
    };
  });
