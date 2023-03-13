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
 * Audit ballot screen directive.
 *
 * Shows the auditable ballot to the user and explains how to audit it.
 */
angular.module('avBooth')
  .directive('avbAuditBallotScreen', function(DeterministicJsonStringifyService, ConfigService) {
    var link = function(scope, element, attrs) {
      scope.auditableBallotStr = DeterministicJsonStringifyService(
        scope.stateData.auditableBallot);
      scope.organization = ConfigService.organization;

      scope.selectDiv = function (event) {
        // copied from https://code.google.com/p/marinemap/source/browse/media/common/js/jquery/jquery.selText.js?spec=svn1ba72406afc078e007c701b29923a962b5867cc1&r=bf89d8ebf3d34b7185dac20e7064886a8021edf5
        var obj = $(event.target)[0];
        var range = null;
        var selection = null;
        if (/*@cc_on!@*/false) { // ie
            range = obj.offsetParent.createTextRange();
            range.moveToElementText(obj);
            range.select();
        } else if ('MozBoxSizing' in document.body.style || window.opera) { // FF or opera
            selection = obj.ownerDocument.defaultView.getSelection();
            range = obj.ownerDocument.createRange();
            range.selectNodeContents(obj);
            selection.removeAllRanges();
            selection.addRange(range);
        } else { // chrome
            selection = obj.ownerDocument.defaultView.getSelection();
            selection.setBaseAndExtent(obj, 0, obj, 1);
        }
      };

      scope.printBallot = function ()
      {
        window.print();
      };
    };
    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/audit-ballot-screen-directive/audit-ballot-screen-directive.html'
    };
  });