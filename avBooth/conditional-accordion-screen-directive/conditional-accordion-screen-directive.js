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
 * Multiquestion directive.
 *
 * Shows a question and its possible answers to the user.
 */
angular.module('avBooth')
  .directive('avbConditionalAccordionScreen', function(ConfigService) {

    var link = function(scope, element, attrs) {
      scope.stateData.affixIsSet = false;
      scope.stateData.affixDropDownShown = false;
      scope.hideSelection = false;
      scope.stateData.question.layout = "conditional";
      scope.conditionalState = "no-selection";
      scope.organization = ConfigService.organization;

      scope.toggleConditionalState = function (val) {
        if (scope.conditionalState === val) {
          scope.conditionalState = "no-selection";
        } else {
          scope.conditionalState = val;
        }
      };

      scope.numSelectedOptions = function () {
        return _.filter(
          scope.stateData.question.answers,
          function (element) {
            return element.selected > -1 || element.isSelected === true;
          }).length;
      };

      var question = scope.stateData.question;

      if (question.randomize_answer_order) {
          // we can't just sample the groupedOptions list because we need to
          // 1. use the same list object
          // 2. generate a specific ordering for all the options
          var i = -1;
          var answers = question.answers;
          var shuffledNumbers = _.shuffle(_.map(answers, function () { i += 1; return i;}));
          // map different sort orders
          var shuffledAnswers = _.map(shuffledNumbers, function (index) { return answers[index].sort_order;});
          // now, assign
          _.each(answers, function (opt, index) { opt.sort_order = shuffledAnswers[index];});
          answers.sort(function (item1, item2) { return item1.sort_order - item2.sort_order; });
          scope.stateData.question.answers = answers;
      }

      // questionNext calls to scope.next() if user selected enough options.
      // If not, then it flashes the #selectMoreOptsWarning div so that user
      // notices.
      scope.questionNext = function() {
        if (scope.stateData.question.layout === "conditional-accordion" &&
          scope.numSelectedOptions() < 1)
        {
          $("#selectMoreOptsWarning").flash();
          return;
        }
          else if (scope.stateData.question.layout === "conditional" &&
          scope.conditionalState === "no-selection")
        {
          $("#selectMoreOptsWarning").flash();
          return;
        }
          else if (scope.stateData.question.layout === "conditional" &&
          scope.conditionalState === "yes")
        {
          scope.stateData.question.layout = "conditional-accordion";
          return;
        }

        scope.stateData.question.layout = "conditional-accordion";
        scope.next();
      };
    };

    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/conditional-accordion-screen-directive/conditional-accordion-screen-directive.html'
    };
  });