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
 * Casting Ballot Screen directive.
 *
 * Shown while the ballot is being encrypted and sent.
 */
angular.module('avBooth')
  .directive('avbCastingBallotScreen', function($i18next, CastBallotService, $timeout, $window, InsideIframeService) {
    function link(scope, element, attrs) {
      // moves the title on top of the busy indicator
      scope.updateTitle = function(title) {
        var titleEl = element.find(".avb-busy-title").html(title);

        // set margin-top
        var marginTop = - titleEl.height() - 45;
        var marginLeft = - titleEl.width()/2;
        titleEl.attr("style", "margin-top: " + marginTop + "px; margin-left: " + marginLeft + "px");
      };

      // function that receives updates from the cast ballot service and shows
      // them to the user
      function statusUpdateFunc(status, options) {
        if (status === "sendingBallot") {
          scope.updateTitle($i18next.t(
            "avBooth.sendingBallot",
            {percentage: options.percentageCompleted}));
          scope.stateData.ballotHash = options.ballotHash;
          scope.percentCompleted = options.percentageCompleted;
        }
      }

      function castBallot() {
        var castingInfo = {
          election: scope.election,
          pubkeys: scope.pubkeys,
          statusUpdate: statusUpdateFunc,
          authorizationHeader: scope.authorizationHeader,
          castBallotUrl: scope.baseUrl + "election/" + scope.electionId + "/voter/" + scope.voterId,
          encryptedBallot: scope.stateData.encryptedBallot,

          // on success, we first then try to submit, then once submitted we
          // show the next screen (which is the success-screen directive)
          success: function(ballotResponse) {
            scope.updateTitle($i18next.t("avBooth.sendingBallot", {percentage: 100}));
            scope.percentCompleted = 100;
            scope.stateData.ballotResponse = ballotResponse;
            scope.next();
          },

          // on error, try to deal with it
          error: function (errorCode, httpCode) {
            scope.showError("avBooth.errorScreen.codes." + (errorCode || "UNEXPECTED_ERROR"), undefined, httpCode);
          },
          verify: false,
        };
        CastBallotService(castingInfo);
      }

      var credentialsStr = $window.sessionStorage.getItem("vote_permission_tokens");
      if (!credentialsStr && InsideIframeService()) {
        scope.setAuthorizationReceiver(castBallot, function() {
          scope.showError("avBooth.couldntSendBallotUnauthorized",
            {msg:"error-receiving-hmac"});
        });
      $window.top.postMessage(
        "avRequestAuthorization:" +
        angular.toJson({
          permission: "vote",
          object_type: "election",
          object_id: scope.electionId
        }), '*');
      } else {
        castBallot();
      }
    }

    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/casting-ballot-screen-directive/casting-ballot-screen-directive.html'
    };
  });
