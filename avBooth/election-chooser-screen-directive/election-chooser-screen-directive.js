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
        function canVote() {
            return _.find(
                scope.credentials,
                function (credentials) {
                    return (
                        credentials.numSuccessfulLogins <= 
                        credentials.numSuccessfulLoginsAllowed
                    );
                }
            ) !== undefined;
        }

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
            childrenInfo.presentation.categories = _.map(
                childrenInfo.presentation.categories,
                function (category) {
                    category.events = _.map(
                        category.events,
                        function (election) {
                            var elCredentials = findElectionCredentials(
                                election.event_id, scope.credentials
                            );
                            return Object.assign(
                                {},
                                election,
                                elCredentials || {},
                                {
                                    disabled: (
                                        !elCredentials ||
                                        (
                                            elCredentials.numSuccessfulLogins >= 
                                            elCredentials.numSuccessfulLoginsAllowed
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

        function chooseElection(election) {
            scope.electionId = election.event_id;
            scope.setState(scope.stateEnum.receivingElection, {});
            scope.retrieveElection();
        }

        scope.canVote = canVote;
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
