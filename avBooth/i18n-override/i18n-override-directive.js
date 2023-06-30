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
  .directive(
    'i18nOverride',
    function()
    {
      function link(scope, _element, attrs)
      {
        var suffix = "_i18n";
        var data = attrs.i18nOverride;
        var key = attrs.key;
        var lang = window.i18n.lng();
        scope.value = '';
        if (_.isString(key) && _.isObject(data) && _.isString(lang)) {
            scope.value = data[key + suffix] && data[key + suffix][lang] || data[key] || scope.value;
        }
      }
 
      return {
        restrict: 'AE',
        link: link,
        template: '{{value}}'
      };
    }
  );

