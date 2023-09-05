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
 * Directive that shows an accordion option.
 */
angular.module('avBooth')
  .directive('avbAccordionOption', function($sce, IsService) {

    var link = function(scope, element, attrs) {
      scope.isTouchDevice = IsService.touchDevice();
      scope.urls = _.object(_.map(scope.option.urls, function(url) {
        return [url.title, url.url];
      }));

      /**
       * Returns the answer's urls as an associative array
       */
      scope.getUrls = function (answer) {
        return _.object(_.map(answer.urls, function(url) {
          return [url.title, url.url];
        }));
      };

      // check is youtube
      scope.isYoutube = function (answer) {
        var url = scope.getUrls(answer)['Image URL'];
        if (!url) {
          return false;
        }

        if (url.indexOf("https://youtube.com/embed/") === 0) {
          return $sce.trustAsResourceUrl(url);
        }

        if (url.indexOf("https://www.youtube.com/watch?v=") === 0) {
          return $sce.trustAsResourceUrl(url
          .replace("/watch?v=", "/embed/")
          .replace("&feature=youtu.be", ""));
        }

        if (url.indexOf("https://youtu.be/") === 0) {
          return $sce.trustAsResourceUrl(url
          .replace("https://youtu.be/", "https://youtube.com/embed/")
          .replace("&feature=youtu.be", ""));
        }

        return false;
      };

      scope.showCategory = false;
      if (!!attrs.showCategory) {
        scope.showCategory = true;
      }

      scope.showSelectedPos = false;
      if (!!attrs.showSelectedPos) {
        scope.showSelectedPos = true;
      }

      scope.showPoints = false;

      if (angular.isDefined(scope.question.extra_options) &&
          !!scope.question.extra_options.show_points) {
        scope.showPoints = true;
      }

      /**
       * @returns number of points this ballot is giving to this option
       */
      scope.getPoints = function ()
      {
        if (!scope.showPoints) {
          return 0;
        }
        if (scope.option.selected < 0) {
          return 0;
        }
        return {
          "plurality-at-large": function ()
          {
            return 1;
          },
          "borda": function()
          {
            return scope.question.max - scope.option.selected;
          },
          "borda-mas-madrid": function()
          {
            return scope.question.max - scope.option.selected;
          },
          "borda-nauru": function()
          {
            return "1/" + (1 + scope.option.selected);
          },
          "pairwise-beta": function()
          {
            return;
          },
          "desborda3": function()
          {
            return Math.max(1, Math.floor(scope.question.num_winners * 1.3) - scope.option.selected);
          },
          "desborda2": function()
          {
            return Math.max(1, Math.floor(scope.question.num_winners * 1.3) - scope.option.selected);
          },
          "desborda": function()
          {
            return 80 - scope.option.selected;
          }
        }[scope.question.tally_type]();
      };

      scope.isPreset = (scope.showSelectedPos && scope.presetSelectedSize > 0 && scope.option.selected - scope.presetSelectedSize < 0);
    };

    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/accordion-option-directive/accordion-option-directive.html'
    };
  });
