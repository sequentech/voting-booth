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

/* jshint ignore:start */
exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  frameworks: ['jasmine'],
  specs: [
    'avAdmin/new-election-send-webspec.js',
    'avUi/affix-bottom-directive-webspec.js',
    'avUi/affix-top-directive-webspec.js',
    'avUi/collapsing-directive-webspec.js',
    'test/dynamic-directive-webspec.js'
  ],
  jasmineNodeOpts: {
    defaultTimeoutInterval: 30000
  },
  baseUrl: 'http://localhost:9001'
}
/* jshint ignore:end */
