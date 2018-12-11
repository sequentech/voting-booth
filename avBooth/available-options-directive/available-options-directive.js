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
 * Available Options directive.
 *
 * Lists the available options for a question, allowing to change selection.
 */
angular.module('avBooth')
  .directive(
    'avbAvailableOptions',
    function($filter, $cookies, $modal)
    {

      var link = function(scope, element, attrs)
      {
        scope.options = scope.question.answers;
        scope.tagMax = null;
        scope.noTagMax = null;

        // This counter is used to show a popup when many clicks selecting options
        // in a category to select all
        scope.question.lastCategorySelected = {
          name: null,
          clicks: 0
        };

        if (angular.isDefined(scope.question.extra_options))
        {
          if (angular.isDefined(scope.question.extra_options.restrict_choices_by_tag__max))
          {
            scope.tagMax = parseInt(scope.question.extra_options.restrict_choices_by_tag__max, 10);
          }
          if (angular.isDefined(scope.question.extra_options.restrict_choices_by_no_tag__max))
          {
            scope.noTagMax = parseInt(scope.question.extra_options.restrict_choices_by_no_tag__max, 10);
          }
        }

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
          return url.url.replace("https://agoravoting.com/api/tag/", "");
        };

        if (scope.question.presetSelected === true) {
          scope.options = _.filter(
            scope.question.answers,
            function (answer) {
              return scope.getTag(answer) !== scope.question.extra_options.recommended_preset__tag;
            });
        }

        // initialize selection
        scope.tagName = undefined;
        if (scope.question.extra_options) {
          scope.tagName = scope.question.extra_options.restrict_choices_by_tag__name;
        }
        _.each(scope.options, function (element) {
          if (element.selected === undefined) {
            element.selected = -1;
          }
        });

        /*
         * Clear selection
         */
        scope.clearSelection = function () {
          _.each(scope.options, function (element) {
            if (element.selected !== -1) {
              element.selected = -1;
            }
          });
        };

        scope.numSelectedOptions = function () {
          return _.filter(
            scope.options,
            function (element) {
              return element.selected > -1 || element.isSelected === true;
            }).length;
        };

        /*
         * Toggles selection, if possible.
         */
        scope.toggleSelectItem = function(option) {
          if (option.selected > -1) {
            _.each(scope.question.answers, function (element) {
              if (element.selected > option.selected) {
                element.selected -= 1;
              }
            });
            option.selected = -1;

            // restart lastCategorySelected count
            scope.question.lastCategorySelected = {
                name: null,
                clicks: 0
            };
          } else {
            // if max options selectable is 1, deselect any other and select
            // this
            if (scope.max === 1) {
              _.each(scope.question.answers, function (element) {
                if (element.selected > option.selected) {
                  element.selected -= 1;
                }
              });
              option.selected = 0;
              return;
            }

            var numSelected = _.filter(scope.question.answers, function (element) {
              return element.selected > -1;
            }).length;

            // can't select more, flash info
            if (numSelected === parseInt(scope.max,10)) {
              return;
            }

            // check that number of tagged selected does not exceed max
            if (!!scope.tagName) {
              var numTaggedSelected = _.filter(scope.question.answers, function (element) {
                return element.tag === scope.tagName && element.selected > -1;
              }).length;

              if ((option.tag === scope.tagName && numTaggedSelected === scope.tagMax) ||
                (option.tag !== scope.tagName && numSelected - numTaggedSelected === scope.noTagMax))
              {
                return;
              }
            }

            option.selected = numSelected;

            // update last category selected
            if (scope.question.lastCategorySelected.name === option.category)
            {
              scope.question.lastCategorySelected.clicks += 1;

              // if many clicks, show dialog to select all
              if (scope.question.lastCategorySelected.clicks === 3 &&
                !$cookies["do_not_show_select_all_category_dialog"] &&
                scope.question.lastCategorySelected.name !== null)
              {
                $modal.open({
                  templateUrl: "avBooth/select-all-category-controller/select-all-category-controller.html",
                  controller: "SelectAllCategoryController",
                  size: 'md'
                }).result.then(scope.selectAllLastCategory);
              }
            }
            else
            {
              scope.question.lastCategorySelected = {
                name: option.category,
                clicks: 0
              };
            }
          }
        };

        // Try to select all the options in a category. Called only by the
        // select all category controller when many options of a category have
        // been selected sequentially
        scope.selectAllLastCategory = function()
        {
          var numSelected = _.filter(
            scope.question.answers,
            function (element) {
              return element.selected > -1;
            }
          ).length;

          _.each(
            scope.groupedOptions,
            function(option)
            {
              if (option.selected <= -1 && numSelected < parseInt(scope.max,10))
              {
                scope.toggleSelectItem(option);
                numSelected++;
              }
            }
          );
        };

        // TODO: only use this when localeCompare is unavailable
        function removeAccents(value) {
          return value
            .replace(/á/g, 'a')
            .replace(/é/g, 'e')
            .replace(/í/g, 'i')
            .replace(/ó/g, 'o')
            .replace(/ú/g, 'u')
            .replace(/ñ/g, 'n');
        }

        // filter function that filters option.value ignoring accents
        function ignoreAccents(item) {
            if (!scope.filter) {
              return true;
            }

            var text = removeAccents(item.text.toLowerCase());
            var filter = removeAccents(scope.filter.toLowerCase());
            return text.indexOf(filter) > -1;
        }


        function updateFilteredOptions() {
          scope.filteredOptions = $filter('filter')(scope.options, ignoreAccents);
        }

        scope.$watch("filter", updateFilteredOptions);
        updateFilteredOptions();
    };

    return {
      restrict: 'AE',
      scope: {
        // max number of selected options allowed
        max: '=',

        // min number of selected options allowed
        min: '=',

        // list of options
        question: '=',

        // layout, changes the way the options are rendered
        layout: '=',

        // only if max is 1 and autoSelectAnother is true, then selecting
        // an option automatically removes any previous selection if any.
        autoSelectAnother: '=',

        // text used to filter the shown options
        filter: '@'
      },
      link: link,
      templateUrl: 'avBooth/available-options-directive/available-options-directive.html'
    };
  }
);
