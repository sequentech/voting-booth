/**
 * This file is part of agora-gui-booth.
 * Copyright (C) 2015-2016  Agora Voting SL <agora@agoravoting.com>

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

angular.module('avBooth')
  .directive('avBooth', function(
    $modal,
    $http,
    $i18next,
    $timeout,
    $window,
    Authmethod,
    ConfigService,
    HmacService,
    InsideIframeService
  ) {
    // we use it as something similar to a controller here
    function link(scope, element, attrs) {
      // timeout is used with updateWidth so that we do not create too many
      // calls to it, at most one per 100ms
      var timeoutWidth;
      var w = angular.element($window);
      $("#theme").attr("href", "booth/themes/" + ConfigService.theme + "/app.min.css");
      //window.avThemes.change(ConfigService.theme);

      // when we are not inside an iframe and voter id is not set, this is a
      // demo booth
      scope.isDemo = (attrs.isDemo === "true");
      scope.documentation = ConfigService.documentation;

      // This is used to enable custom css overriding
      scope.allowCustomElectionThemeCss = ConfigService.allowCustomElectionThemeCss;

      function redirectToLogin() {
        // Stop warning the user about reloading/leaving the page
        // as no vote is in the process
        $window.onbeforeunload = null;
        var redirectUrl = "/election/" + scope.electionId + "/public/login";

        // change to public/login page
        $window.location.href = redirectUrl;
        return;
      }

      function updateWidth() {
        $timeout.cancel(timeoutWidth);
        timeoutWidth = $timeout(function() {
          scope.windowWidth = w.width();
          console.log("scope.windowWidth = " + scope.windowWidth);
          scope.$apply();
        }, 100);
      }

      // possible values of the election state scope variable
      var stateEnum = {
        electionChooserScreen: 'electionChooserScreen',
        receivingElection: 'receivingElection',
        errorScreen: 'errorScreen',
        helpScreen: 'helpScreen',
        startScreen: 'startScreen',
        multiQuestion: 'multiQuestion',
        pairwiseBeta: 'pairwiseBeta',
        draftsElectionScreen: 'draftsElectionScreen',
        auditBallotScreen: 'auditBallotScreen',
        pcandidatesElectionScreen: 'pcandidatesElectionScreen',
        "2questionsConditionalScreen": '2questionsConditionalScreen',
        simultaneousQuestionsScreen: 'simultaneousQuestionsScreen',
        conditionalAccordionScreen: 'conditionalAccordionScreen',
        encryptingBallotScreen: 'encryptingBallotScreen',
        castOrCancelScreen: 'castOrCancelScreen',
        reviewScreen: 'reviewScreen',
        castingBallotScreen: 'castingBallotScreen',
        successScreen: 'successScreen'
      };

      // override state if in debug mode and it's provided via query param
      function setState(newState, newStateData) {
        if (scope.state === stateEnum.errorScreen) {
          console.log("state in an error state, new state change: " + newState);
          return;
        }
        console.log("setting state to " + newState);
        scope.state = newState;
        scope.stateData = newStateData;
        scope.stateChange++;
      }

      function mapQuestion(question) {
        if (question.layout === "conditional-accordion") {
          return {
            state: stateEnum.conditionalAccordionScreen,
            sorted: true,
            ordered: true
          };
        } else if  (question.layout === "pcandidates-election") {
          return {
            state: stateEnum.pcandidatesElectionScreen,
            sorted: true,
            ordered: true
          };
        } else if  (question.layout === "simultaneous-questions") {
          return {
            state: stateEnum.simultaneousQuestionsScreen,
            sorted: false,
            ordered: false
          };
        }

        var map = {
          "plurality-at-large": {
            state: stateEnum.multiQuestion,
            sorted: true,
            ordered: false
          },
          "borda-nauru": {
            state: stateEnum.multiQuestion,
            sorted: true,
            ordered: true
          },
          "borda": {
            state: stateEnum.multiQuestion,
            sorted: true,
            ordered: true
          },
          "borda-mas-madrid": {
            state: stateEnum.multiQuestion,
            sorted: true,
            ordered: true
          },
          "pairwise-beta": {
            state: stateEnum.pairwiseBeta,
            sorted: true,
            ordered: true
          },
          "desborda3": {
            state: stateEnum.multiQuestion,
            sorted: true,
            ordered: true
          },
          "desborda2": {
            state: stateEnum.multiQuestion,
            sorted: true,
            ordered: true
          },
          "desborda": {
            state: stateEnum.multiQuestion,
            sorted: true,
            ordered: true
          },
          "cumulative": {
            state: stateEnum.simultaneousQuestionsScreen,
            sorted: false,
            ordered: false
          }
        };
        return map[question.tally_type];
      }

      // count the number of selected options in a question
      function numSelectedOptions(question)
      {
        return _.filter(
          question.answers,
          function (element) {
            return element.selected > -1 || element.isSelected === true;
          }).length;
      }

      // Set the vote in a question as blank (no option selected)
      function blankVoteQuestion(question)
      {
        _.each(
          question.answers,
          function (element)
          {
            element.selected = -1;
          }
        );
      }

      // taking into account the choices in previous questions, check if
      // questions [n, max] are enabled or not, reset to blank vote disabled
      // questions and return the first enabled question between [n, max+1]
      function processConditionalQuestions(n)
      {
        // if there are no conditional question, then continue
        if (!scope.election.presentation.conditional_questions ||
          !angular.isArray(scope.election.presentation.conditional_questions))
        {
          return n;
        }

        // review all questions, disabling conditional questions as needed
        // and resetting their answers
        _.each(
          scope.election.questions,
          function (question, index)
          {
            var conditional_questions = _.filter(
              scope.election.presentation.conditional_questions,
              function (cond_question)
              {
                return cond_question.question_id === index;
              }
            );

            // if it's not a conditional question, then we are finished
            if (conditional_questions.length === 0) {
              question.disabled = false;
              return;
            }

            var cond_question = conditional_questions[0];
            var conditions = _.filter(
              cond_question.when_any,
              // check if the options is selected
              function (condition)
              {
                return _.find(
                  scope.election.questions[condition.question_id].answers,
                  function (answer)
                  {
                    return (answer.id === condition.answer_id &&
                      answer.selected > -1);
                  }
                ) !== undefined;
              }
            );

            question.disabled = (conditions.length === 0);
            if (question.disabled) {
              blankVoteQuestion(question);
            }
          }
        );

        // return the next enabled question index including or after n
        var nextEnabledQuestion = scope.election.questions.length + 1;
        for (var i = n; i < scope.election.questions.length; i++)
        {
          if (!scope.election.questions[i].disabled) {
            return i;
          }
        }

        return scope.election.questions.length + 1;
      }

      // given a question number, looks at the question type and tells the
      // correct state to set, so that the associated directive correctly shows
      // the given question
      function goToQuestion(n, reviewMode) {
        // first check for special election-wide layouts
        var layout = scope.election.layout;
        if (layout === "2questions-conditional") {
          scope.setState(stateEnum["2questionsConditionalScreen"], {
            isLastQuestion: true,
            reviewMode: true,
            filter: ""
          });
          return;
        }

        // what should be the next question?
        var nextQuestion = processConditionalQuestions(n);

        var isLastQuestion = (scope.election.questions.length === nextQuestion);
        if (isLastQuestion) {
          scope.setState(stateEnum.encryptingBallotScreen, {});
          return;
        }

        var question = scope.election.questions[nextQuestion];
        var mapped = scope.mapQuestion(question);

        scope.setState(mapped.state, {
          question: scope.election.questions[nextQuestion],
          questionNum: nextQuestion,
          isLastQuestion: (scope.election.questions.length === nextQuestion + 1),
          reviewMode: reviewMode,
          filter: "",
          sorted: mapped.sorted,
          ordered: mapped.ordered,
          affixIsSet: false,
          pairNum: 0 // only used for pairwise comparison
        });
      }

      // changes state to the next one, calculating it and setting some scope
      // vars
      function next() {
        var questionStates = [
          stateEnum.multiQuestion,
          stateEnum.pcandidatesElectionScreen,
          stateEnum.simultaneousQuestionsScreen,
        ];
        if (scope.state === stateEnum.electionChooserScreen) {
          scope.setState(stateEnum.startScreen, {});
        } else if (scope.state === stateEnum.startScreen)
        {
          goToQuestion(0, false);

        } else if (scope.state === stateEnum.reviewScreen)
        {
          if (!scope.stateData.auditClicked) {
            // in a demo, we don't send the ballot, we just show as if we had sent it
            if (scope.isDemo) {
              scope.setState(stateEnum.successScreen, {
                ballotHash: scope.stateData.ballotHash,
                ballotResponse: {
                  date: "2020-03-02 13:22:03.035",
                  payload: {
                    election_id: scope.election.id,
                    voter_id: "2bf885da9bdc0676d90f7d8cc66f",
                    vote: scope.stateData.encryptedBallot,
                    hash: scope.stateData.ballotHash,
                    created: "2020-03-02T13:22:03.030"
                  }
                }
              });
            // if we are not in a demo, send the ballot
            } else {
              scope.setState(stateEnum.castingBallotScreen, {
                encryptedBallot: scope.stateData.encryptedBallot,
                auditableBallot: scope.stateData.auditableBallot
              });
            }
          } else {
            scope.setState(stateEnum.auditBallotScreen, {
              encryptedBallot: scope.stateData.encryptedBallot,
              auditableBallot: scope.stateData.auditableBallot,
              ballotHash: scope.stateData.auditableBallot.ballot_hash
            });
          }

        } else if (scope.state === stateEnum.auditBallotScreen)
        {
          goToQuestion(0, false);

        } else if (scope.state === stateEnum.encryptingBallotScreen)
        {
          scope.setState(stateEnum.reviewScreen, {
            encryptedBallot: scope.stateData.encryptedBallot,
            auditableBallot: scope.stateData.auditableBallot,
            ballotHash: scope.stateData.auditableBallot.ballot_hash,
            auditClicked: false
          });

        } else if (scope.state === stateEnum.castingBallotScreen)
        {
          scope.setState(stateEnum.successScreen, {
            ballotHash: scope.stateData.ballotHash,
            ballotResponse: scope.stateData.ballotResponse
          });

        } else if (scope.stateData.isLastQuestion || scope.stateData.reviewMode)
        {
          // process again conditional questions
          processConditionalQuestions(0);

          // before going back to the review screen, we check if there is any
          // empty question that cannot be empty in selected answers, and go
          // back to it if that happens
          var inconsistentQuestion = -1;
          for (var i = 0; i < scope.election.questions.length; i++)
          {
            var question = scope.election.questions[i];
            if (
              !question.disabled && 
              (
                question.min > numSelectedOptions(question) ||
                numSelectedOptions(question) > question.max
              ) &&
              (
                !question.extra_options ||
                !question.extra_options.invalid_vote_policy ||
                question.extra_options.invalid_vote_policy === 'not-allowed'
              )
            )
            {
              inconsistentQuestion = i;
              break;
            }
          }
          if (inconsistentQuestion > -1)
          {
            goToQuestion(i, true);
          } else {
            scope.setState(stateEnum.encryptingBallotScreen, {});
          }

        } else if (_.contains(questionStates, scope.state) &&
                   !scope.stateData.isLastQuestion)
        {
          goToQuestion(scope.stateData.questionNum + 1, false);
        }
      }

      // shows the error string
      function showError(error) {
        if (scope.state === stateEnum.errorScreen) {
          console.log("already in an error state, new error appeared: " + error);
          return;
        }
        scope.setState(stateEnum.errorScreen, {error: error});
      }

      function launchHelp() {
        scope.setState(stateEnum.helpScreen, {
          oldState: {
            name: scope.state,
            data: angular.copy(scope.stateData)
          }});
      }

      function backFromHelp() {
        if (scope.state !== stateEnum.helpScreen) {
          console.log("error, calling to backFromHelp in another state");
          return;
        }

        if (angular.isDefined(scope.stateData.oldState.data.questionNum)) {
          var n = scope.stateData.oldState.data.questionNum;
          scope.stateData.oldState.data.question = scope.election.questions[n];
        }

        scope.setState(
          scope.stateData.oldState.name,
          scope.stateData.oldState.data);
      }

      // Try to read and process voting credentials
      function readVoteCredentials() {
        var credentialsStr = $window.sessionStorage.getItem("vote_permission_tokens");
        if (!credentialsStr && !scope.isDemo) {
          redirectToLogin();
        }
        scope.credentials = [];
        var currentElectionCredentials = null;
        try {
          scope.credentials = JSON.parse(credentialsStr);
          currentElectionCredentials = _.find(
            scope.credentials,
            function (electionCredential) {
              return (
                electionCredential.electionId.toString() === scope.electionId
              );
            }
          );
        } catch (error) {
          showError($i18next("avBooth.errorLoadingElection"));
          return;
        }

        // credentials for current election should have been found
        if (!currentElectionCredentials && !scope.isVirtual) {
          showError($i18next("avBooth.errorLoadingElection"));
          return;
        }

        // token should be valid
        var hmac = HmacService.checkKhmac(currentElectionCredentials.token);
        if (!hmac) {
          showError($i18next("avBooth.errorLoadingElection"));
          return;
        }

        // verify message, which should be of the format
        // "userid:vote:AuthEvent:1110:134234111"
        var splitMessage = hmac.message.split(':');
        if (splitMessage.length !== 5) {
          showError($i18next("avBooth.errorLoadingElection"));
          return;
        }
        var voterId = splitMessage[0];
        var objectType = splitMessage[1];
        var objectId = splitMessage[2];
        var action = splitMessage[3];
        // timestamp has already been validated so we don't validate it again
        if (
          isNaN(parseInt(objectId, 10)) ||
          action !== 'vote' ||
          objectType !== 'AuthEvent'
        ) {
          showError($i18next("avBooth.errorLoadingElection"));
          return;
        }

        // set scope.voterId and scope.authorizationHeader
        scope.voterId = voterId;
        scope.authorizationHeader = currentElectionCredentials.token;
        scope.currentElectionCredentials = currentElectionCredentials;
        scope.isDemo = false;
      }

      function retrieveElectionConfig() {
        var agoraElectionsRetrieved = false;
        var authapiRetrieved = false;
        var isVirtual = false;
        var hasAuthapiError = false;

        function execIfAllRetrieved(callback)
        {
          if (!agoraElectionsRetrieved || !authapiRetrieved) {
            return;
          }
          callback();
        }
        try {

          $http.get(scope.baseUrl + "election/" + scope.electionId)
            .then(
              function onSuccess(response) {
                if (!scope.isDemo && response.data.payload.state !== "started") {
                  showError($i18next("avBooth.errorElectionIsNotOpen"));
                  return;
                }

                scope.election = angular.fromJson(response.data.payload.configuration);

                // if demo booth is disabled and this is a demo booth, redirect
                // to the login page
                if (
                  scope.election.presentation &&
                  scope.election.presentation.extra_options && 
                  scope.election.presentation.extra_options.disable__demo_voting_booth &&
                  scope.isDemo
                ) {
                  redirectToLogin();
                  return;
                }

                // global variables
                $window.isDemo = scope.isDemo;
                $window.election = scope.election;

                // index questions
                _.each(
                  scope.election.questions,
                  function(q, num) { q.num = num; }
                );

                scope.pubkeys = angular.fromJson(response.data.payload.pks);
                // initialize ballotClearText as a list of lists
                scope.ballotClearText = _.map(
                  scope.election.questions, function () { return []; }
                );

                // If it's a demo booth and we are at this stage, ensure to
                // show the modal "this is a demo booth" warning
                if (scope.isDemo) {
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
                          header: "avBooth.demoModeModal.header",
                          body: "avBooth.demoModeModal.body",
                          continue: "avBooth.demoModeModal.confirm"
                        };
                      }
                    }
                  });
                }

                // If there are children elections, then show the election
                // chooser
                scope.isVirtual = response.data.payload.virtual;

                // process vote credentials
                readVoteCredentials();

                if (response.data.payload.virtual) {
                  if (hasAuthapiError) {
                    showError($i18next("avBooth.errorLoadingElection"));
                    return;
                  }
                  agoraElectionsRetrieved = true;
                  isVirtual = true;
                  execIfAllRetrieved(function () {
                    if (!scope.parentAuthEvent) {
                      scope.parentAuthEvent = angular.copy(scope.authEvent);
                    }
                    scope.setState(stateEnum.electionChooserScreen, {});
                  });
                // skip start screen if start_screen__skip is set to true or
                // if we are not in the first election of the credentials
                } else if (
                  (
                    !response.data.payload.virtual &&
                    scope.election.presentation.extra_options && 
                    scope.election.presentation.extra_options.start_screen__skip
                  ) ||
                  (
                    !!scope.currentElectionCredentials &&
                    !scope.currentElectionCredentials.isFirst
                  )
                )
                {
                  goToQuestion(0, false);
                } else {
                  scope.setState(stateEnum.startScreen, {});
                }
              },
              // on error, like parse error or 404
              function onError(response) {
                showError($i18next("avBooth.errorLoadingElection"));
              }
            );

          Authmethod.viewEvent(scope.electionId)
            .then(
              function onSuccess(response) {
                authapiRetrieved = true;
                if (response.data.status === "ok") {
                  scope.authEvent = response.data.events;
                }
                execIfAllRetrieved(function () {
                  if (isVirtual) {
                    if (!scope.parentAuthEvent) {
                      scope.parentAuthEvent = angular.copy(
                        response.data.events
                      );
                    }
                    scope.setState(stateEnum.electionChooserScreen, {});
                  }
                });
              },
              function onError () {
                hasAuthapiError = true;
              }
            );
        } catch (error) {
          showError($i18next("avBooth.errorLoadingElection"));
        }
      }

      // Function that receives and processes authorization token when this
      // this token is sent by a parent window when we are inside an iframe
      function avPostAuthorization(event, errorHandler) {
        var action = "avPostAuthorization:";
        if (event.data.substr(0, action.length) !== action) {
          return;
        }

        var khmacStr = event.data.substr(action.length, event.data.length);
        var khmac = HmacService.checkKhmac(khmacStr);
        if (!khmac) {
          scope.authorizationReceiverErrorHandler();
          showError($i18next("avBooth.errorLoadingElection"));
          return;
        }
        scope.authorizationHeader = khmacStr;
        var splitMessage = khmac.message.split(":");

        if (splitMessage.length < 4) {
          scope.authorizationReceiverErrorHandler();
          return;
        }
        scope.voterId = splitMessage[0];
        scope.authorizationReceiver();
        scope.authorizationReceiver = null;
      }

      function setAuthorizationReceiver(callback, errorCallback) {
        scope.authorizationReceiver = callback;
        scope.authorizationReceiverErrorHandler = errorCallback;
      }

      //////////////////// Initialization part ////////////////////

      // init scope vars
      angular.extend(scope, {
        election: null,
        setState: setState,
        stateEnum: stateEnum,
        stateChange: 0,
        showError: showError,
        launchHelp: launchHelp,
        backFromHelp: backFromHelp,
        goToQuestion: goToQuestion,
        setAuthorizationReceiver: setAuthorizationReceiver,
        mapQuestion: mapQuestion,
        retrieveElectionConfig: retrieveElectionConfig,
        next: next,
        redirectToLogin: redirectToLogin,

        // stateData stores information used by the directive being shown.
        // Its content depends on the current state.
        stateData: {},

        // contains the clear text of the ballot. It's a list with an element
        // per question.
        // The format of each item in the array depends on the voting method for
        // the related question. This is used by the directives to store the
        // clear text of the ballot.
        ballotClearText: [],

        // convert config to JSON
        config: angular.fromJson(scope.configStr),

        // Variable that stablishes if the election is a demo or not.
        isDemo: (attrs.isDemo === "true"),

        // By default no voterId is set
        voterId: '',

        // By default the authorizationHeader is an empty looking khmac
        authorizationHeader: "khmac:///sha-256;/"
      });

      // bind resize to updateWidth
      w.bind('resize', function () {
        updateWidth();
      });
      updateWidth();

      // set the initial state
      setState(stateEnum.receivingElection, {});

      // allow receival of khmac token by parent window
      $window.addEventListener('message', avPostAuthorization, false);

      // retrieve election config
      retrieveElectionConfig();
    }

    return {
      restrict: 'AE',
      scope: {
        baseUrl: '@',
        electionId: '@',
        configStr: '@config'
      },
      link: link,
      templateUrl: 'avBooth/booth-directive/booth-directive.html'
    };
  });
