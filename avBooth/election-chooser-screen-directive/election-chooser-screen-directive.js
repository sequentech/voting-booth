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
  .directive('avbElectionChooserScreen',  function() {

    function link(scope, element, attrs) {
        function findElectionCredentials(electionId, credentials) {
            return _.find(
                credentials,
                function (credential) {
                    return credential.electionId === electionId;
                }
            );
        }

        function generateChildrenInfo() {
            var childrenInfo = angular.copy(
                scope.parentAuthEvent.children_election_info
            );
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
                                election.event_id, scope.credentials
                            );
                            if (
                                !!elCredentials &&
                                !!elCredentials.token &&
                                (
                                    elCredentials.numSuccessfulLogins < elCredentials.numSuccessfulLoginsAllowed ||
                                    elCredentials.numSuccessfulLoginsAllowed === 0
                                )
                            ) {
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
                                        (
                                            !elCredentials ||
                                            !(elCredentials.token) ||
                                            (
                                                elCredentials.numSuccessfulLogins >= 
                                                elCredentials.numSuccessfulLoginsAllowed &&
                                                elCredentials.numSuccessfulLoginsAllowed > 0
                                            )
                                        )
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
        scope.chooseElection = chooseElection;
    }

    return {
      restrict: 'AE',
      scope: true,
      link: link,
      templateUrl: 'avBooth/election-chooser-screen-directive/election-chooser-screen-directive.html'
    };
  });
