/**
 * This file is part of voting-booth.
 * Copyright (C) 2023  Sequent Tech Inc <felix@sequentech.io>

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
 * i18n-override directive.
 */

angular
  .module('avBooth')
  .filter(
    'customI18n',
    function()
    {
      return function(data, key)
      {
        var suffix = "_i18n";
        var lang = window.i18n.lng();
        var value = '';
        if (_.isString(key) && _.isObject(data) && _.isString(lang)) {
            value = data[key + suffix] && data[key + suffix][lang] || data[key] || value;
        }
        return value;
      };
    }
  );

