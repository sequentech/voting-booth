/**
 * This file is part of agora-gui-booth.
 * Copyright (C) 2021  Agora Voting SL <agora@agoravoting.com>

 * agora-gui-booth is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.

 * agora-gui-booth  is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with agora-gui-booth.  If not, see <http://www.gnu.org/licenses/>.
**/

/*
 * Start screen directive.
 *
 * Shows the steps to the user.
 */
angular.module('avBooth')
  .directive('avbElectionChooserScreen',  function($window) {

    function link(scope, element, attrs) {
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

        function getElectionCredentials() {
            // need to reload in case this changed in success screen..
            var credentials = [];
            var credentialsStr = $window.sessionStorage.getItem("vote_permission_tokens");
            return JSON.parse(credentialsStr);
        }

        function generateChildrenInfo() {
            var childrenInfo = angular.copy(
                scope.parentAuthEvent.children_election_info
            );

            // need to reload in case this changed in success screen..
            var credentials = getElectionCredentials();

            // if it's a demo, yes, allow voting by default
            scope.canVote = scope.isDemo;
            scope.hasVoted = false;
            childrenInfo.presentation.categories = _.map(
                childrenInfo.presentation.categories,
                function (category) {
                    category.events = _.map(
                        category.events,
                        function (election) {
                            var elCredentials = findElectionCredentials(
                                election.event_id, credentials
                            );
                            if (calculateCanVote(elCredentials)) {
                                scope.canVote = true;
                            }
                            if (
                                elCredentials && 
                                elCredentials.numSuccessfulLogins > 0
                            ) {
                                scope.hasVoted = true;
                            }
                            return Object.assign(
                                {},
                                election,
                                elCredentials || {},
                                {
                                    disabled: (
                                        !scope.isDemo &&
                                        !calculateCanVote(elCredentials)
                                    )
                                }
                            );
                        }
                    );
                    return category;
                });
            return childrenInfo;
        }

        function chooseElection(electionId) {
            scope.setState(scope.stateEnum.receivingElection, {});
            scope.retrieveElectionConfig(electionId + "");
        }

        scope.childrenElectionInfo = generateChildrenInfo();
        var disableElectionChooser = (
            scope.parentElection &&
            scope.parentElection.presentation &&
            scope.parentElection.presentation.extra_options &&
            !!scope.parentElection.presentation.extra_options.disable__election_chooser_screen
        );

        // if election chooser is disabled and can vote, then go to the first
        // election in which it can vote
        if (disableElectionChooser && scope.canVote) {
            var credentials = getElectionCredentials();
            var orderedElectionIds = scope.childrenElectionInfo.natural_order;
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
        }
        scope.chooseElection = chooseElection;
    }

    return {
      restrict: 'AE',
      scope: true,
      link: link,
      templateUrl: 'avBooth/election-chooser-screen-directive/election-chooser-screen-directive.html'
    };
  });
