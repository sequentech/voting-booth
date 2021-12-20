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
 * Selected Options filter.
 *
 * Given the list of selected options, it filters and sorts the output list
 * by selection.
 */
angular.module('avBooth')
  .filter('avbSelectedOptions', function() {
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

    return function(optionList) {
      var filtered = _.filter(optionList, function (option) {
          return (
            !hasUrl(option.urls, 'invalidVoteFlag', 'true')
            && (
              option.selected > -1 ||
              option.isSelected === true
            )
          );
      });

      if (filtered.length === 0) {
        return [];
      }

      // if selection is boolean, do not sort by orderer
      if (filtered[0].isSelected === true) {
        return filtered;
      }

      return _.sortBy(filtered, function (option) {
        return option.selected;
      });
    };
  });