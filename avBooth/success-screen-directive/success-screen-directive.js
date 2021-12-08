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
 * Error indicator directive.
 */
angular.module('avBooth')
  .directive(
    'avbSuccessScreen',
    function(
      ConfigService, 
      Authmethod, 
      QrCodeService,
      PdfMakeService,
      moment,
      $interpolate, 
      $window,
      $modal,
      $i18next,
      $http,
      $cookies)
    {

    function link(scope, element, attrs) {

      function generateButtonsInfo() {
        scope.buttonsInfo = [];

        var data = scope.election.presentation.share_text;
        if (!data) {
          return;
        }
        for(var i = 0, length = data.length; i < length; i++) {
          var p = data[i];
          var buttonInfo = {
            link: '',
            img: '',
            button_text: p.button_text,
            class: 'btn btn-primary',
            network: p.network
          };
          var message = p.social_message;
          message = message.replace(
            '__URL__',
            window.location.protocol + '//' + window.location.host + '/election/' + scope.election.id + '/public/home'
          );

          if('Facebook' === p.network) {
            buttonInfo.link = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(message);
            buttonInfo.img = '/booth/img/facebook_logo_50.png';
            buttonInfo.class = buttonInfo.class + ' btn-facebook';
          } else if('Twitter' === p.network) {
            buttonInfo.link = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(message) + '&source=webclient';
            buttonInfo.img = '/booth/img/twitter_logo_48.png';
            buttonInfo.class = buttonInfo.class + ' btn-twitter';
          }

          scope.buttonsInfo.push(buttonInfo);
        }
      }

      /**
       * Creates a ballot ticket in PDF and opens it in a new tab
       */
      function createBallotTicket() 
      {
        scope.pdf.fileName = 'ticket_' + scope.election.id + '_' + scope.stateData.ballotHash + '.pdf';

        function addEmptyImage(images, name, callback) 
        {
          // empty 1px image
          images[name] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP6fwYAAtMBznRijrsAAAAASUVORK5CYII=';
          callback(images);
        }

        function isEmptyImage(images, name) 
        {
          return images[name] === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP6fwYAAtMBznRijrsAAAAASUVORK5CYII=';
        }

        function isSvgImage(images, name)
        {
          return images[name] !== undefined && !images[name].startsWith('data:image');
        }

        function addImageBlob(images, name, callback, blob) {
            // blob data to URL
            var reader = new FileReader();
            reader.onload = function(event) {
              images[name] = event.target.result;
              callback(images);
            };
            reader.readAsDataURL(blob);
        }

        function addSvgImage(images, name, callback, blob) {
            // blob data to text
            var reader = new FileReader();
            reader.onload = function(event) {
              images[name] = event.target.result;
              callback(images);
            };
            reader.readAsText(blob);
        }

        function getTitleSubtitleColumn() 
        {
          return [
            {
              text: scope.election.presentation.extra_options && scope.election.presentation.extra_options.success_screen__ballot_ticket__logo_header || ConfigService.organization.orgName,
              style: 'h1'
            },
            {
              text: scope.election.presentation.extra_options && scope.election.presentation.extra_options.success_screen__ballot_ticket__logo_subheader || ConfigService.organization.orgSubtitle || "",
              style: 'h2'
            },
          ];
        }

        function download(images) 
        {
          var docDefinition = {
            info: {
              title: scope.pdf.fileName,

            },
            content: [
              isEmptyImage(images, 'logo') ? getTitleSubtitleColumn() : {
                columns: [
                  isSvgImage(images, 'logo') ? {
                    svg: images['logo'],
                    fit: [200, 200]
                  } : {
                    image: 'logo',
                    fit: [200, 200]
                  },
                  getTitleSubtitleColumn()
                ]
              },
              {
                text: scope.election.presentation.extra_options && scope.election.presentation.extra_options.success_screen__ballot_ticket__h3 || $i18next('avBooth.ballotTicket.h3'),
                style: 'h3'
              },
              {
                text: scope.election.presentation.extra_options && scope.election.presentation.extra_options.success_screen__ballot_ticket__h4 || $i18next('avBooth.ballotTicket.h4'),
                style: 'h4'
              },
              {
                columns: [
                  {
                    text: $i18next('avBooth.ballotTicket.tracker'),
                    style: 'cell',
                    width: '40%'
                  },
                  {
                    text: scope.stateData.ballotHash.substr(0, 32) + ' ' + scope.stateData.ballotHash.substr(32, 32),
                    style: 'cell',
                    width: '*'
                  }
                ]
              },
              {
                columns: [
                  {
                    text: $i18next('avBooth.ballotTicket.title'),
                    style: 'cell',
                    width: '40%'
                  },
                  {
                    text: scope.election.title,
                    style: 'cell',
                    width: '*'
                  }
                ]
              },
              {
                columns: [
                  {
                    text: $i18next('avBooth.ballotTicket.id'),
                    style: 'cell',
                    width: '40%'
                  },
                  {
                    text: scope.election.id,
                    style: 'cell',
                    width: '*'
                  }
                ]
              },
              {
                columns: [
                  {
                    text: $i18next('avBooth.ballotTicket.voterId'),
                    style: 'cell',
                    width: '40%'
                  },
                  {
                    text: scope.stateData.ballotResponse.payload.voter_id,
                    style: 'cell',
                    width: '*'
                  }
                ]
              },
              {
                columns: [
                  {
                    text: $i18next('avBooth.ballotTicket.created'),
                    style: 'cell',
                    width: '40%'
                  },
                  {
                    text: moment(scope.stateData.ballotResponse.payload.created)
                            .format('YYYY-MM-DD HH:mm:ss'),
                    style: 'cell',
                    width: '*'
                  }
                ]
              }
            ],
            images: images,
            styles: {
              h1: {
                fontSize: 18,
                bold: true,
                margin: [0, 0, 0, 10]
              },
              h2: {
                fontSize: 16,
                bold: false,
                margin: [0, 10, 0, 5]
              },
              h3: {
                fontSize: 16,
                bold: true,
                margin: [0, 20, 0, 10]
              },
              h4: {
                fontSize: 14,
                bold: true,
                margin: [0, 10, 0, 10]
              },
              cell: {
                fontSize: 12,
                bold: false,
                margin: 7
              },
              link: {
                fontSize: 12,
                bold: true,
                decoration: 'underline',
                color: '#0000ff',
                margin: 7
              },
              p: {
                fontSize: 14,
                bold: false,
                margin: 15
              },
              demo: {
                fontSize: 16,
                bold: true,
                background: '#f0ad4e',
                margin: 15
              }
            }
          };

          // add link
          if (
            !scope.election.presentation.extra_options || 
            !scope.election.presentation.extra_options.success_screen__hide_ballot_tracker
          ) {
            docDefinition.content.push(
              {
                columns: [
                  {
                    text: $i18next('avBooth.ballotTicket.link'),
                    width: '40%',
                    style: 'cell'
                  },
                  {
                    text: $i18next('avBooth.ballotTicket.linkClickHere'),
                    link: scope.ballotTrackerUrl,
                    width: '*',
                    style: 'link'
                  }
                ]
              }
            );
          }

          // add qr code
          if (
            !scope.election.presentation.extra_options || 
            !scope.election.presentation.extra_options.success_screen__hide_qr_code
          ) {
            docDefinition.content.push(
              {
                text: $i18next('avBooth.ballotTicket.qrCode'),
                style: 'p'
              },
              {
                columns: [
                  {
                    text: '',
                    width: '*'
                  },
                  {
                    qr: scope.ballotTrackerUrl,
                    fit: 180
                  },
                  {
                    text: '',
                    width: '*'
                  }
                ]
              }
              
            );
          }
          // if is demo
          if (scope.isDemo) {
            docDefinition.content.push(
              {
                text: $i18next('avBooth.ballotTicket.isDemo'),
                style: 'demo'
              }
            );

          }
          scope.pdf.value = PdfMakeService.createPdf(docDefinition);
        }

        var images = {};

        if (
          scope.election.presentation.extra_options && scope.election.presentation.extra_options.success_screen__ballot_ticket__logo_url ||
          scope.election.logo_url ||
          ConfigService.organization.orgBigLogo
        ) {
          $http({
            method: 'GET',
            url: (
              scope.election.presentation.extra_options && scope.election.presentation.extra_options.success_screen__ballot_ticket__logo_url || 
              scope.election.logo_url || 
              ConfigService.organization.orgBigLogo
            ),
            headers: {
              'Content-Type': 'image/png'
            },
            responseType: 'blob' 
          }).then(
            function onSuccess(response) {
              // this seems like a svg, add it as such
              if (!response.data || !response.data.type.startsWith('image/'))
              {
                addEmptyImage(images, 'logo', download);
              } else if (response.data.type.startsWith('image/svg')) 
              {
                addSvgImage(images, 'logo', download, response.data);
              } else {
                addImageBlob(images, 'logo', download, response.data);
              }
            },
            function onError() {
              addEmptyImage(images, 'logo', download);
            }
          );
        } else {
          addEmptyImage(images, 'logo', download);
        }
      }

      scope.downloadBallotTicket = function () {
        if (scope.pdf.value) {
          scope.pdf.value.download(scope.pdf.fileName);
        }
      };

      // Generate the QR Code if needed
      function generateQrCode() {
        if (
          !scope.election.presentation.extra_options || 
          !scope.election.presentation.extra_options.success_screen__hide_ballot_tracker
        ) {
          var typeNumber = 0;
          var errorCorrectionLevel = 'L';
          scope.ballotTrackerUrl = window.location.protocol + 
            '//' + 
            window.location.host + 
            '/election/' + 
            scope.election.id + 
            '/public/ballot-locator/' + 
            scope.stateData.ballotHash;
          var qr = QrCodeService(typeNumber, errorCorrectionLevel);
          qr.addData(scope.ballotTrackerUrl);
          qr.make();
          scope.qrCodeImg = qr.createImgTag(6, undefined, $i18next("avBooth.qrCodeAlt"));
        }
      }

      // Count the number of elections skipped
      function skippedCount() 
      {
        if (!scope.credentials) {
          return;
        }
        var count = 0;
        for (var i = 0; i < scope.credentials.length; i++)
        {
          var electionCredential = scope.credentials[i];
          if (electionCredential.skipped)
          {
            count += 1;
          }
          if (electionCredential.electionId.toString() === scope.electionId) 
          {
            break;
          }
        }
        return count;
      }

      var text = $interpolate(ConfigService.success.text);
      scope.organization = ConfigService.organization;
      scope.showDocOnVoteCast = ConfigService.showDocOnVoteCast;

      scope.pdf = {value: null, fileName: ''};

      scope.successText = text({electionId: scope.election.id});

      generateQrCode();

      if (
        !scope.election.presentation.extra_options || 
        !scope.election.presentation.extra_options.success_screen__hide_download_ballot_ticket
      ) {
        createBallotTicket();
      }

      generateButtonsInfo();

      // simply redirect to login
      function simpleRedirectToLogin()
      {
        var extra = scope.election.presentation.extra_options;
        var redirectUrl = "/election/" + scope.election.id + "/public/login";
        if (!!extra && !!extra.success_screen__redirect__url)
        {
          redirectUrl = extra.success_screen__redirect__url;
        }
        $window.location.href = redirectUrl;
      }

      // Returns the logout url if any from the appropiate openidprovider
      // TODO: logout asumes that you are using the first provider, so it
      // basically supports only one provider
      function getLogoutUri()
      {
        if (ConfigService.openIDConnectProviders.length === 0 || !ConfigService.openIDConnectProviders[0].logout_uri)
        {
          return false;
        }

        var uri = ConfigService.openIDConnectProviders[0].logout_uri;
        uri = uri.replace("__EVENT_ID__", "" + scope.election.id);

        var postfix = "_authevent_" + scope.election.id;
        if (!!$cookies.get("id_token_" + postfix))
        {
          uri = uri.replace("__ID_TOKEN__", $cookies.get("id_token_" + postfix));
        // if __ID_TOKEN__ is there but we cannot replace it, we need to
        // directly redirect to the login, otherwise the URI might show an
        // error 500
        } else if (uri.indexOf("__ID_TOKEN__") > -1)
        {
          uri = "/election/" + scope.election.id + "/public/login";
        }

        return uri;
      }

      // (maybe logout, in openid when there's a logout_uri and) redirect to login
      scope.redirectToLogin = function()
      {
        if (scope.redirectingToUri)
        {
          return;
        }
        scope.redirectingToUri = true;

        Authmethod.viewEvent(scope.election.id)
          .then(
            function onSuccess(response)
            {
              if (
                response.data.status !== "ok" || 
                !response.data.events || 
                response.data.events.auth_method !== 'openid-connect' || 
                !getLogoutUri()
              ) {
                simpleRedirectToLogin();
                return;
              }

              var postfix = "_authevent_" + scope.election.id;
              var uri = getLogoutUri();
              $cookies.remove("id_token_" + postfix);
              $window.location.href = uri;
            },
            function onError(response)
            {
              simpleRedirectToLogin();
            }
          );
      };

      // deletes and modifies cookies and launch redirects when appropiate
      function handleCookiesAndRedirects() {
        // cookies log out
        var postfix = "_authevent_" + scope.election.id;
        $cookies.remove("authevent_" + postfix);
        $cookies.remove("userid" + postfix);
        $cookies.remove("user" + postfix);
        $cookies.remove("auth" + postfix);
        $cookies.remove("isAdmin" + postfix);
        $cookies.remove("isAdmin" + postfix);
        scope.hasNextElection = scope.isDemo;

        // Process vote_permission_tokens
        if (scope.credentials && scope.credentials.length > 0) {
          // Remove current election from the credentials array. As the
          // credentials array is in natural order, the next election inside
          // the filtered array will be the next election in which this user
          // can vote, if any. Skipped elections also removed.
          var mappedCredentials = _.map(
            scope.credentials,
            function (electionCredential)
            {
              if  (
                electionCredential.electionId.toString() === scope.electionId
              ) {
                return Object.assign(
                  {},
                  electionCredential,
                  {
                    voted: true,
                    numSuccessfulLogins: electionCredential.numSuccessfulLogins + 1
                  }
                );
              } else {
                return electionCredential;
              }
            }
          );
          scope.credentials = mappedCredentials;
          var filtered = _.filter(
            mappedCredentials,
            function (electionCredential)
            {
              return (
                !electionCredential.skipped && 
                !electionCredential.voted &&
                !!electionCredential.token &&
                electionCredential.numSuccessfulLogins <= electionCredential.numSuccessfulLoginsAllowed
              );
            }
          );

          // If there are more elections to vote, set next election.
          if (filtered.length > 0) {
            scope.hasNextElection = true;
            $window.sessionStorage.setItem(
              "vote_permission_tokens", 
              JSON.stringify(mappedCredentials)
            );
          } else {
            $window.sessionStorage.removeItem("vote_permission_tokens");
          }
        }

        /**
         * Stop warning the user about reloading/leaving the page, as the vote
         * has been cast already;
         */
        $window.onbeforeunload = null;
  
        var extra = scope.election.presentation.extra_options;
        // Automatic redirect to login if configured to do so
        if (
          !scope.hasNextElection &&
          !!extra &&
          extra.success_screen__redirect_to_login__auto_seconds &&
          angular.isNumber(
            extra.success_screen__redirect_to_login__auto_seconds
          ) &&
          extra.success_screen__redirect_to_login__auto_seconds >= 0
        ) {
          setTimeout(
            scope.redirectToLogin,
            1000*extra.success_screen__redirect_to_login__auto_seconds
          );
        }
      }

      scope.finish = function ()
      {
        var extra = scope.election.presentation.extra_options;
        if (!!extra && !!extra.success_screen__redirect__url) 
        {
          scope.redirectToLogin();
          return;
        }

        try {
          $window.close();
        } finally {
          scope.redirectToLogin();
        }
      };

      // redirects to next election
      scope.goToNextElection = function () {
        scope.setState(scope.stateEnum.electionChooserScreen, {});
      };

      scope.skippedCount = skippedCount();

      scope.redirectingToUri = false;
      handleCookiesAndRedirects();

      // shows warning when clicking anything related to the demo voting booth
      // saying that this is a demo booth so ballot tracker won't work
      scope.ballotHashClicked = false;
      scope.getBallotLocatorUrl = function () {
        return (
          !scope.ballotHashClicked && scope.isDemo ? "#" : ("/election/" + scope.election.id + "/public/ballot-locator/" + scope.stateData.ballotHash)
        );
      };
      scope.getBallotLocatorTarget = function () {
        return (!scope.ballotHashClicked && scope.isDemo ? "" : "_blank");
      };
      scope.ballotHashWarning = function ()
      {
        if (!scope.isDemo || scope.ballotHashClicked) {
          return false;
        }
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
                header: "avBooth.successDemoVoteNotCastModal.header",
                body: "avBooth.successDemoVoteNotCastModal.body",
                continue: "avBooth.successDemoVoteNotCastModal.confirm",
                cancel: "avBooth.successDemoVoteNotCastModal.cancel"
              };
            }
          }
        }).result.then(
          function ()
          {
            scope.ballotHashClicked = true;
          }
        );
      };
    }

      return {
        restrict: 'AE',
        link: link,
        templateUrl: 'avBooth/success-screen-directive/success-screen-directive.html'
      };
    }
  );
