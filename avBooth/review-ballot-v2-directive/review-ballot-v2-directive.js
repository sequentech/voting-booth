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
 * Review Ballot directive.
 *
 * Shows a list with question and user answers.
 */
angular.module('avBooth')
  .directive('avbReviewBallotV2', function(
    CheckerService,
    ErrorCheckerGeneratorService,
    $i18next
  )
  {
    var link = function(scope, element, attrs)
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

      scope.showPoints = function (question)
      {
        return angular.isDefined(question.extra_options) &&
          !!question.extra_options.show_points;
      };

      scope.isWriteIn = function (answer)
      {
        return hasUrl(answer.urls, 'isWriteIn', 'true');
      };

      scope.showWriteInString = function (question)
      {
        return !question.extra_option ||
          !question.extra_options.write_in_config || 
          question.extra_options.write_in_config.review_screen_presentation === "string";
      }

      scope.markedAsInvalid = function (question)
      {
        return (
          question.invalidVoteAnswer && 
          question.invalidVoteAnswer.selected !== -1
        );
      };

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

      scope.editActionText = $i18next('avBooth.reviewScreen.editAction');
      scope.errors = {};

      function getErrorsChecker(checkerTypeFlag)
      {
        return ErrorCheckerGeneratorService.getErrorChecker(checkerTypeFlag, scope.invalidVoteAnswer);
      }

      // Object to store check selected by question. 
      scope.cumulativeChecks = { };
      scope.election.questions.forEach(
        function(question) 
        {
          var num = question.extra_options.cumulative_number_of_checkboxes;
          scope.cumulativeChecks[question.title] = {};
          question.answers.forEach(
            function(answer)
            {
              scope.cumulativeChecks[question.title][answer.id] = Array
                .apply(
                  null, 
                  Array(num)
                )
                .map(
                  function (_value, index) 
                  {
                    return answer.selected >= index;
                  }
                );
            }
          );
        }
      );
      /**
       * Updates scope.errors with the errors found in scope.groupQuestions
       */
      function updateErrors() 
      {
        var errorChecks = getErrorsChecker("soft");
        scope.errors = {};
        CheckerService({
          checks: errorChecks,
          data: scope.election,
          onError: function (errorKey, errorData) 
          {
            if (_.isUndefined(errorData.question_id)) {
              return;
            }
            if (!scope.errors) {
              scope.errors = {};
            }
            if (!(errorData.question_id in scope.errors)) {
              scope.errors[errorData.question_id] = [];
            }
            scope.errors[errorData.question_id].push({
              data: errorData,
              key: errorKey
            });
          }
        });
      }
      updateErrors();
    };

    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/review-ballot-v2-directive/review-ballot-v2-directive.html'
    };
  });
