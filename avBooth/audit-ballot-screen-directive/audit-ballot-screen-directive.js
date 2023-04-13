/**
 * This file is part of voting-booth.
 * Copyright (C) 2015-2023  Sequent Tech Inc <legal@sequentech.io>

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
  .directive('avbAuditBallotScreen', function($window, $modal, DeterministicJsonStringifyService, ConfigService) {
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

      scope.copyToClipboard = function () 
      {
        navigator.clipboard.writeText(scope.auditableBallotStr);
      };

      scope.printBallot = function ()
      {
        window.print();
      };

      scope.downloadBallot = function ()
      {
        var blob = new $window.Blob([scope.auditableBallotStr], {type: "text/json"});
        $window.saveAs(blob, scope.election.id + "-ballot"+".json");
      };

      scope.showAuditBtn = !scope.election.presentation.extra_options || !scope.election.presentation.extra_options.disable_voting_booth_audit_ballot;
      scope.tutorialLink = "https://github.com/sequentech/ballot-verifier/blob/master/README.md";

      scope.downloadHelp = function()
      {
        $modal.open({
          ariaLabelledBy: 'modal-title',
          ariaDescribedBy: 'modal-body',
          templateUrl: "avBooth/invalid-answers-controller/invalid-answers-controller.html",
          controller: "InvalidAnswersController",
          size: 'md',
          resolve: {
            errors: function() { return []; },
            data: function() {
              return {
                errors: [],
                header: "avBooth.auditBallotScreen.downloadHelpModal.header",
                body: "avBooth.auditBallotScreen.downloadHelpModal.body",
                continue: "avBooth.auditBallotScreen.downloadHelpModal.confirm",
                kind: "info"
              };
            }
          }
        });
      };

      scope.tutorialHelp = function()
      {
        $modal.open({
          ariaLabelledBy: 'modal-title',
          ariaDescribedBy: 'modal-body',
          templateUrl: "avBooth/invalid-answers-controller/invalid-answers-controller.html",
          controller: "InvalidAnswersController",
          size: 'md',
          resolve: {
            errors: function() { return []; },
            data: function() {
              return {
                errors: [],
                header: "avBooth.auditBallotScreen.tutorialHelpModal.header",
                body: "avBooth.auditBallotScreen.tutorialHelpModal.body",
                continue: "avBooth.auditBallotScreen.tutorialHelpModal.confirm",
                kind: "info"
              };
            }
          }
        });
      };

      scope.ballotHashWarning = function ()
      {
        if (scope.ballotHashClicked) {
          return false;
        }
        $modal.open({
          ariaLabelledBy: 'modal-title',
          ariaDescribedBy: 'modal-body',
          templateUrl: "avBooth/invalid-answers-controller/invalid-answers-controller.html",
          controller: "InvalidAnswersController",
          size: 'md',
          resolve: {
            errors: function() { return []; },
            data: function() {
              return {
                errors: [],
                header: "avBooth.hashForVoteNotCastModal.header",
                body: "avBooth.hashForVoteNotCastModal.body",
                continue: "avBooth.hashForVoteNotCastModal.confirm",
                cancel: "avBooth.hashForVoteNotCastModal.cancel",
                kind: 'info'
              };
            }
          }
        }).result.then(
          function ()
          {
            scope.ballotHashClicked = true;
          }
        );
      };
      scope.fixToBottom = scope.checkFixToBottom();
    };
    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/audit-ballot-screen-directive/audit-ballot-screen-directive.html'
    };
  });