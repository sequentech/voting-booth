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
      CheckerService,
      AnswerEncoderService,
      BigIntService
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
                      ) ||
                      (
                        checkerTypeFlag === "show-stoppers" &&
                        question.extra_options.invalid_vote_policy === 'not-allowed' &&
                        question.min === 0
                      )
                    );
                  },
                  postfix: "-blank"
                },
                // raise if vote is explicitly invalid if not checkerTypeFlag
                {
                  check: "lambda",
                  validator: function (question)
                  {
                    return !(
                      (checkerTypeFlag === "normal" || checkerTypeFlag === "soft") &&
                      question.extra_options.invalid_vote_policy === "warn-invalid-implicit-and-explicit" &&
                      question.invalidVoteAnswer &&
                      question.invalidVoteAnswer.selected > -1
                    );
                  },
                  postfix: "-invalid"
                },
                // raise if numSelectedOptions < min, but not if blank, and
                // checkerTypeFlag is normal and invalidVoteAnswer is not set
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
                        question.invalidVoteAnswer && 
                        question.invalidVoteAnswer.selected > -1
                      ) ||
                      (
                        (
                          question.extra_options.invalid_vote_policy === 'warn' ||
                          question.extra_options.invalid_vote_policy === "warn-invalid-implicit-and-explicit"
                        ) &&
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
                // raise if numSelectedOptions > max and invalidVoteAnswer is 
                // not selected
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
                        question.invalidVoteAnswer && 
                        question.invalidVoteAnswer.selected > -1
                      ) ||
                      (
                        (
                          question.extra_options.invalid_vote_policy === 'warn' || 
                          question.extra_options.invalid_vote_policy === "warn-invalid-implicit-and-explicit"
                        ) &&
                        checkerTypeFlag === "show-stoppers"
                      )
                    ) {
                      return true;
                    }
                    return scope.numSelectedOptions(question) <= question.max;
                  },
                  postfix: "-max"
                },
                // raise if multiple write-ins with the same text value and
                // invalidVoteAnswer is not selected
                {
                  check: "lambda",
                  validator: function (question) 
                  {
                    if (
                      (
                        question.invalidVoteAnswer && 
                        question.invalidVoteAnswer.selected > -1
                      ) ||
                      question.extra_options.invalid_vote_policy === 'allowed' || 
                      (
                        (
                          question.extra_options.invalid_vote_policy === 'warn' ||
                          question.extra_options.invalid_vote_policy === "warn-invalid-implicit-and-explicit"
                        ) &&
                        checkerTypeFlag === "show-stoppers"
                      ) ||
                      !question.extra_options ||
                      !question.extra_options.allow_writeins
                    ) {
                      return true;
                    }

                    // Try to find the repeated writeIns, excluding empty
                    // write-ins
                    const nonZeroWriteInAnswers = _.filter(
                      question.answers,
                      function (answer) 
                      {
                        return (
                          answer.text.length > 0 &&
                          hasUrl(answer.urls, 'isWriteIn', 'true')
                        );
                      }
                    );
                    const uniqWriteInTexts = _.uniq(
                      _.pluck(nonZeroWriteInAnswers, 'text')
                    );
                    return (
                      nonZeroWriteInAnswers.length === uniqWriteInTexts.length
                    );
                  },
                  postfix: "-repeated-writeins"
                },
                // raise if write-in texts are too large and overflow and
                // invalidVoteAnswer is not selected
                {
                  check: "lambda",
                  appendOnErrorLambda: function (question) 
                  {
                    return {
                      max: question.writeInBytesLeft.maxWriteInBytes,
                      extra_bytes: -question.writeInBytesLeft.bytesLeft
                    };
                  },
                  validator: function (question) 
                  {
                    if (
                      (
                        question.invalidVoteAnswer && 
                        question.invalidVoteAnswer.selected > -1
                      ) ||
                      !question.extra_options ||
                      !question.extra_options.allow_writeins
                    ) {
                      return true;
                    }

                    const codec = AnswerEncoderService(question);
                    const numBytes = codec.numWriteInBytesLeft(
                      new BigIntService(question.publicKey.q, 10)
                    );
                    question.writeInBytesLeft = numBytes;
                    return numBytes.bytesLeft >= 0;
                  },
                  postfix: "-writein-length"
                },
                // raise warning if write-in is provided but not voted and
                // invalidVoteAnswer is not selected
                {
                  check: "lambda",
                  appendOnErrorLambda: function (question) 
                  {
                    const unvotedNonEmptyWriteIns = _.filter(
                      question.answers,
                      function (answer) 
                      {
                        return (
                          answer.text.length > 0 &&
                          hasUrl(answer.urls, 'isWriteIn', 'true') &&
                          answer.selected === -1
                        );
                      }
                    );
                    const writeInTexts = _.pluck(unvotedNonEmptyWriteIns, 'text');
                    return {
                      write_ins: writeInTexts.join(', ')
                    };
                  },
                  validator: function (question) 
                  {
                    if (
                      (
                        question.invalidVoteAnswer && 
                        question.invalidVoteAnswer.selected > -1
                      ) ||
                      checkerTypeFlag === "show-stoppers" ||
                      !question.extra_options ||
                      !question.extra_options.allow_writeins
                    ) 
                    {
                      return true;
                    }

                    const unvotedNonEmptyWriteIns = _.filter(
                      question.answers,
                      function (answer) 
                      {
                        return (
                          answer.text.length > 0 &&
                          hasUrl(answer.urls, 'isWriteIn', 'true') &&
                          answer.selected === -1
                        );
                      }
                    );
                    return unvotedNonEmptyWriteIns.length === 0;
                  },
                  postfix: "-writeins-not-voted"
                },
                // raise warning if write-in is voted but no text provided and
                // invalidVoteAnswer is not selected
                {
                  check: "lambda",
                  validator: function (question) 
                  {
                    if (
                      (
                        question.invalidVoteAnswer && 
                        question.invalidVoteAnswer.selected > -1
                      ) ||
                      checkerTypeFlag === "show-stoppers" ||
                      !question.extra_options ||
                      !question.extra_options.allow_writeins
                    ) 
                    {
                      return true;
                    }

                    const votedEmptyWriteIns = _.filter(
                      question.answers,
                      function (answer) 
                      {
                        return (
                          answer.text.length === 0 &&
                          hasUrl(answer.urls, 'isWriteIn', 'true') &&
                          answer.selected !== -1
                        );
                      }
                    );
                    return votedEmptyWriteIns.length === 0;
                  },
                  postfix: "-writeins-not-provided"
                },
                // raise if panachage is disabled and invalidVoteAnswer is not
                // selected
                {
                  check: "lambda",
                  postfix: "-panachage",
                  validator: function (question) 
                  {
                    if (
                      (
                        question.invalidVoteAnswer && 
                        question.invalidVoteAnswer.selected > -1
                      ) ||
                      question.extra_options.enable_panachage === undefined ||
                      question.extra_options.enable_panachage === true ||
                      question.extra_options.invalid_vote_policy === 'allowed' || 
                      (
                        (
                          question.extra_options.invalid_vote_policy === 'warn' ||
                          question.extra_options.invalid_vote_policy === "warn-invalid-implicit-and-explicit"
                        ) &&
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
        scope.updateErrors = updateErrors;

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
                  !hasUrl(answer.urls, 'invalidVoteFlag', 'true') &&
                  !hasUrl(answer.urls, 'isCategoryList', 'true')
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
            question.hasCategories = (categories.length >= 1);

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
                if (
                  scope.invalidVoteAnswer &&
                  answer.id === scope.invalidVoteAnswer.id
                ) {
                  return accumulator;
                } else {
                  return accumulator + answer.selected + 1;
                }
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
      };

      return {
        restrict: 'AE',
        link: link,
        templateUrl: 'avBooth/simultaneous-questions-screen-directive/simultaneous-questions-screen-directive.html'
      };
    }
  );
