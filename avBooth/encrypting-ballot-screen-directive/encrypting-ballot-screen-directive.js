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
       ConfigService
  ) {
  function link(scope, element, attrs) {

    var busyStateEnum = [
      'waiting',
      'working',
      'finished'
    ];

    scope.organization = ConfigService.organization;

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

    scope.checkIsImgOneTop = function() {
      return 0 === (scope.fakeStepIndex % 2);
    };

    scope.stepImg = new Image();
    scope.isImgOneTop = scope.checkIsImgOneTop();
    var busyImageObj = {
       'booth/img/loading.gif': scope.stepImg,
       'booth/img/options.png': new Image(),
       'booth/img/cast.png': new Image(),
       'booth/img/encrypted.png': new Image(),
       'booth/img/anonymized1.png': new Image(),
       'booth/img/anonymized2.png': new Image()
    };
    var busyImageKeys = Object.keys(busyImageObj);

    function getBusyImg(isTop) {
      if ( isTop ) {
        return scope.stepList[scope.fakeStepIndex].centralImgSrc;
      } else {
        if (0 === scope.fakeStepIndex) {
          return scope.stepList[1].centralImgSrc;
        }
        return scope.stepList[scope.fakeStepIndex - 1].centralImgSrc;
      }
    }

    scope.imagesPreloaded = false;
    var imagesArray = [];
    var backCount = busyImageKeys.length; // when this is 0, set imagesPreloaded to true

    function removeAllChilds(elem) {
      while (elem.firstChild) {
        elem.removeChild(elem.firstChild);
      }
    }

    function updateDomImages() {
      var oneDiv = document.getElementById('div-id-one');
      var twoDiv = document.getElementById('div-id-two');
      if(oneDiv && twoDiv) {
        var oneSrc = getBusyImg(!scope.isImgOneTop);
        busyImageObj[oneSrc].style.opacity = (scope.isImgOneTop? 0 : 1);
        if (oneDiv.firstChild) {
          if (busyImageObj[oneSrc] !== oneDiv.firstChild) {
            removeAllChilds(oneDiv);
            oneDiv.appendChild(busyImageObj[oneSrc]);
          }
        } else {
          oneDiv.appendChild(busyImageObj[oneSrc]);
        }
        oneDiv.firstChild.style.opacity = (scope.isImgOneTop? 0 : 1);

        var twoSrc = getBusyImg(scope.isImgOneTop);
        if (twoDiv.firstChild) {
          if (busyImageObj[twoSrc] !== twoDiv.firstChild) {
            removeAllChilds(twoDiv);
            twoDiv.appendChild(busyImageObj[twoSrc]);
          }
        } else {
          twoDiv.appendChild(busyImageObj[twoSrc]);
        }
        twoDiv.firstChild.style.opacity = (scope.isImgOneTop? 1 : 0);
      } else {
        $timeout(updateDomImages, 20);
      }
    }

    function checkCount() {
        if(backCount > 0) {
          backCount = backCount - 1;
        }
        if (backCount <= 0) {
          scope.imagesPreloaded = true;
          updateDomImages();
        }
    }
    
    function getImageAlt(imagePath) {
      return imagePath.substr(imagePath.lastIndexOf('/')+1);
    }

    for(var i = 0; i < busyImageKeys.length; i++) {
      busyImageObj[busyImageKeys[i]].onload = checkCount();
      busyImageObj[busyImageKeys[i]].src = busyImageKeys[i];
      busyImageObj[busyImageKeys[i]].setAttribute('alt', getImageAlt(busyImageKeys[i]));
    }

    function fakeStateUpdate() {
      scope.stepList[scope.fakeStepIndex].state = busyStateEnum[2];

      if (scope.fakeStepIndex + 1 < scope.stepList.length) {
        scope.fakeStepIndex = scope.fakeStepIndex + 1;
        scope.isImgOneTop = scope.checkIsImgOneTop();
        scope.stepList[scope.fakeStepIndex].state = busyStateEnum[1];
        updateDomImages();
        scope.$apply();
        if (scope.fakeStepIndex + 1 < scope.stepList.length || !finishedRealEncryption) {
          $timeout(fakeStateUpdate, updateTimespan);
        } else {
          $timeout(fakeStateUpdate, updateTimespan/5);
        }
      } else {
        updateDomImages();
        scope.$apply();
        if (!!finishedRealEncryption) {
          scope.next();
        } else {
          finishedFakeEncryption = true;
        }
      }
    }

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
      $timeout(fakeStateUpdate, updateTimespan/5);
    }

    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/encrypting-ballot-screen-directive/encrypting-ballot-screen-directive.html'
    };
  });