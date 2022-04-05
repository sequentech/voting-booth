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
describe("dynamic-directive tests", function () {

  beforeEach(function () {
    var html = '<textarea id="testTextArea" ng-model="testModel" ng-init="testModel = \'whatever\'"></textarea>';
    browser.get('/#/unit-test-e2e?html=' + encodeURIComponent(html));
  });

  it("dynamic directive should work with content with angular directives", function () {
    expect($('#testTextArea').isPresent()).toBe(true);
    expect($('#testTextArea').getAttribute("ng-model")).toBe("testModel");
    expect($('#testTextArea').getAttribute("value")).toBe("whatever");
  });

});
/* jshint ignore:end */