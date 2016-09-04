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

/*
 * Encrypt Ballot Screen directive.
 *
 * Shown while the ballot is being encrypted and sent.
 */
angular.module('avBooth')
  .directive(
     'avbEncryptingBallotScreen', 
     function(
       $i18next,
       EncryptBallotService,
       $timeout,
       $window,
       ConfigService,
       preloader
  ) {
  function link(scope, element, attrs) {

    var busyStateEnum = [
      'waiting',
      'working',
      'finished'
    ];

    scope.stepList = [
      {
        state: busyStateEnum[1],
        centralImgSrc: 'booth/img/options.png'
      },
      {
        state: busyStateEnum[0],
        title: 'encryptedTitle',
        description: 'encryptedDescription',
        centralImgSrc: 'booth/img/cast.png'
      },
      {
        state: busyStateEnum[0],
        title: 'castTitle',
        description: 'castDescription',
        centralImgSrc: 'booth/img/encrypted.png'
      },
      {
        state: busyStateEnum[0],
        title: 'anonymizedTitle',
        description: 'anonymizedDescription',
        centralImgSrc: 'booth/img/anonymized1.png'
      },
      {
        state: busyStateEnum[0],
        centralImgSrc: 'booth/img/anonymized2.png'
      }
    ];

    scope.bulletList = scope.stepList.slice(1,-1);

    var updateTimespan = 
      ConfigService.minLoadingTime / (scope.stepList.length);

    // The fake step we are currently working on
    scope.fakeStepIndex = 0;
    var finishedRealEncryption = false;
    var finishedFakeEncryption = false;

    var busyImageSrc = [
       'booth/img/loading.gif',
       'booth/img/options.png',
       'booth/img/cast.png',
       'booth/img/encrypted.png',
       'booth/img/anonymized1.png',
       'booth/img/anonymized2.png'
    ];

    scope.imagesPreloaded = false;

    function fakeStateUpdate() {
      scope.stepList[scope.fakeStepIndex].state = busyStateEnum[2];
      scope.fakeStepIndex = scope.fakeStepIndex + 1;

      if(scope.fakeStepIndex < scope.stepList.length) {
        scope.stepList[scope.fakeStepIndex].state = busyStateEnum[1];
        scope.$apply();
        $timeout(fakeStateUpdate, updateTimespan);
      } else {
        scope.$apply();
        if(finishedRealEncryption) {
          scope.next();
        } else {
          finishedFakeEncryption = true;
        }
      }
    }

    preloader.preloadImages( busyImageSrc )
    .then(
      function() {
        // Loading was successful
        scope.imagesPreloaded = true;
      },
      function() {
        // Loading failed on at least one image
        scope.showError(
          $i18next("avBooth.errorLoadingImages",{}));
      });

      // function that receives updates from the cast ballot service and shows
      // them to the user
      function statusUpdateFunc(status, options) {
      }
      // delay in millisecs
      var delay = 500;

      function encryptBallot() {
        var encryptionInfo = {
          election: scope.election,
          pubkeys: scope.pubkeys,
          statusUpdate: statusUpdateFunc,
          authorizationHeader: scope.authorizationHeader,

          // on success, we first then try to submit, then once submitted we
          // show the next screen (which is the success-screen directive)
          success: function(encryptedBallot, auditableBallot) {
            scope.stateData.auditableBallot = auditableBallot;
            scope.stateData.encryptedBallot = encryptedBallot;
            if(finishedFakeEncryption) {
              scope.next();
            } else {
             finishedRealEncryption = true;
            }
          },

          // on error, try to deal with it
          error: function (status, message) {
            if (status === "errorEncrypting") {
              scope.showError($i18next("avBooth.errorEncrypting",
                {msg:message}));
            } else if (status === "errorEncoding") {
              scope.showError($i18next("avBooth.errorEncoding",
                {msg:message}));
            } else if (status === "sanityChecksFailed") {
              scope.showError($i18next("avBooth.sanityChecksFailed",
                {msg:message}));
            } else {
              scope.showError($i18next("avBooth.errorEncryptingBallotUnknown",
                {msg:message}));
            }
          },
          verify: false,
          delay: delay
        };
        EncryptBallotService(encryptionInfo);
      }

      $timeout(encryptBallot, delay);
      $timeout(fakeStateUpdate, updateTimespan);
    }

    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/encrypting-ballot-screen-directive/encrypting-ballot-screen-directive.html'
    };
  });