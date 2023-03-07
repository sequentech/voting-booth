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
 * Review screen directive.
 *
 * Shows the steps to the user.
 */
angular.module('avBooth')
  .directive('avbReviewScreen', function(ConfigService, $modal) {

    var link = function(scope, element, attrs) {
      scope.organization = ConfigService.organization;
      scope.ballotHashClicked = false;

      // used to display pairwise comparison in a different manner
      _.each(scope.election.questions, function (q) {
        q.isPairWise = _.contains(['pairwise-beta'], q.tally_type);
      });
      
      /**
       * Focus on Continue button after closing modal.
       */
      function focusContinueBtn() {
        angular.element.find('#continue-btn')[0].focus();
      }

      scope.confirmAudit = function()
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
                header: "avBooth.confirmAuditBallot.header",
                body: "avBooth.confirmAuditBallot.body",
                continue: "avBooth.confirmAuditBallot.confirm",
                cancel: "avBooth.confirmAuditBallot.cancel"
              };
            }
          }
        }).result.then(scope.audit, focusContinueBtn);
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
                cancel: "avBooth.hashForVoteNotCastModal.cancel"
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

      scope.audit = function() {
        scope.stateData.auditClicked = true;
        scope.next();
      };
    };
    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/review-screen-directive/review-screen-directive.html'
    };
  });