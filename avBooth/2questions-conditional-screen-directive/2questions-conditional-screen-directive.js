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
 * Drafts election screen directive.
 *
 * This is a multiple question view, crafted for a specific election that has
 * some unique details.
 */
angular.module('avBooth')
  .directive('avb2questionsConditionalScreen', function($i18next, $filter, $interpolate, $timeout, $window, ConfigService) {

    var link = function(scope, element, attrs) {
      scope.organization = ConfigService.organization;
      _.each(scope.election.questions, function(question) {
        _.each(question.answers, function (answer) {
          if (answer.selected === undefined) {
            answer.selected = -1;
          }
        });
      });

      scope.toggleOption = function(q_num, answ_num) {
        if (q_num === 0) {
          if (scope.election.questions[0].answers[answ_num].selected === -1) { // execute: select
            _.each(scope.election.questions[0].answers, function(answer, index) {
              if (index === answ_num) {
                answer.selected = 0;
              } else {
                answer.selected = -1;
              }
            });

            if (scope.election.questions.length > 1 && answ_num === 0) {
              _.each(scope.election.questions[1].answers, function(answer) {
                answer.selected = -1;
              });
            }
          } else { // execute: deselect
            scope.election.questions[0].answers[answ_num].selected = -1;
          }
        } else if (q_num === 1) {
          if (scope.election.questions[1].answers[answ_num].selected === -1) { // execute: select
            scope.election.questions[0].answers[0].selected = -1;
            scope.election.questions[0].answers[1].selected = 0;

            _.each(scope.election.questions[1].answers, function(answer, index) {
              if (index === answ_num) {
                answer.selected = 0;
              } else {
                answer.selected = -1;
              }
            });
          } else { // execute: deselect
            scope.election.questions[1].answers[answ_num].selected = -1;
          }
        }
      };
    };

    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/2questions-conditional-screen-directive/2questions-conditional-screen-directive.html'
    };
  });