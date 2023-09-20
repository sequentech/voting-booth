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

angular.module('avBooth')
  .factory('SearchFilter', function($filter) {
    var service = {};

    service.isStringContained = function (searchTerm, text) {
        // convert to lower case to make comparison case-insensitive
        searchTerm = searchTerm.toLocaleLowerCase('en-US');
        text = text.toLocaleLowerCase('en-US');
        // transform accented letters into their decomposed form
        searchTerm = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");  
        // match and remove all accents
        text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // split the search by '*'
        var searchParts = searchTerm.split("*");
        // remove empty strings from multiple * in a row or initial/end *
        searchParts = searchParts.filter(function (part) { return part.length > 0; });

        // Loop through each part
        var lastIdx = 0;
        for (var part of searchParts) {
            // Find the part in the text, starting from the last index found
            var idx = text.indexOf(part, lastIdx);

            // If the part is not found, or if it's found before the last part, return false
            if (idx < 0) {
                return false;
            }

            // Update the last index found to after the current part
            lastIdx = idx + part.length;
        }

        // If we get through the loop without returning false, then the search term is contained in the text
        return true;
    };

    service.isSelectedAnswer = function (searchText, answer) {
        var filter = searchText.trim().toLowerCase();

        // doesn't apply if there's no filter
        if (0 === filter.length) {
            return true;
        }

        var inputs = [
            ($filter('customI18n')(answer, 'text') || "").toLowerCase(),
            ($filter('customI18n')(answer, 'details') || "").toLowerCase(),
            ($filter('customI18n')(answer, 'category') || "").toLowerCase()
        ];
        return inputs.map(function (text) {
            return service.isStringContained(filter, text);
        }).some(function (val) { return val; });

    };

    return service;
  });