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

/**
 * Replacement for JSON.stringify in cases where the output needs to be
 * reproducable. In those cases, we have to sort the dictionaries before
 * stringifying them, something that JSON.stringify doesn't do.
 */
angular.module('avCrypto')
  .service('DeterministicJsonStringifyService', function() {
    function stringify(obj) {
        var i;
        if (Array.isArray(obj)) {
            var serialized = [];
            for(i = 0; i < obj.length; i++) {
                serialized.push(stringify(obj[i]));
            }
            return "[" + serialized.join(",") + "]";
        } else if (typeof(obj) === 'object') {
            if (obj == null) {
                return "null";
            }
            var sortedKeys = Object.keys(obj).sort();
            var arr = [];
            for(i = 0; i < sortedKeys.length; i++) {
                var key = sortedKeys[i];
                var value = obj[key];
                key = JSON.stringify(key);
                value = stringify(value);
                arr.push(key + ':' + value);
            }
            return "{" + arr.join(",") + "}";
        } else {
            return JSON.stringify(obj);
        }
    }
    return stringify;
  });