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
 * Simultaneous questions screen directive.
 *
 * A layout that shows multiple questions at the same time.
 * NOTE: Only valid for unordered voting systems.
 *
 * FIXME: Does not check if the user selected less options in a question than
 * the minimum so when that happens an encryption codification error is shown.
 */
angular.module('avBooth')
  .directive(
    'avbSimultaneousQuestionsScreen',
    function(
      $modal,
      ConfigService
    ) {
      var simultaneousQuestionsLayout = "simultaneous-questions";

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


      var link = function(scope, _element, _attrs)
      {
        // filter the list of questions to get the list of questions of type
        // "simultaneous-questions"
        var groupQuestions = _.filter(
          scope.election.questions,
          function (question) 
          {
            return question.layout === simultaneousQuestionsLayout;
          }
        );

        // add categories to questions
        groupQuestions.forEach(function(question) 
        {
          var filteredAnswers = _.filter(
            question.answers,
            function (answer)
            {
              return (
                !hasUrl(answer.urls, 'invalidVoteFlag', 'true') &&
                !hasUrl(answer.urls, 'isCategoryList', 'true') &&
                !hasUrl(answer.urls, 'isWriteIn', 'true')
              ); 
            }
          );
          var categories = _.groupBy(filteredAnswers, "category");
          categories = _.map(
            _.pairs(categories), 
            function(pair) 
            {
              var i = -1;
              var title = pair[0];
              var answers = pair[1];
              var categoryAnswer = _.find(
                question.answers,
                function (answer)
                {
                  return (
                    answer.text === title &&
                    hasUrl(answer.urls, 'isCategoryList', 'true')
                  );
                }
              );

              return {
                title: title,
                answers: answers,
                categoryAnswer: categoryAnswer
              };
            }
          );
          question.categories = categories;
          question.hasCategories = categories.length > 1 || (categories.length === 1 && categories[0].title !== '');
        });

        scope.groupQuestions = groupQuestions;
        var lastGroupQuestionArrayIndex = groupQuestions[groupQuestions.length-1];
        var lastGroupQuestionIndex = lastGroupQuestionArrayIndex.num;

        // update if it's last question and set questionNum to the last in the
        // group
        scope.stateData.isLastQuestion = (
          scope.stateData.isLastQuestion ||
          scope.election.questions.length === lastGroupQuestionIndex + 1);
        scope.stateData.questionNum = lastGroupQuestionIndex;

        // from each question of our group, get the extra_data, and then fusion
        // all the extra_datas of our question group into one
        var groupExtraData = _.extend.apply(_,
          _.union(
            [{}],
            _.map(groupQuestions, function (q) { return q.extra_options; })));

        // set next button text by default if it has not been specified
        if (angular.isDefined(groupExtraData.next_button) &&
          groupExtraData.next_button.length > 0 &&
          !scope.stateData.isLastQuestion)
        {
          scope.nextButtonText = groupExtraData.next_button;
        } else {
          scope.nextButtonText = 'avBooth.continueButton';
        }

        _.each(
          groupQuestions,
          function (question)
          {
            // set a sane default for answer_columns_size
            if (!angular.isDefined(question.extra_options)) 
            {
              question.extra_options = {};
            }
            if (!angular.isDefined(question.extra_options.answer_columns_size)) 
            {
              question.extra_options.answer_columns_size = 6;
            }

            // convert each answer url list to a map
            _.each(
              question.answers,
              function (answer)
              {
                answer.urlsObject = _.object(
                  _.map(
                    answer.urls, 
                    function(url) 
                    {
                      return [url.title, url.url];
                    }
                  )
                );
              }
            );
          }
        );

        scope.organization = ConfigService.organization;

        // reset selection on initialization
        _.each(scope.election.questions, function(question)
        {
          _.each(question.answers, function (answer)
          {
            if (answer.selected === undefined)
            {
              answer.selected = -1;
            }
          });
        });

        /**
         * Flips/toggles the selection state of a question's option, selecting
         * or deselecting it.
         */
        scope.toggleSelectItem = function(question, option)
        {
          // if option is selected, then simply deselect it
          if (option.selected > -1)
          {
            _.each(question.answers, function (element) {
              if (element.selected > option.selected) {
                element.selected -= 1;
              }
            });
            option.selected = -1;
          }
          // select option
          else
          {
            // if max options selectable is 1, deselect any other and select
            // this
            if (question.max === 1) {
              _.each(question.answers, function (element) {
                if (element.selected > option.selected) {
                  element.selected -= 1;
                }
              });
              option.selected = 0;
              return;
            }

            var numSelected = _.filter(question.answers, function (element) {
              return element.selected > -1;
            }).length;

            // can't select more, flash info
            if (numSelected === parseInt(question.max, 10)) {
              return;
            }

            option.selected = numSelected;
          }
        };

        /**
         * @returns number of selected options in a question
         */
        scope.numSelectedOptions = function (question)
        {
          return _.filter(
            question.answers,
            function (element) {
              return element.selected > -1 || element.isSelected === true;
            }).length;
        };
      
        /**
         * Focus on Continue button after closing modal.
         */
        function focusContinueBtn() {
          angular.element.find('#continue-btn')[0].focus();
        }

        // questionNext calls to scope.next() if user selected enough options.
        // Shows a warning to confirm blank vote in any of the questions before
        // proceeding, or to inform if it's needed to select an option.
        scope.questionNext = function()
        {
          // show notification to select options if needs to select more
          // options
          var tooFewAnswersQuestions = _.filter(
            groupQuestions,
            function(question)
            {
              return scope.numSelectedOptions(question) < question.min;
            }
          );

          // if there any question with a blank vote, show the confirm dialog
          if (tooFewAnswersQuestions.length > 0)
          {
            $modal.open({
              templateUrl: "avBooth/too-few-answers-controller/too-few-answers-controller.html",
              controller: "TooFewAnswersController",
              size: 'md',
              resolve: {
                questions: function() { return tooFewAnswersQuestions; },
                numSelectedOptions: function() { return scope.numSelectedOptions; }
              }
            }).result.then(focusContinueBtn,focusContinueBtn);
            return;
          }

          // show has any blank vote confirmation screen if allowed
          var hasAnyBlankVote = _.reduce(
            groupQuestions,
            function(hasAnyBlankVote, question)
            {
              return hasAnyBlankVote || (scope.numSelectedOptions(question) === 0);
            },
            false
          );

          // if there any question with a blank vote, show the confirm dialog
          if (hasAnyBlankVote)
          {
            $modal.open({
              templateUrl: "avBooth/confirm-null-vote-controller/confirm-null-vote-controller.html",
              controller: "ConfirmNullVoteController",
              size: 'md'
            }).result.then(scope.next, focusContinueBtn);
            return;
          }

          scope.next();
        };
      };

      return {
        restrict: 'AE',
        link: link,
        templateUrl: 'avBooth/simultaneous-questions-screen-directive/simultaneous-questions-screen-directive.html'
      };
    }
  );
