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
 * Simultaneous questions screen directive.
 *
 * A layout that shows multiple questions at the same time.
 * NOTE: Only valid for unordered voting systems.
 */
angular.module('avBooth')
  .directive(
    'avbSimultaneousQuestionsV2Screen',
    function(
      $modal,
      $cookies,
      $window,
      ConfigService,
      CheckerService,
      ErrorCheckerGeneratorService
    ) {
      var simultaneousQuestionsLayouts = ["simultaneous-questions-v2", "simultaneous-questions"];


      var link = function(scope, _element, _attrs)
      {
        // filter the list of questions to get the list of questions of type
        // "simultaneous-questions-v2"
        var groupQuestions = _.filter(
          scope.election.questions,
          function (question) 
          {
            return simultaneousQuestionsLayouts.includes(question.layout);
          }
        );

        scope.showCheckableList = function(question) {
          return (
            angular.isDefined(question.extra_options) &&
            angular.isDefined(question.extra_options.enable_checkable_lists) &&
            _.contains(
              ["allow-selecting-candidates-and-lists", "allow-selecting-lists"],
              question.extra_options.enable_checkable_lists
            )
          );
        };

        scope.isReadOnlyCandidate = function(question) {
          return (
            angular.isDefined(question.extra_options) &&
            angular.isDefined(question.extra_options.enable_checkable_lists) &&
            "allow-selecting-lists" === question.extra_options.enable_checkable_lists
          );
        };

        // set some data like the pub key of each question
        _.each(
          scope.election.questions,
          function (question, index)
          {
            question.natural_order_index = index;
            question.publicKey = scope.pubkeys[index];
            question.are_candidates_read_only = scope.isReadOnlyCandidate(question);
            question.are_lists_checkable = scope.showCheckableList(question);
          }
        );

        function getErrorsChecker(checkerTypeFlag)
        {
          return ErrorCheckerGeneratorService.getErrorChecker(checkerTypeFlag, scope.invalidVoteAnswer);
        }

        /**
         * Updates scope.errors with the errors found in scope.groupQuestions
         */
        function updateErrors() 
        {
          var errorChecks = getErrorsChecker("soft");
          scope.errors = [];
          CheckerService({
            checks: errorChecks,
            data: scope.election,
            onError: function (errorKey, errorData) 
            {
              scope.errors.push({
                data: errorData,
                key: errorKey
              });
            }
          });
          
        }
        scope.updateErrors = updateErrors;
        scope.errors = [];

        /**
         * Skip this question(s) (election) and go to the next.
         */
        function skipQuestion()
        {
          // cookies log out from this election
          var postfix = "_authevent_" + scope.election.id;
          $cookies.remove("authevent_" + postfix);
          $cookies.remove("userid" + postfix);
          $cookies.remove("user" + postfix);
          $cookies.remove("auth" + postfix);
          $cookies.remove("isAdmin" + postfix);
          $cookies.remove("isAdmin" + postfix);

          // Mark current election as skipped in the credentials array. As the
          // credentials array is in natural order, the next election that is
          // not skipped inside the filtered array will be the next election in 
          // which this user can vote (if any).
          var skippedCredentials = _.map(
            scope.credentials,
            function (electionCredential)
            {
              if  (
                electionCredential.electionId.toString() === scope.electionId
              ) {
                return Object.assign(
                  {},
                  electionCredential,
                  {skipped: true}
                );
              } else {
                return electionCredential;
              }
            }
          );
          $window.sessionStorage.setItem(
            "vote_permission_tokens",
            JSON.stringify(skippedCredentials)
          );

          // Go to the election chooser
          scope.setState(scope.stateEnum.electionChooserScreen, {});
        }

        // add categories to questions, and other initialization stuff
        groupQuestions.forEach(
          function(question, index) 
          {
            // add index to the question
            question.index = index;

            var filteredAnswers = _.filter(
              question.answers,
              function (answer)
              {
                return (
                  !ErrorCheckerGeneratorService.hasUrl(answer.urls, 'invalidVoteFlag', 'true') &&
                  !ErrorCheckerGeneratorService.hasUrl(answer.urls, 'isCategoryList', 'true') &&
                  !!answer.category &&
                  (
                    !ErrorCheckerGeneratorService.hasUrl(answer.urls, 'isWriteIn', 'true') ||
                    (question.extra_options && question.extra_options.allow_writeins)
                  )
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
                      ErrorCheckerGeneratorService.hasUrl(answer.urls, 'isCategoryList', 'true')
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
            question.hasCategories = (categories.length >= 1);

            // filter write-ins
            question.writeIns = _.filter(
              question.answers,
              function (answer)
              {
                return (
                  ErrorCheckerGeneratorService.hasUrl(answer.urls, 'isWriteIn', 'true')
                ); 
              }
            );

            // set a sane default for columns sizes and invalid_vote_policy
            if (!angular.isDefined(question.extra_options)) 
            {
              question.extra_options = {};
            }
            if (!angular.isDefined(question.extra_options.answer_columns_size)) 
            {
              question.extra_options.answer_columns_size = 12;
            }
            if (!angular.isDefined(question.extra_options.answer_group_columns_size)) 
            {
              question.extra_options.answer_group_columns_size = 6;
            }
            if (!angular.isDefined(question.extra_options.invalid_vote_policy))
            {
              question.extra_options.invalid_vote_policy = 'warn';
            }

            // apply shuffling policy
            if (angular.isDefined(question.extra_options)) {
              if(!!question.extra_options.shuffle_categories) {
                question.categories = _.shuffle(question.categories);
              }
    
              if (!!question.extra_options.shuffle_all_options) {
                question.categories = _.each( question.categories, function(category) {
                  category.answers = _.shuffle(category.answers);
                });
              } else if (!question.extra_options.shuffle_all_options &&
                          angular.isArray(question.extra_options.shuffle_category_list) &&
                          question.extra_options.shuffle_category_list.length > 0) {
                question.categories = _.each( question.categories, function(category) {
                  if (-1 !== question.extra_options.shuffle_category_list.indexOf(category.title)) {
                    category.answers = _.shuffle(category.answers);
                  }
                });
              }
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

            // Try to find and set the invalidVoteAnswer, if any
            question.invalidVoteAnswer = _.find(
              question.answers,
              function (answer)
              {
                return ErrorCheckerGeneratorService.hasUrl(answer.urls, 'invalidVoteFlag', 'true'); 
              }
            );
          }
        );

        scope.isInvalidAnswer = function (answer)
        {
          return ErrorCheckerGeneratorService.hasUrl(answer.urls, 'invalidVoteFlag', 'true');
        };

        scope.groupQuestions = groupQuestions;
        var lastGroupQuestionArrayIndex = groupQuestions[groupQuestions.length-1];
        var lastGroupQuestionIndex = lastGroupQuestionArrayIndex.num;

        // update if it's last question and set questionNum to the last in the
        // group
        scope.stateData.isLastQuestion = (
          scope.stateData.isLastQuestion ||
          scope.election.questions.length === lastGroupQuestionIndex + 1
        );
        scope.stateData.questionNum = lastGroupQuestionIndex;

        // from each question of our group, get the extra_data, and then fusion
        // all the extra_datas of our question group into one
        var groupExtraData = _.extend.apply(_,
          _.union(
            [{}],
            _.map(groupQuestions, function (q) { return q.extra_options; })
          )
        );

        // set next button text by default if it has not been specified
        if (
          angular.isDefined(groupExtraData.next_button) &&
          groupExtraData.next_button.length > 0 &&
          !scope.stateData.isLastQuestion
        ) {
          scope.nextButtonText = groupExtraData.next_button;
        } 
        else 
        {
          scope.nextButtonText = 'avBooth.continueButton';
        }

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
        

        // Object to store check selected by question. 
        scope.cumulativeChecks = { };
        groupQuestions.forEach(
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

        scope.deselectAllCumulative = function(question, option)
        {
          var num = question.extra_options.cumulative_number_of_checkboxes;
          for (var index = 0; index < num; index++)
          {
            scope.cumulativeChecks[question.title][option.id][index] = false;
          }
        };

        scope.clickOnCumulative = function (question, option)
        {
          // number of checkboxes
          var maxNum = question.extra_options.cumulative_number_of_checkboxes;

          // number of checked checkboxes
          var numChecks = scope.cumulativeChecks[question.title][option.id]
            .filter(function (el) { return el; }).length;

          // all checked, next step is to uncheck
          if (numChecks >= maxNum) {
            scope.deselectAllCumulative(question, option);
            question.deselectedAtLeastOnce = true;
            option.selected = -1;
            updateErrors();
          } else {
            // check the first unchecked checkbox
            var checkableIndex = scope.cumulativeChecks[question.title][option.id]
              .indexOf(false);
            scope.toggleSelectItemCumulative(question, option, checkableIndex);
          }
        };

        scope.toggleSelectItemCumulative = function(question, option, index) 
        {
          // toggle the current value in the scope
          var value = scope.cumulativeChecks[question.title][option.id][index];
          scope.cumulativeChecks[question.title][option.id][index] = !value;

          // flag to updateErrors that it can start showing the "not enough
          // options selected error", as the voter already deselected an 
          // option
          if (value) 
          {
            question.deselectedAtLeastOnce = true;
          }

          var currentAnswerChecks = scope.cumulativeChecks[question.title][option.id]
            .reduce(
              function(accumulator, check) 
              {
                return check ? accumulator + 1 : accumulator;
              }, 
              0
            );

          // if option is selected, then simply deselect it
          if (option.selected > -1 && currentAnswerChecks === 0)
          {
            option.selected = -1;
          }
          // select option
          else
          {
            // if max options selectable is 1 and invalid votes are not allowed, 
            // deselect any other and select this
            if (
              question.max === 1 &&
              question.extra_options.invalid_vote_policy === 'not-allowed'
            ) {
              _.each(
                question.answers, 
                function (element)
                {
                  if (element !== option)
                  {
                    scope.deselectAllCumulative(question, element);
                    element.selected = -1;
                  }
                }
              );
            }
            option.selected = currentAnswerChecks - 1;
          }
          updateErrors();
        };

        /**
         * Flips/toggles the selection state of a question's option, selecting
         * or deselecting it.
         */
        scope.toggleSelectItem = function(question, option)
        {
          if (question.tally_type === "cumulative") 
          {
            scope.clickOnCumulative(question, option);
            return true;
          }

          // if option is selected, then simply deselect it
          if (option.selected > -1)
          {
            option.selected = -1;

            // flag to updateErrors that it can start showing the "not enough
            // options selected error", as the voter already deselected an 
            // option
            question.deselectedAtLeastOnce = true;
          }
          // select option
          else
          {
            // if max options selectable is 1, deselect any other and select
            // this (if question.extra_options.invalid_vote_policy is 
            // not-allowed)
            if (
              question.max === 1 &&
              question.extra_options.invalid_vote_policy === 'not-allowed'
            ) {
              _.each(
                question.answers, 
                function (element) 
                {
                  if (element.id !== option.id) 
                  {
                    element.selected = -1;
                  }
                }
              );
            }

            option.selected = 0;
          }
          updateErrors();
        };

        scope.showHelp = function()
        {
          $modal.open({
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: "avBooth/invalid-answers-controller/invalid-answers-controller.html",
            controller: "InvalidAnswersController",
            size: 'md',
            resolve: {
              errors: function() { return []; },
              data: function() {
                return {
                  errors: [],
                  header: "avBooth.simultaneousQuestions.informationModal.header",
                  body: "avBooth.simultaneousQuestions.informationModal.body",
                  continue: "avBooth.simultaneousQuestions.informationModal.confirm",
                  kind: "info"
                };
              }
            }
          });
        };

        scope.skipQuestion = function() 
        {
          $modal.open({
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: "avBooth/invalid-answers-controller/invalid-answers-controller.html",
            controller: "InvalidAnswersController",
            size: 'md',
            resolve: {
              errors: function() { return []; },
              data: function() {
                return {
                  errors: [],
                  header: "avBooth.simultaneousQuestions.skipQuestionModal.header",
                  body: "avBooth.simultaneousQuestions.skipQuestionModal.body",
                  continue: "avBooth.simultaneousQuestions.skipQuestionModal.confirm",
                  cancel: "avCommon.cancel"
                };
              }
            }
          }).result.then(
            function ()
            {
              skipQuestion();
            }
          );
        };


        /**
         * Detects if skip button should be shown
         */
        function showSkipQuestionButton()
        {
          return (
            scope.election.presentation &&
            scope.election.presentation.extra_options &&
            scope.election.presentation.extra_options.show_skip_question_button
          );
        }

        scope.showSkipQuestionButton = showSkipQuestionButton();
      
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
          // calculate errors that might render the vote invalid or blank
          var errorChecks = getErrorsChecker("normal");
          var errors = [];
          CheckerService({
            checks: errorChecks,
            data: scope.election,
            onError: function (errorKey, errorData) 
            {
              errors.push({
                data: errorData,
                key: errorKey
              });
            }
          });
          var showStopperErrorChecks = getErrorsChecker("show-stoppers");
          var showStopperErrors = [];
          CheckerService({
            checks: showStopperErrorChecks,
            data: scope.election,
            onError: function (errorKey, errorData) 
            {
              showStopperErrors.push({
                data: errorData,
                key: errorKey
              });
            }
          });

          // if there any question with a blank vote, show the confirm dialog
          if (errors.length > 0)
          {
            $modal.open({
              ariaLabelledBy: 'modal-title',
              ariaDescribedBy: 'modal-body',
              templateUrl: "avBooth/invalid-answers-controller/invalid-answers-controller.html",
              controller: "InvalidAnswersController",
              size: 'md',
              resolve: {
                errors: function() { return errors; },
                data: function() {
                  return {
                    errors: errors,
                    header: "avBooth.invalidAnswers.header",
                    body: "avBooth.invalidAnswers.body",
                    continue: (
                      showStopperErrors.length === 0 ? "avBooth.invalidAnswers.continue" : undefined
                    ),
                    cancel: "avBooth.invalidAnswers.cancel"
                  };
                }
              }
            }).result.then(scope.next, focusContinueBtn);
            return;
          }

          scope.next();
        };

        scope.clearSelection = function () {
          _.each(
            scope.groupQuestions,
            function (question) {
              _.each(
                question.answers,
                function (answer) {
                  scope.deselectAllCumulative(question, answer);
                  answer.selected = -1;
                }
              );
            }
          );
          scope.errors = [];
        };

        scope.fixToBottom = scope.checkFixToBottom();
      };

      return {
        restrict: 'AE',
        link: link,
        templateUrl: 'avBooth/simultaneous-questions-v2-screen-directive/simultaneous-questions-v2-screen-directive.html'
      };
    }
  );

