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
  .directive('avbMultiQuestion', function($modal, ConfigService) {

    var link = function(scope, element, attrs) {
      scope.stateData.affixIsSet = false;
      scope.stateData.affixDropDownShown = false;
      scope.hideSelection = false;
      scope.organization = ConfigService.organization;

      scope.getUrl = function(option, title) {
        return _.filter(option.urls, function (url) {
          return url.title === title;
        })[0];
      };

      scope.getTag = function(option) {
        var url = scope.getUrl(option, "Tag");
        if (!url) {
          return null;
        }
        return url.url.replace("https://sequentech.io/api/tag/", "");
      };


      scope.getGender = function(option)
      {
        var url = scope.getUrl(option, "Gender");
        if (!url) {
          return null;
        }
        return url.url.replace("https://sequentech.io/api/gender/", "");
      };

      // set options' tag
      scope.tagName = undefined;
      if (angular.isDefined(scope.stateData.question.extra_options)) {
        scope.tagName = scope.stateData.question.extra_options.restrict_choices_by_tag__name;
      }
      _.each(scope.stateData.question.answers, function (element) {
        element.tag = null;
        if (angular.isDefined(scope.tagName) && scope.getTag(element) === scope.tagName) {
          element.tag = scope.tagName;
        }
      });

      /*
        * Toggles selection, if possible.
        */
      scope.toggleSelectItem = function(option) {
        if (option.selected > -1) {
          _.each(scope.stateData.question.answers, function (element) {
            if (element.selected > option.selected) {
              element.selected -= 1;
            }
          });
          option.selected = -1;
        } else {
          // if max options selectable is 1, deselect any other and select
          // this
          if (scope.max === 1) {
            _.each(scope.stateData.question.answers, function (element) {
              if (element.selected > option.selected) {
                element.selected -= 1;
              }
            });
            option.selected = 0;
            return;
          }

          var numSelected = _.filter(scope.stateData.question.answers, function (element) {
            return element.selected > -1;
          }).length;

          // can't select more, flash info
          if (numSelected === parseInt(scope.max,10)) {
            return;
          }

          // check that number of tagged selected does not exceed max
          if (!!scope.tagName) {
            var numTaggedSelected = _.filter(scope.stateData.question.answers, function (element) {
              return element.tag === scope.tagName && element.selected > -1;
            }).length;

            if ((option.tag === scope.tagName && numTaggedSelected === scope.tagMax) ||
              (option.tag !== scope.tagName && numSelected - numTaggedSelected === scope.noTagMax))
            {
              return;
            }
          }

          option.selected = numSelected;
        }
      };

      function isExtraDefined(extra) {
        return angular.isDefined(scope.stateData.question.extra_options) && angular.isDefined(scope.stateData.question.extra_options[extra]);
      }

      // presets support
      scope.stateData.question.presetSelectedSize = 0;
      scope.stateData.question.showPreset = isExtraDefined("recommended_preset__tag");
      scope.showingPreset = scope.stateData.question.showPreset;
      if (!angular.isDefined(scope.stateData.question.presetSelected) || scope.stateData.question.presetSelected === null) {
        scope.stateData.question.presetSelected = null;
      } else {
        scope.stateData.question.presetList = _.filter(
          scope.stateData.question.answers,
          function (answer) {
            return scope.getTag(answer) === scope.stateData.question.extra_options.recommended_preset__tag;
          });

        scope.stateData.question.presetSelected = _.filter(
          scope.stateData.question.presetList,
          function (answer) {
            return answer.selected !== answer.id;
          }).length === 0;

        scope.stateData.question.presetSelectedSize = scope.stateData.question.presetList.length;
      }

      scope.numSelectedOptions = function () {
        return _.filter(
          scope.stateData.question.answers,
          function (element) {
            return element.selected > -1 || element.isSelected === true;
          }).length;
      };

      scope.numTaggedSelectedOptions = function() {
        var val = _.filter(
          scope.stateData.question.answers,
          function (element) {
            return (element.selected > -1 || element.isSelected === true) &&
              element.tag === scope.tagName;
          }).length;
        return val;
      };

      scope.tagMax = null;
      scope.noTagMax = null;
      if (angular.isDefined(scope.stateData.question.extra_options))
      {
        if (angular.isDefined(scope.stateData.question.extra_options.restrict_choices_by_tag__max))
        {
          scope.tagMax = parseInt(scope.stateData.question.extra_options.restrict_choices_by_tag__max, 10);
        }
        if (angular.isDefined(scope.stateData.question.extra_options.restrict_choices_by_no_tag__max))
        {
          scope.noTagMax = parseInt(scope.stateData.question.extra_options.restrict_choices_by_no_tag__max, 10);
        }
      }

      var question = scope.stateData.question;
      if (question.layout === "") {
        question.layout = "simple";
      }
      if (_.contains(['circles'], question.layout)) {
        scope.hideSelection = true;
      }

      // check if there is a default list of options that need to be selected
      if (!question.selectedDefaultSet &&
        question.extra_options &&
        question.extra_options.default_selected_option_ids &&
        angular.isArray(question.extra_options.default_selected_option_ids) &&
        question.extra_options.default_selected_option_ids.length > 0)
      {
        _.each(
          question.answers,
          function (answer)
          {
            if (_.contains(
              question.extra_options.default_selected_option_ids,
              answer.id))
            {
              answer.selected = answer.id;
            } else {
              answer.selected = -1;
            }
          }
        );
        question.selectedDefaultSet = true;
      }

      scope.selectPresets = function () {
        scope.unselectPresets();
        scope.stateData.question.presetSelected = true;
        _.each(
          scope.stateData.question.answers,
          function (answer) {
            if (scope.getTag(answer) === scope.stateData.question.extra_options.recommended_preset__tag) {
              scope.stateData.question.presetSelectedSize += 1;
              scope.toggleSelectItem(answer);
            }
          });
      };

      scope.unselectPresets = function() {
        scope.stateData.question.presetSelectedSize = 0;
        scope.stateData.question.presetSelected = false;
        _.each(
          scope.stateData.question.answers,
          function (answer) {
            answer.selected = -1;
          });
      };
      
      /**
       * Focus on Continue button after closing modal.
       */
      function focusContinueBtn() {
        angular.element.find('#continue-btn')[0].focus();
      }

      scope.presetNext = function() {
        // show null vote warning
        if (scope.stateData.question.presetSelected === null) {
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
                  header: "avBooth.confirmNullVote.header",
                  body: "avBooth.confirmNullVote.body",
                  continue: "avBooth.confirmNullVote.confirm",
                  cancel: "avCommon.cancel"
                };
              }
            }
          }).result.then(function () {
            scope.showingPreset = false;
          }, focusContinueBtn);
          return;
        }

        scope.showingPreset = false;
        if (!scope.stateData.question.presetSelected) {
          return;
        }

        if (scope.stateData.question.presetSelected === true) {
          scope.filteredOptions = _.filter(
            scope.stateData.question.answers,
            function (answer) {
              return scope.getTag(answer) !== scope.stateData.question.extra_options.recommended_preset__tag;
            });
          if (scope.stateData.question.presetSelectedSize === scope.stateData.question.max) {
            scope.next();
          }
        }
      };

      /**
       * Checks that the number of options is consistent with the min/max
       * restrictions specified for the question.
       */
      function checkNumOptions(pipe)
      {
        if (scope.numSelectedOptions() < scope.stateData.question.min)
        {
          if (scope.numSelectedOptions() > 0 ||
            !angular.isDefined(scope.stateData.question.extra_options) ||
            scope.stateData.question.extra_options.force_allow_blank_vote !== "TRUE")
          {
            $("#selectMoreOptsWarning").flash();
            return;
          }
        }

        pipe.continue();
      }

      /**
       * Checks if there is sex parity
       */
      function hasZipBallotParity()
      {
        // sorted selection
        var selection = _.sortBy(
          _.filter(
            scope.stateData.question.answers,
            function (element)
            {
              return element.selected > -1;
            }
          ),
          function(element)
          {
            return element.selected;
          }
        );

        // find if parity is correct
        var result = _.reduce(
          selection,

          // Reducer function. If previous calls found a parity mismatch, then
          // memo.success will be false, and we will directy return it.
          // Otherwise we first find this element gender (H for Male, M for
          // Female), set in the memo that we will return, then check if it is
          // consistent with previous element and if not, change memo.success to
          // false and return.
          function (memo, element)
          {
            if (!memo.success)
            {
              return memo;
            }

            var prevGender = memo.gender;
            memo.gender = scope.getGender(element);
            if (memo.gender === prevGender)
            {
              memo.success = false;
            }

            return memo;
          },
          {
            gender: null,
            success: true
          }
        );
        return result.success;
      }

      /**
       * If parity needs to be applied in the question in the ballot, it is
       * checked here. Will only continue if the check is successful.
       */
      function checkBallotParity(pipe)
      {
        if (isExtraDefined('ballot_parity_criteria') &&
          scope.stateData.question.extra_options.ballot_parity_criteria === 'zip' &&
          !hasZipBallotParity())
        {
          $modal.open({
            templateUrl: "avBooth/warn-ballot-parity-controller/warn-ballot-parity-controller.html",
            controller: "WarnBallotParityController",
            size: 'md'
          }).result.then(focusContinueBtn,focusContinueBtn);
          return;
        }
        pipe.continue();
      }

      /**
       * Check if the ballot is null, and show a warning if so. Will continue
       * if the user accepts willingly.
       */
      function checkNullVote(pipe)
      {
        // show null vote warning
        if (scope.numSelectedOptions() === 0)
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
                  header: "avBooth.confirmNullVote.header",
                  body: "avBooth.confirmNullVote.body",
                  continue: "avBooth.confirmNullVote.confirm",
                  cancel: "avCommon.cancel"
                };
              }
            }
          }).result.then(pipe.continue, focusContinueBtn);
          return;
        }
        pipe.continue();
      }

      /**
       * Executes a pipeline. A pipeline is a list of functions that receive
       * as the first argument the pipe and an extra data (optional) as a second
       * argument. To continue running the pipeline, each pipe needs to
       * explicitly execute pipe.continue(), which will execute the next pipe.
       */
      function runPipeline(pipeline, i, extra)
      {
        if (i === undefined)
        {
          i = 0;
        }

        if (i >= pipeline.length)
        {
          return;
        }

        var el = pipeline[i];
        var data = {
          "continue": function()
          {
            runPipeline(pipeline, i + 1, extra);
          }
        };
        el(data, extra);
      }

      // questionNext calls to scope.next() if user selected enough options.
      // If not, then it flashes the #selectMoreOptsWarning div so that user
      // notices.
      scope.questionNext = function()
      {
        var pipes = [
          checkNumOptions,
       // checkBallotParity, // ballot parity check not allowed by default
          checkNullVote,
          scope.next
        ];

        runPipeline(pipes);
      };
    };

    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/multi-question-directive/multi-question-directive.html'
    };
  });