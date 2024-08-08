/**
 * This file is part of voting-booth.
 * Copyright (C) 2024  Sequent Tech Inc <legal@sequentech.io>

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
  .directive('avbVoterEligibilityScreen',  function($window, $timeout, $q, $modal, ConfigService) {

    function link(scope, element, attrs) {
      scope.showSkippedElections = false;
      scope.organization = ConfigService.organization;
      function findElectionCredentials(electionId, credentials) {
          return _.find(
              credentials,
              function (credential) {
                  return credential.electionId === electionId;
              }
          );
      }

      function calculateCanVote(elCredentials) {
          return (
              !!elCredentials &&
              !!elCredentials.token &&
              (
                  elCredentials.numSuccessfulLogins < elCredentials.numSuccessfulLoginsAllowed ||
                  elCredentials.numSuccessfulLoginsAllowed === 0
              )
          );
      }

      function calculateIsVoter(elCredentials) {
          return (
              !!elCredentials &&
              elCredentials.numSuccessfulLoginsAllowed !== -1
          );
      }

      function getElectionCredentials() {
          // need to reload in case this changed in success screen..
          var credentialsStr = $window.sessionStorage.getItem("vote_permission_tokens");
          return JSON.parse(credentialsStr);
      }

      function isChooserDisabled() {
          return (
              scope.parentElection &&
              scope.parentElection.presentation &&
              scope.parentElection.presentation.extra_options &&
              !!scope.parentElection.presentation.extra_options.disable__election_chooser_screen
          );
      }

      function generateChildrenInfo() {
          var childrenInfo = angular.copy(
              scope.parentAuthEvent.children_election_info
          );

          // need to reload in case this changed in success screen..
          var credentials = getElectionCredentials();

          // if it's a demo, yes, allow voting by default
          scope.canVote = scope.isDemo || scope.isPreview;
          scope.hasVoted = false;
          scope.skippedElections = [];
          childrenInfo.presentation.categories = _.map(
              childrenInfo.presentation.categories,
              function (category) {
                  category.events = _.map(
                      category.events,
                      function (election) {
                          var elCredentials = findElectionCredentials(
                              election.event_id, credentials
                          );
                          var canVote = calculateCanVote(elCredentials);
                          var isVoter = calculateIsVoter(elCredentials);
                          if (
                              elCredentials && 
                              elCredentials.numSuccessfulLogins > 0
                          ) {
                              scope.hasVoted = true;
                          }
                          var retValue = Object.assign(
                              {},
                              election,
                              elCredentials || {},
                              {
                                  disabled: (!scope.isDemo && !scope.isPreview && !canVote),
                                  hidden: (!scope.isDemo && !scope.isPreview && !isVoter)
                              }
                          );
                          if (!!retValue.skipped) {
                              scope.skippedElections.push(retValue);
                          }
                          return retValue;
                      }
                  );
                  return category;
              });
          return childrenInfo;
      }

      function getChildrenElectionsData() {
          if (!scope.childrenElectionInfo || isChooserDisabled()) {
              return;
          }

          _.map(
              scope.childrenElectionInfo.presentation.categories,
              function (category) {
                  _.map(
                      category.events,
                      function (event) {
                          if (event.hidden) {
                              return {};
                          }
                          return scope.simpleGetElection(event.event_id).then(
                              function (electionData) {
                                  event.electionData = electionData;
                                  $timeout(function () {
                                      scope.$apply();
                                  });
                              }
                          );
                      }
                  );
              }
          );
      }

      function chooseElection(electionId) {
          scope.setState(scope.stateEnum.receivingElection, {});
          scope.retrieveElectionConfig(electionId + "");
      }

      scope.childrenElectionInfo = generateChildrenInfo();
      getChildrenElectionsData();

      function checkDisabled() {
          // if election chooser is disabled and can vote, then go to the first
          // election in which it can vote
          if (isChooserDisabled()) {
              var orderedElectionIds = scope
                  .childrenElectionInfo
                  .natural_order;
              // If it's a demo booth, do not rely on election credentials
              if (scope.isDemo || scope.isPreview) {
                  scope.increaseDemoElectionIndex();
                  if (scope.demoElectionIndex < orderedElectionIds.length) {
                      chooseElection(
                          orderedElectionIds[scope.demoElectionIndex]
                      );
                  } else {
                      scope.hasVoted = true;
                      scope.canVote = false;
                  }
                  return;
              }

              var credentials = getElectionCredentials();
              for (var i = 0; i < orderedElectionIds.length; i++) {
                  var electionId = orderedElectionIds[i];
                  var elCredentials = findElectionCredentials(
                      electionId,
                      credentials
                  );
                  if (
                      !elCredentials.skipped &&
                      !elCredentials.voted &&
                      calculateCanVote(elCredentials)
                  ) {
                      chooseElection(electionId);
                      return;
                  }
              }
              // If redirected to no election but there are skipped elections, it
              // means that the voter can re-login to vote again so we set the
              // showSkippedElections flag
              if (scope.skippedElections.length > 0) {
                  scope.showSkippedElections = true;
              }
          }
      }

      checkDisabled();
      scope.chooseElection = chooseElection;
      scope.goToVoterEligibility = function () {
          scope.setState(scope.stateEnum.voterEligibilityScreen, {});
      };
    }
    return {
      restrict: 'AE',
      scope: true,
      link: link,
      templateUrl: 'avBooth/voter-eligibility-screen-directive/voter-eligibility-screen-directive.html'
    };
  });
