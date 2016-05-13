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
      $i18next,
      $filter,
      $interpolate,
      $timeout,
      $modal,
      $window,
      ConfigService)
    {
      var simultaneousQuestionsLayout = "simultaneous-questions";
      var link = function(scope, element, attrs)
      {
        // filter the list of questions to get the list of questions of type
        // "simultaneous-questions"
        var groupQuestions = scope.groupQuestions = _.filter(
          scope.election.questions,
          function (q) {
            return q.layout === simultaneousQuestionsLayout;
          });

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
          !scope.stateData.isLastQuestion)
        {
          scope.nextButtonText = groupExtraData.next_button;
        } else {
          scope.nextButtonText = $i18next('avBooth.continueButton');
        }

        // stablish the number of rows
        scope.answerColumnsSize = 6;
        if (angular.isDefined(groupExtraData.answer_columns_size)) {
          scope.answerColumnsSize = parseInt(groupExtraData.answer_columns_size, 10);
        }

        // group pairs together? only makes sense if there's a pair number of
        // columns per row
        scope.groupPairs = false;
        if (((12 / scope.answerColumnsSize) % 2) === 0 &&
          angular.isDefined(groupExtraData.group_answer_pairs))
        {
          scope.groupPairs = (groupExtraData.group_answer_pairs === 'TRUE');
        }

        // FIXME: Why this is needed?
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

        // questionNext calls to scope.next() if user selected enough options.
        // Shows a warning to confirm blank vote in any of the questions before
        // proceeding.
        scope.questionNext = function()
        {
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
            }).result.then(scope.next);
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