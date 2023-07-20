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
    function(
      ErrorCheckerGeneratorService
    ) 
    {
      // used to interpolate write-in field values into its templated string
      function interpolateWriteIn(template, fields) {
        var interpolatedText = template;
        Object.values(fields).map(function (field) {
          var regex = new RegExp("{" + field.id + "}", "g");
          interpolatedText = interpolatedText.replace(regex, _.isString(field.value)? field.value : "");
        });

        var allEmptyFields = Object.values(fields).every(function (field) { return !field.value; });
        if (allEmptyFields) {
          return "";
        }

        return interpolatedText;
      }
      function link(scope, _element, _attrs)
      {
        scope.isCategoryList = ErrorCheckerGeneratorService.hasUrl(scope.answer.urls, 'isCategoryList', 'true');
        scope.isWriteIn = ErrorCheckerGeneratorService.hasUrl(scope.answer.urls, 'isWriteIn', 'true');
        scope.withWriteInConfig = _.isObject(scope.question.extra_options) &&
          _.isObject(scope.question.extra_options.write_in_config);

        scope.showWriteInString = !scope.question.extra_options ||
          !scope.question.extra_options.write_in_config || 
          scope.question.extra_options.write_in_config.review_screen_presentation === "string";

        if (scope.isWriteIn && scope.writeInTextChange) 
        {
          scope.$watch(
            "answer.text",
            function ()
            {
              scope.writeInTextChange();
            }
          );

          // manage write-in fields
          if (scope.withWriteInConfig) {
            // create a copy of the fields, with empty values
            var writeInFields = scope.question.extra_options.write_in_config.fields.map(
              _.clone
            );
            // if it doesn't exist, initialize
            // don't change it if the variable exists as this means editing after review
            // and it would wipe out current values
            if (_.isUndefined(scope.answer.writeInFields)) {
              scope.answer.writeInFields = _.object(
                _.pluck(writeInFields, "id"),
                writeInFields
              );
            }
            var template = scope.question.extra_options.write_in_config.template;

            // watch changes for the write-in field values to update the templated text
            writeInFields.map(function (field) {
              scope.$watch(
                "answer.writeInFields." + field.id + ".value",
                function (newValue,_oldValue)
                {
                  if (_.isUndefined(newValue)) {
                    return;
                  }
                  scope.answer.text = interpolateWriteIn(template, scope.answer.writeInFields);
                }
              );
            });
          }
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
          isBlankVoteAnswer: '=',
          writeInTextChange: '=',
          readOnly: '&',
          hideCheck: '&'
        },
        templateUrl: 'avBooth/simultaneous-question-answer-v2-directive/simultaneous-question-answer-v2-directive.html'
      };
    }
  );
