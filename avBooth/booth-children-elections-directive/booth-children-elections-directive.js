/**
 * This file is part of admin-console.
 * Copyright (C) 2020  Sequent Tech Inc <legal@sequentech.io>

 * admin-console is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.

 * admin-console  is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with admin-console.  If not, see <http://www.gnu.org/licenses/>.
**/

angular.module('avUi')
  .directive(
    'avBoothChildrenElections', 
    function(ConfigService, moment, $window) 
    {
      // we use it as something similar to a controller here
      function link(scope, element, attrs) 
      {
        scope.electionsById = {};
        scope.selectedElectionId = scope.parentElectionId;
        scope.hideParent = (attrs.hideParent === 'true');

        scope.hidePublicHome = scope.parentElection.presentation &&
          scope.parentElection.presentation.extra_options &&
          scope.parentElection.presentation.extra_options.disable__public_home;

        // process each election
        _.each(
          scope.childrenElectionInfo.presentation.categories,
          function (category) 
          {
            category.hidden = true;
            _.each(
              category.events,
              function (election) 
              {
                if (
                  scope.mode === 'checkbox' ||
                  scope.mode === 'toggle-and-callback'
                ) 
                {
                  election.data = election.data || false;
                  election.disabled = election.disabled || false;
                  election.hidden = election.hidden || false;
                  if (!election.hidden) {
                    category.hidden = false;
                  }
                }
              }
            );
          }
        );

        // add a processElection function
        scope.click = function (election) 
        {
          if (!scope.canVote) {
            console.log("user cannot vote, so ignoring click");
            return;
          }
          if (scope.hasVoted) {
            console.log("user has already voted, so ignoring click");
          }
          console.log("click to election.event_id = " + election.event_id);
          if (election.disabled) {
            console.log("election disabled, so ignoring click");
            return;
          }
          if (scope.mode === 'checkbox') 
          {
            election.data = !election.data;
          } 
          else if (scope.mode === 'toggle-and-callback')
          {
            scope.selectedElectionId = election.event_id;
            scope.callback({electionId: election.event_id});
          }
        };

        scope.formatDate = function (textDate) {
          return moment(new Date(textDate)).format("D MMM, HH:mm");
        };

        scope.checkElectionStarted = function (election) {
          return !!election && ["started", "resumed"].includes(election.state);
        };
  
        scope.checkElectionScheduled = function (election) {
          return !!election && !scope.checkElectionStarted(election) &&
            !!election.startDate &&
            new Date(election.startDate) > new Date();
        };
  
        scope.checkElectionClosed = function (election) {
          return !!election && !scope.checkElectionScheduled(election) && !scope.checkElectionStarted(election);
        };

        scope.hasVotedElection = function (election) {
          return !!election && election.numSuccessfulLogins > 0;
        };

        scope.canVoteElection = function (election) {
          if (scope.canVote) {
            return true;
          }

          return !!election && 
            ( election.numSuccessfulLoginsAllowed === 0 ||
              election.numSuccessfulLogins < election.numSuccessfulLoginsAllowed);
        };
      }

      return {
        restrict: 'AE',
        scope:  {
          mode: '@',
          callback: '&?',
          parentElectionId: '@?',
          parentElection: '=',
          childrenElectionInfo: '=',
          canVote: '=',
          hasVoted: '=',
          skippedElections: '=',
          showSkippedElections: '='
        },
        link: link,
        templateUrl: 'avBooth/booth-children-elections-directive/booth-children-elections-directive.html'
      };
    }
  );
