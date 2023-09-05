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
  .factory('SearchFilter', function() {
    var service = {};

    function isStringContained(searchTerm, text) {
        // convert to lower case to make comparison case-insensitive
        searchTerm = searchTerm.toLocaleLowerCase('en-US');
        text = text.toLocaleLowerCase('en-US');
        // transform accented letters into their decomposed form
        searchTerm = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");  
        // match and remove all accents
        text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
        return text.includes(searchTerm);
    }

    service.isSelectedAnswer = function (searchText, answer) {
        var filter = searchText.trim().toLowerCase();

        // doesn't apply if there's no filter
        if (0 === filter.length) {
            return true;
        }

        var inputs = [
            (answer.text || "").toLowerCase(),
            (answer.details || "").toLowerCase()
        ];
        inputs.map(function (text) {
            return isStringContained(filter, text);
        }).some(function (val) { return val; });

    };

    return service;
  });