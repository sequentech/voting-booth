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

angular.module('avBooth')
  .directive('avBooth', function(
    $q,
    $modal,
    $cookies,
    $http,
    $rootScope,
    $timeout,
    $window,
    Authmethod,
    ConfigService,
    HmacService,
    InsideIframeService,
    ElectionCreation,
    I18nOverride
  ) {
    // we use it as something similar to a controller here
    function link(scope, element, attrs) {
      // timeout is used with updateWidth so that we do not create too many
      // calls to it, at most one per 100ms
      var timeoutWidth;
      var w = angular.element($window);
      $("#theme").attr("href", "booth/themes/" + ConfigService.theme + "/app.min.css");
      //window.SequentThemes.change(ConfigService.theme);

      // when we are not inside an iframe and voter id is not set, this is a
      // demo booth
      scope.isDemo = (attrs.isDemo === "true");
      scope.isPreview = (attrs.isPreview === "true");
      scope.documentation = ConfigService.documentation;
      scope.hasSeenStartScreenInThisSession = false;

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
        "2questionsConditionalScreen": '2questionsConditionalScreen',
        simultaneousQuestionsScreen: 'simultaneousQuestionsScreen',
        encryptingBallotScreen: 'encryptingBallotScreen',
        castOrCancelScreen: 'castOrCancelScreen',
        reviewScreen: 'reviewScreen',
        castingBallotScreen: 'castingBallotScreen',
        successScreen: 'successScreen',
        showPdf: 'showPdf',
        simultaneousQuestionsV2Screen: 'simultaneousQuestionsV2Screen'
      };

      // This is used to enable custom css overriding
      scope.allowCustomElectionThemeCss = ConfigService.allowCustomElectionThemeCss;
      scope.alreadyReloaded = null;

      function reloadTranslations(force) {
        function reloadInner() {
          var election = (
            scope.state === stateEnum.electionChooserScreen
          ) ? scope.parentElection : scope.election;

          if (scope.alreadyReloaded === election.id) {
            console.log("booth-directive: broadcast i18nextLanguageChange");
            $rootScope.$broadcast('i18nextLanguageChange', $window.i18next.resolvedLanguage);
            return;
          } else {
            scope.alreadyReloaded = election.id;
          }

          // should we reset $window.i18nOverride?
          var overrides = (
            election &&
            election.presentation &&
            election.presentation.i18n_override
          ) ? election.presentation.i18n_override : null;

          var languagesConf = (
            election &&
            election.presentation &&
            election.presentation.i18n_languages_conf
          ) ? election.presentation.i18n_languages_conf : null;

          I18nOverride(
            /* overrides = */ overrides,
            /* force = */ force,
            /* languagesConf = */ languagesConf
          );
        }
        function timeoutWrap() {
          console.log("timeoutWrap");
          var election = (
            scope.state === stateEnum.electionChooserScreen
          ) ? scope.parentElection : scope.election;
          if (election && scope.alreadyReloaded === election.id) {
            return;
          }
          if (!election) {
            console.log("timeoutWrap: delaying for election..");
            setTimeout(timeoutWrap, 200);
            return;
          }
          // call reloadInner only after i18next initialization
          if ($window.i18next.isInitialized) {
            reloadInner();
          } else {
            $window.i18next.on('initialized', reloadInner);
          }
        }
        timeoutWrap();
      }

      function updateWidth() {
        $timeout.cancel(timeoutWidth);
        timeoutWidth = $timeout(function() {
          scope.windowWidth = w.width();
          console.log("scope.windowWidth = " + scope.windowWidth);
          scope.$apply();
        }, 100);
      }

      // Returns the logout url if any from the appropiate openidprovider
      // TODO: logout asumes that you are using the first provider, so it
      // basically supports only one provider
      function getLogoutUri()
      {
        if (
          ConfigService.openIDConnectProviders.length === 0 || 
          !ConfigService.openIDConnectProviders[0].logout_uri
        ) {
          return false;
        }

        var election = (
          (!!scope.parentElection) ?
          scope.parentElection :
          scope.election
        );

        var uri = ConfigService.openIDConnectProviders[0].logout_uri;
        uri = uri.replace("__EVENT_ID__", "" + election.id);

        var postfix = "_authevent_" + election.id;
        if (!!$cookies.get("id_token_" + postfix))
        {
          uri = uri.replace("__ID_TOKEN__", $cookies.get("id_token_" + postfix));
        // if __ID_TOKEN__ is there but we cannot replace it, we need to
        // directly redirect to the login, otherwise the URI might show an
        // error 500
        } else if (uri.indexOf("__ID_TOKEN__") > -1)
        {
          uri = "/election/" + election.id + "/public/login";
        }

        return uri;
      }

      // simply redirect to login
      function simpleRedirectToLogin(isSuccess)
      {
        var election = (
          (!!scope.parentElection) ?
          scope.parentElection :
          scope.election
        );
        var extra = election.presentation.extra_options;
        var redirectUrl = "/election/" + election.id + "/public/login";
        if (isSuccess && !!extra && !!extra.success_screen__redirect__url)
        {
          redirectUrl = extra.success_screen__redirect__url;
        }
        $window.location.href = redirectUrl;
      }

      // (maybe logout, in openid when there's a logout_uri and) redirect to login
      function redirectToLogin(isSuccess)
      {
        if (scope.redirectingToUri)
        {
          return;
        }
        // Stop warning the user about reloading/leaving the page
        // as no vote is in the process
        $window.onbeforeunload = null;
        var election = (
          (!!scope.parentElection) ?
          scope.parentElection :
          scope.election
        );
        scope.redirectingToUri = true;

        if (
          election.auth_method !== 'openid-connect' || 
          !getLogoutUri()
        ) {
          simpleRedirectToLogin(isSuccess);
          return;
        }

        // OpenID connect cookies
        try {
          var postfix = "_authevent_" + election.id;
          var uri = getLogoutUri();
          $cookies.remove("id_token_" + postfix);
          $window.location.href = uri;
        } catch (_e) {
          simpleRedirectToLogin(isSuccess);
          return;
        }
      }

      function closeAndFinish(dontClose, isSuccess) 
      {
        var election = (
          (!!scope.parentElection) ?
          scope.parentElection :
          scope.election
        );
        var extra = election.presentation.extra_options;
        if (isSuccess || !!extra && !!extra.success_screen__redirect__url) 
        {
          redirectToLogin(isSuccess);
          return;
        }

        if (!!dontClose) {
          redirectToLogin(isSuccess);
        } else {
          try {
            $window.close();
          } finally {
            redirectToLogin(isSuccess);
          }
        }
      }

      // log out and redirect
      function logoutAndRedirect(isSuccess) {
        var election = (
          (!!scope.parentElection) ?
          scope.parentElection :
          scope.election
        );

        var postfix = "_authevent_" + election.id;
        $cookies.remove("authevent_" + postfix);
        $cookies.remove("userid" + postfix);
        $cookies.remove("user" + postfix);
        $cookies.remove("auth" + postfix);
        $cookies.remove("isAdmin" + postfix);
        $cookies.remove("isAdmin" + postfix);
        $window.sessionStorage.removeItem("vote_permission_tokens");

        closeAndFinish(/* dontClose = */ true, /* isSusccess */ isSuccess);
      }

      function confirmLogoutModal(isSuccess) {
        $modal.open({
          ariaLabelledBy: 'modal-title',
          ariaDescribedBy: 'modal-body',
          templateUrl: "avBooth/invalid-answers-controller/invalid-answers-controller.html",
          controller: "InvalidAnswersController",
          size: 'sm',
          resolve: {
            errors: function() { return []; },
            data: function() {
              return {
                errors: [],
                header: "avBooth.confirmLogoutModal.header",
                body: "avBooth.confirmLogoutModal.body",
                continue: "avBooth.confirmLogoutModal.confirm",
                cancel: "avBooth.confirmLogoutModal.cancel",
                kind: 'warn'
              };
            }
          }
        }).result.then(
          function ()
          {
            logoutAndRedirect(isSuccess);
          }
        );
      }

      function checkCookies(electionId) {
        if (scope.isDemo || scope.isPreview) {
          return;
        }

        var idToCheck = (!!scope.parentId) ? scope.parentId : electionId;
        var cookie = $cookies.get("authevent_" + idToCheck);
        if (!cookie) {
          if (InsideIframeService()) {
            return;
          } else {
            redirectToLogin(/*isSuccess*/ false);
          }
        }
      }

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

        reloadTranslations(true);
      }

      function mapQuestion(question) {
        if  (question.layout === "simultaneous-questions") {
          return {
            state: stateEnum.simultaneousQuestionsV2Screen,
            sorted: true,
            ordered: false
          };
        } else if  (question.layout === "simultaneous-questions-v2") {
          return {
            state: stateEnum.simultaneousQuestionsV2Screen,
            sorted: true,
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
          stateEnum.simultaneousQuestionsScreen,
        ];
        if (scope.state === stateEnum.electionChooserScreen) {
          scope.hasSeenStartScreenInThisSession = true;
          scope.setState(stateEnum.startScreen, {});
        } else if (scope.state === stateEnum.startScreen)
        {
          goToQuestion(0, false);
        } else if (scope.state === stateEnum.reviewScreen)
        {
          if (!scope.stateData.auditClicked) {
            // in a demo, we don't send the ballot, we just show as if we had sent it
            if (scope.isDemo || scope.isPreview) {
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

        } else if (scope.state === stateEnum.showPdf)
        {
          scope.setState(stateEnum.startScreen, {});
        }
      }

      // shows the error string
      function showError(errorTranslation, translationData, errorCode) {
        if (scope.state === stateEnum.errorScreen) {
          console.log("already in an error state, new error appeared: " + errorTranslation);
          return;
        }
        scope.setState(
          stateEnum.errorScreen,
          {
            error: errorTranslation,
            errorData: translationData,
            errorCode: errorCode
        });
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

      function isStateCompatibleWithCountdown() {
        return scope.state !== stateEnum.errorScreen && scope.state !== stateEnum.successScreen;
      }

      // Try to read and process voting credentials
      function readVoteCredentials() {
        if (scope.isDemo || scope.isPreview) {
          return;
        }
        var credentialsStr = $window.sessionStorage.getItem("vote_permission_tokens");
        if (!credentialsStr) {
          if (InsideIframeService()) {
            return;
          } else {
            showError(
              "avBooth.errorLoadingVoterCredentials",
              {
                "backButtonUrl": ConfigService.defaultRoute,
                "hideErrorIdentifier": true
              },
              "400"
            );
            return;
          }
        }
        scope.credentials = [];
        var currentElectionCredentials = null;

        try {
          scope.credentials = JSON.parse(credentialsStr);

          // if it's virtual, there's no current election credentials
          if (scope.isVirtual) {
            return;
          }
          currentElectionCredentials = _.find(
            scope.credentials,
            function (electionCredential) {
              return (
                electionCredential.electionId.toString() === scope.electionId
              );
            }
          );
        } catch (error) {
          showError(
            "avBooth.errorLoadingElection",
              {
                "backButtonUrl": ConfigService.defaultRoute,
                "hideErrorIdentifier": true
              }
          );
          return;
        }

        // credentials for current election should have been found
        if (!currentElectionCredentials)
        {
          if (scope.election) {
            showError(
              "avBooth.errorLoadingElection",
                {
                "backButtonUrl": ConfigService.defaultRoute,
                "hideErrorIdentifier": true
              }
            );
          }
          return;
        }

        // token should be valid
        var hmac = HmacService.checkKhmac(currentElectionCredentials.token);
        if (!hmac) {
          showError(
            "avBooth.errorLoadingElection",
              {
                "backButtonUrl": ConfigService.defaultRoute,
                "hideErrorIdentifier": true
              }
          );
          return;
        }

        // verify message, which should be of the format
        // "userid:vote:AuthEvent:1110:134234111"
        var splitMessage = hmac.message.split(':');
        if (splitMessage.length !== 5) {
          showError(
            "avBooth.errorLoadingElection",
              {
                "backButtonUrl": ConfigService.defaultRoute,
                "hideErrorIdentifier": true
              }
          );
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
          showError(
            "avBooth.errorLoadingElection",
              {
                "backButtonUrl": ConfigService.defaultRoute,
                "hideErrorIdentifier": true
              }
          );
          return;
        }

        // set scope.voterId and scope.authorizationHeader
        scope.voterId = voterId;
        scope.authorizationHeader = currentElectionCredentials.token;
        scope.currentElectionCredentials = currentElectionCredentials;
        scope.isDemo = false;
      }

      var startTimeMs = Date.now();

      function getSessionStartTime() {
        readVoteCredentials();
        return scope.currentElectionCredentials && scope.currentElectionCredentials.sessionStartedAtMs || startTimeMs;
      }

      // After cookies expires, redirect to login. But only if cookies do
      // expire.
      function autoredirectToLoginAfterTimeout() {
        // demo and live preview don't need to expire
        if (scope.isDemo || scope.isPreview) {
          return;
        }

        var election = (
          (!!scope.parentElection) ?
          scope.parentElection :
          scope.election
        );

        if (
          ConfigService.authTokenExpirationSeconds &&
          (
            !election ||
            !election.presentation ||
            !election.presentation.extra_options ||
            !election.presentation.extra_options.booth_log_out__disable
          )
        ) {

          var logoutTimeMs = getSessionStartTime() + ConfigService.authTokenExpirationSeconds * 1000;

          setTimeout(
            function () {
              if (scope.state === stateEnum.errorScreen) {
                console.log("already in an error state, can't redirect");
                return;
              }
              logoutAndRedirect( /* isSuccess */ false);
            },
            Math.max(logoutTimeMs - Date.now(), 0)
          );

          var modalTimeMs = logoutTimeMs - 60 * 1000;

          if (modalTimeMs < Date.now()) {
            return;
          }

          setTimeout(
            function () {
              $modal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: "avBooth/invalid-answers-controller/invalid-answers-controller.html",
                controller: "InvalidAnswersController",
                size: 'sm',
                resolve: {
                  errors: function() { return []; },
                  data: function() {
                    return {
                      errors: [],
                      header: "avBooth.logoutWarnModal.header",
                      body: "avBooth.logoutWarnModal.body",
                      continue: "avBooth.logoutWarnModal.confirm"
                    };
                  }
                }
              });
            },
            modalTimeMs - Date.now()
          );

        }
      }

      function simpleGetElection(electionId) {
        if (!electionId) {
          var future = $q.defer();
          future.reject("invalid election id");
          return future.promise;
        }

        var futureResult = $q.defer();
        try {
          if (scope.isPreview) {
            var previewElection = JSON.parse(scope.previewElection || sessionStorage.getItem(parseInt(attrs.electionId)));
            var foundElection = previewElection.find(
              function (element) {return element.id === parseInt(electionId);
            });

            if (foundElection) {
              var ballotBoxData = ElectionCreation.generateBallotBoxResponse(foundElection);
              futureResult.resolve({
                data: {
                  payload: ballotBoxData
                }
              });
            } else {
              futureResult.reject("election not found");
            }
          } else {
            var electionPromise = $http.get(
              scope.baseUrl + "election/" + electionId,
              {
                headers: {'Authorization': scope.authorizationHeader || null}
              }
            );

            electionPromise
            .then(
              function onSuccess(response) {
                futureResult.resolve(angular.fromJson(response.data.payload));
              },
              // on error, like parse error or 404
              function onError(response) {
                futureResult.reject(response);
              });
          }
        } catch (error) {
          futureResult.resolve(error);
        }
        return futureResult.promise;
      }

      function retrieveElectionConfig(electionId) {
        if (scope.state === stateEnum.errorScreen) {
          return;
        }
        if (electionId) {
          scope.electionId = electionId;
        }
        var sequentElectionsRetrieved = false;
        var iamRetrieved = false;
        scope.isVirtual = false;
        var hasAuthapiError = false;

        function execIfAllRetrieved(callback)
        {
          if (!sequentElectionsRetrieved || !iamRetrieved) {
            return;
          }
          callback();
        }
        try {
          // make it virtual by default, needed by readVoteCredentials
          scope.isVirtual = false;

          // process vote credentials
          readVoteCredentials();

          var ballotBoxData;
          var authapiData;
          if (scope.isPreview) {
            var previewElection = JSON.parse(scope.previewElection || sessionStorage.getItem(parseInt(attrs.electionId)));
            var foundElection;
            if (electionId === undefined) { 
              electionId = parseInt(attrs.electionId);
            }

            if (previewElection.length === 1) {
              foundElection = previewElection[0];
              foundElection.id = foundElection.id || (electionId && parseInt(electionId));
            } else {
              foundElection = previewElection.find(function (element) { return element.id === parseInt(electionId); });
            }
            authapiData = ElectionCreation.generateAuthapiResponse(foundElection);
            ballotBoxData = ElectionCreation.generateBallotBoxResponse(foundElection);
          }

          var electionPromise;
          if (!scope.isPreview) {
            electionPromise = $http.get(
              scope.baseUrl + "election/" + scope.electionId,
              {
                headers: {'Authorization': scope.authorizationHeader || null}
              }
            );
          } else {
            var deferredElection = $q.defer();

            deferredElection.resolve({
              data: {
                payload: ballotBoxData
              }
            });

            electionPromise = deferredElection.promise;
          }

          electionPromise
            .then(
              function onSuccess(response) {
                scope.election = angular.fromJson(response.data.payload.configuration);
                var presentation = scope.election.presentation;

                if (presentation.theme && presentation.theme !== ConfigService.theme) {
                  $("#theme").attr("href", "booth/themes/" + presentation.theme + "/app.min.css");
                  ConfigService.theme = presentation.theme;
                }

                scope.electionState = response.data.payload.state;

                // reset $window.i18nOverride
                reloadTranslations(false);

                var showPdf = "true" === window.sessionStorage.getItem("show-pdf");

                if (
                  !scope.isDemo &&
                  response.data.payload.state !== "started" &&
                  (
                    !presentation ||
                    !presentation.extra_options ||
                    !presentation.extra_options.allow_voting_end_graceful_period
                  ) &&
                  !showPdf
                ) {
                  showError("avBooth.errorElectionIsNotOpen");
                  return;
                }

                // if demo booth is disabled and this is a demo booth, redirect
                // to the login page
                if (
                  scope.election.presentation &&
                  scope.election.presentation.extra_options && 
                  scope.election.presentation.extra_options.disable__demo_voting_booth &&
                  scope.isDemo
                ) {
                  redirectToLogin(/* isSuccess */ false);
                  return;
                }

                // global variables
                $window.isDemo = scope.isDemo;
                $window.isPreview = scope.isPreview;
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
                if (scope.isDemo && !scope.shownIsDemoModal) {
                  scope.shownIsDemoModal = true;
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
                          continue: "avBooth.demoModeModal.confirm",
                          forceAccept: true
                        };
                      }
                    }
                  }).result.then(function () { 
                    reloadTranslations(true);
                  });
                }

                // If it's a live preview booth and we are at this stage, ensure to
                // show the modal "this is a live preview booth" warning
                if (scope.isPreview && !scope.shownIsPreviewModal) {
                  scope.shownIsPreviewModal = true;
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
                          header: "avBooth.previewModeModal.header",
                          body: "avBooth.previewModeModal.body",
                          continue: "avBooth.previewModeModal.confirm",
                          forceAccept: true
                        };
                      }
                    }
                  }).result.then(function () { 
                    reloadTranslations(true);
                  });
                }

                // If there are children elections, then show the election
                // chooser
                scope.isVirtual = response.data.payload.virtual;

                // re-process vote credentials in case isVirtual changed
                readVoteCredentials();

                if (scope.isVirtual) {
                  if (hasAuthapiError) {
                    showError(
                      "avBooth.errorLoadingElection",
                      {
                        "backButtonUrl": ConfigService.defaultRoute,
                        "hideErrorIdentifier": true
                      }
                    );
                    return;
                  }
                  sequentElectionsRetrieved = true;
                  execIfAllRetrieved(function () {
                    if (!scope.parentAuthEvent) {
                      scope.parentAuthEvent = angular.copy(scope.authEvent);
                      scope.parentElection = angular.copy(scope.election);
                      scope.parentId = scope.parentAuthEvent.id;
                    }
                    checkCookies(scope.parentId);
                    scope.setState(stateEnum.electionChooserScreen, {});
                  });
                // skip start screen if start_screen__skip is set to true or
                // if we are not in the first election of the credentials or
                // we are not in the first election in a demo booth
                } else if (
                  (
                    !response.data.payload.virtual &&
                    scope.election.presentation.extra_options && 
                    scope.election.presentation.extra_options.start_screen__skip
                  ) ||
                  scope.hasSeenStartScreenInThisSession
                )
                {
                  checkCookies(scope.electionId);
                  goToQuestion(0, false);
                } else {
                  checkCookies(scope.electionId);
                  if (showPdf) {
                    scope.setState(stateEnum.showPdf, {});
                  } else {
                    scope.hasSeenStartScreenInThisSession = true;
                    scope.setState(stateEnum.startScreen, {});
                  }
                }
              },
              // on error, like parse error or 404
              function onError(response) {
                showError("avBooth.errorLoadingElection", undefined, response.status);
              }
            );

          var authEventPromise;
          if (!scope.isPreview) {
            authEventPromise = Authmethod.viewEvent(scope.electionId);
          } else {
            var deferredAuthEvent = $q.defer();

            deferredAuthEvent.resolve({
              data: {
                status: "ok",
                events: authapiData
              }
            });

            authEventPromise = deferredAuthEvent.promise;
          }

          authEventPromise
            .then(
              function onSuccess(response) {
                iamRetrieved = true;
                if (response.data.status === "ok") {
                  scope.authEvent = response.data.events;
                }
                execIfAllRetrieved(function () {
                  if (scope.isVirtual) {
                    if (!scope.parentAuthEvent) {
                      scope.parentAuthEvent = angular.copy(
                        response.data.events
                      );
                      scope.parentElection = angular.copy(scope.election);
                      scope.parentId = scope.parentAuthEvent.id;
                      checkCookies(scope.parentId);
                    }
                    scope.setState(stateEnum.electionChooserScreen, {});
                  } else {
                    checkCookies(scope.electionId);
                  }
                });
              },
              function onError () {
                hasAuthapiError = true;
              }
            );
        } catch (error) {
          showError(
            "avBooth.errorLoadingElection",
              {
                "backButtonUrl": ConfigService.defaultRoute,
                "hideErrorIdentifier": true
              }
          );
        }
      }

      // Function that receives and processes authorization token when this
      // this token is sent by a parent window when we are inside an iframe
      function avPostAuthorization(event, errorHandler) {
        var action = "avPostAuthorization:";
        if (
          !event ||
          !event.data ||
          !angular.isString(event.data) ||
          event.data.substr(0, action.length) !== action
        ) {
          return;
        }

        var khmacStr = event.data.substr(action.length, event.data.length);
        var khmac = HmacService.checkKhmac(khmacStr);
        if (!khmac) {
          scope.authorizationReceiverErrorHandler();
          showError(
            "avBooth.errorLoadingElection",
              {
                "backButtonUrl": ConfigService.defaultRoute,
                "hideErrorIdentifier": true
              }
          );
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

      function increaseDemoElectionIndex() {
        scope.demoElectionIndex += 1;
      }

      function checkFixToBottom() {
        return scope.election &&
          scope.election.presentation &&
          scope.election.presentation.anchor_continue_btn_to_bottom || false;
      }

      //////////////////// Initialization part ////////////////////

      // init scope vars
      angular.extend(scope, {
        election: null,
        setState: setState,
        stateEnum: stateEnum,
        stateChange: 0,
        showError: showError,
        logoutAndRedirect: logoutAndRedirect,
        confirmLogoutModal: confirmLogoutModal,
        getLogoutUri: getLogoutUri,
        simpleRedirectToLogin: simpleRedirectToLogin,
        closeAndFinish: closeAndFinish,
        launchHelp: launchHelp,
        backFromHelp: backFromHelp,
        goToQuestion: goToQuestion,
        setAuthorizationReceiver: setAuthorizationReceiver,
        mapQuestion: mapQuestion,
        retrieveElectionConfig: retrieveElectionConfig,
        simpleGetElection: simpleGetElection,
        next: next,
        redirectToLogin: redirectToLogin,
        checkFixToBottom: checkFixToBottom,
        getSessionStartTime: getSessionStartTime,
        isStateCompatibleWithCountdown: isStateCompatibleWithCountdown,

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

        // Variable that stablishes if the election is a live preview or not.
        isPreview: (attrs.isPreview === "true"),

        // Variable that stores the preview election data.
        previewElection: (attrs.previewElection),

        // In case of parent-election, which children election should be loading
        // currently is set here
        demoElectionIndex: -1,
        increaseDemoElectionIndex: increaseDemoElectionIndex,

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

      autoredirectToLoginAfterTimeout();

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
