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
 */
angular.module('avBooth')
  .directive(
    'avbSimultaneousQuestionsScreen',
    function(
      $modal,
      $cookies,
      $window,
      ConfigService,
      CheckerService
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

        function getErrorsChecker(checkerTypeFlag)
        {
          return [
            {
              check: "array-key-group-chain",
              key: "questions",
              append: {key: "qtitle", value: "$value.title"},
              prefix: "avBooth.errors.question-",
              checks: [
                // raise if vote is blank if not checkerTypeFlag
                {
                  check: "lambda",
           
                  appendOnErrorLambda: function (question) 
                  {
                    return {
                      min: question.min,
                      num_selected: scope.numSelectedOptions(question)
                    };
                  },
                  validator: function (question) 
                  {
                    if (!!question.extra_options.force_allow_blank_vote)
                    {
                      return true;
                    }
                    return (
                      (
                        checkerTypeFlag === "soft" && 
                        !question.deselectedAtLeastOnce
                      ) ||
                      (
                        scope.numSelectedOptions(question) > 0
                      ) ||
                      (
                        checkerTypeFlag === "show-stoppers" && 
                        question.extra_options.invalid_vote_policy !== 'not-allowed'
                      )
                    );
                  },
                  postfix: "-blank"
                },
                // raise if numSelectedOptions < min, but not if blank, and
                // checkerTypeFlag is normal
                {
                  check: "lambda",
                  appendOnErrorLambda: function (question) 
                  {
                    return {
                      min: question.min,
                      num_selected: scope.numSelectedOptions(question)
                    };
                  },
                  validator: function (question) 
                  {
                    if (
                      question.extra_options.invalid_vote_policy === 'allowed' ||
                      scope.numSelectedOptions(question) === 0 ||
                      (
                        question.extra_options.invalid_vote_policy === 'warn' &&
                        checkerTypeFlag === "show-stoppers"
                      )
                    ) {
                      return true;
                    }
                    return (
                      (checkerTypeFlag === "normal" && !question.deselectedAtLeastOnce) ||
                      scope.numSelectedOptions(question) >= question.min
                    );
                  },
                  postfix: "-min"
                },
                // raise if numSelectedOptions > max
                {
                  check: "lambda",
                  appendOnErrorLambda: function (question) 
                  {
                    return {
                      max: question.max,
                      num_selected: scope.numSelectedOptions(question)
                    };
                  },
                  validator: function (question) 
                  {
                    if (
                      question.extra_options.invalid_vote_policy === 'allowed' || 
                      (
                        question.extra_options.invalid_vote_policy === 'warn' &&
                        checkerTypeFlag === "show-stoppers"
                      )
                    ) {
                      return true;
                    }
                    return scope.numSelectedOptions(question) <= question.max;
                  },
                  postfix: "-max"
                },
                // raise if panachage is disabled
                {
                  check: "lambda",
                  postfix: "-panachage",
                  validator: function (question) 
                  {
                    if (
                      question.extra_options.enable_panachage === undefined ||
                      question.extra_options.enable_panachage === true ||
                      question.extra_options.invalid_vote_policy === 'allowed' || 
                      (
                        question.extra_options.invalid_vote_policy === 'warn' &&
                        checkerTypeFlag === "show-stoppers"
                      )
                    ) {
                      return true;
                    }

                    return _.uniq(
                      question.answers
                      .filter(
                        function (answer)
                        {
                          return answer.selected !== -1;
                        }
                      )
                      .map(
                        function (answer)
                        {
                          return answer.category;
                        }
                      )
                    ).length <= 1;
                  },
                },
              ]
            }
          ];
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

          // Remove current election from the credentials array. As the
          // credentials array is in natural order, the next election inside
          // the filtered array will be the next election in which this user
          // can vote, if any.
          var filtered = _.filter(
            scope.credentials,
            function (electionCredential) {
              return (
                electionCredential.electionId.toString() !== scope.electionId
              );
            }
          );

          var nextElection = filtered[0];
          var options = {};
          if (ConfigService.cookies && ConfigService.cookies.expires) 
          {
            options.expires = new Date();
            options.expires.setMinutes(
              options.expires.getMinutes() + ConfigService.cookies.expires
            );
          }
          $cookies.put(
            "vote_permission_tokens",
            JSON.stringify(filtered),
            options
          );

          // Stop warning the user about reloading/leaving the page, as the vote
          // has been cast already;
          $window.onbeforeunload = null;
    
          // Finally go to the next election
          $window.location.href = "/booth/" + nextElection.electionId + "/vote";
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
            question.hasCategories = (
              categories.length > 1 || 
              (categories.length === 1 && categories[0].title === '')
            );

            // filter write-ins
            question.writeIns = _.filter(
              question.answers,
              function (answer)
              {
                return (
                  hasUrl(answer.urls, 'isWriteIn', 'true')
                ); 
              }
            );

            // set a sane default for columns sizes
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
                return hasUrl(answer.urls, 'invalidVoteFlag', 'true'); 
              }
            );
          }
        );

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
        scope.errors = [];

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
              (
                !question.extra_options.invalid_vote_policy ||
                question.extra_options.invalid_vote_policy === 'not-allowed'
              )
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
            return false;
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
              (
                !question.extra_options.invalid_vote_policy ||
                question.extra_options.invalid_vote_policy === 'not-allowed'
              )
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

        /**
         * @returns number of selected options in a question
         */
        scope.numSelectedOptions = function (question)
        {
          if (question.tally_type === "cumulative") 
          {
            return question.answers.reduce(
              function (accumulator, answer)
              {
                return accumulator + answer.selected + 1;
              },
              0
            );
          }
          else 
          {
            return _.filter(
              question.answers,
              function (element) {
                return element.selected > -1;
              }
            ).length;
          }
        };
        scope.skipQuestion = skipQuestion;


        /**
         * Detects if skip button should be shown
         */
        function showSkipQuestionButton()
        {
          if (
            !scope.election.presentation.extra_options ||
            !scope.election.presentation.extra_options.show_skip_question_button ||
            !scope.credentials ||
            scope.credentials.length <= 1
          ) {
            return false;
          }
           // Remove current election from the credentials array. As the
          // credentials array is in natural order, the next election inside
          // the filtered array will be the next election in which this user
          // can vote, if any.
          var filtered = _.filter(
            scope.credentials,
            function (electionCredential) {
              return (
                electionCredential.electionId.toString() !== scope.electionId
              );
            }
          );
           return filtered.length > 0;
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
      };

      return {
        restrict: 'AE',
        link: link,
        templateUrl: 'avBooth/simultaneous-questions-screen-directive/simultaneous-questions-screen-directive.html'
      };
    }
  );
