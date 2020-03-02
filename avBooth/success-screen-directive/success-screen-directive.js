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
      $i18next,
      $http,
      $cookies)
    {

    function link(scope, element, attrs) {
      var text = $interpolate(ConfigService.success.text);
      scope.organization = ConfigService.organization;
      scope.showDocOnVoteCast = ConfigService.showDocOnVoteCast;

      // Generate the QR Code if needed
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
        scope.qrCodeImg = qr.createImgTag(6);
      }

      scope.pdf = {value: null, fileName: ''};

      function generateButtonsInfo() {
        scope.buttonsInfo = [];

        var data = scope.election.presentation.share_text;
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
      function createBallotTicket() {
        scope.pdf.fileName = 'ticket_' + scope.election.id + '_' + scope.stateData.ballotHash + '.pdf';

        function download(images) {
          var docDefinition = {
            info: {
              title: scope.pdf.fileName,

            },
            content: [
              {
                columns: [
                  {
                    image: 'logo',
                    width: '50%'
                  },
                  [
                    {
                      text: ConfigService.organization.orgSubtitle || ConfigService.organization.orgName,
                      style: 'h1'
                    },
                    {
                      text: ConfigService.organization.orgSubtitle && ConfigService.organization.orgName || "",
                      style: 'h2'
                    },
                  ]
                ]
              },
              {
                text: $i18next('avBooth.ballotTicket.h3'),
                style: 'h3'
              },
              {
                text: $i18next('avBooth.ballotTicket.h4'),
                style: 'h4'
              },
              {
                columns: [
                  [
                    {
                      text: $i18next('avBooth.ballotTicket.tracker'),
                      style: 'p'
                    },
                    {
                      text: $i18next('avBooth.ballotTicket.title'),
                      style: 'p'
                    },
                    {
                      text: $i18next('avBooth.ballotTicket.id'),
                      style: 'p'
                    },
                    {
                      text: $i18next('avBooth.ballotTicket.voterId'),
                      style: 'p'
                    },
                    {
                      text: $i18next('avBooth.ballotTicket.created'),
                      style: 'p'
                    }
                  ],
                  [
                    {
                      text: scope.stateData.ballotHash,
                      style: 'p'
                    },
                    {
                      text: scope.election.title,
                      style: 'p'
                    },
                    {
                      text: scope.election.id,
                      style: 'p'
                    },
                    {
                      text: scope.stateData.voterId,
                      style: 'p'
                    },
                    {
                      text: moment(scope.stateData.ballotResponse.payload.created).format('YYYY-MM-DD hh:mm:ss'),
                      style: 'p'
                    },
                  ]
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
                margin: [0, 10, 0, 10]
              },
              h4: {
                fontSize: 14,
                bold: true,
                margin: [0, 10, 0, 10]
              },
              p: {
                fontSize: 14,
                bold: false
              },
              demo: {
                fontSize: 16,
                bold: true,
                background: '#f0ad4e'
              }
            }
          };

          // add link
          if (!scope.election.presentation.extra_options || !scope.election.presentation.extra_options.success_screen__hide_ballot_tracker) {
            docDefinition.content.push(
              {
                text: $i18next('avBooth.ballotTicket.link'),
                style: 'p'
              },
              {
                text: scope.ballotTrackerUrl,
                link: scope.ballotTrackerUrl,
                style: 'p'
              }
            );
          }

          // add qr code
          if (!scope.election.presentation.extra_options || !scope.election.presentation.extra_options.success_screen__hide_qr_code) {
            docDefinition.content.push(
              {
                text: $i18next('avBooth.ballotTicket.qrCode'),
                style: 'p'
              },
              {
                qr: scope.ballotTrackerUrl,
                fit: 500,
                margin: [100, 10]
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

        function addEmptyImage(images, name, callback) {
          // empty 1px image
          images[name] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP6fwYAAtMBznRijrsAAAAASUVORK5CYII=';
          callback(images);
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

        var images = {};

        $http({
          method: 'GET',
          url: ConfigService.organization.orgBigLogo,
          headers: {
            'Content-Type': 'image/png'
          },
          responseType: 'blob' 
        }).then(
          function onSuccess(response) {
            addImageBlob(images, 'logo', download, response.data);
          },
          function onError() {
            addEmptyImage(images, 'logo', download);
          }
        );
      }

      scope.downloadBallotTicket = function () {
        if (scope.pdf.value) {
          scope.pdf.value.download(scope.pdf.fileName);
        }
      };

      if (!scope.election.presentation.extra_options || !scope.election.presentation.extra_options.success_screen__hide_download_ballot_ticket) {
        createBallotTicket();
      }

      generateButtonsInfo();

      scope.successText = text({electionId: scope.election.id});

      // simply redirect to login
      function simpleRedirectToLogin()
      {
        $window.location.href = "/election/" + scope.election.id + "/public/login";
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
        if (!!$cookies["id_token_" + postfix])
        {
          uri = uri.replace("__ID_TOKEN__", $cookies["id_token_" + postfix]);
        // if __ID_TOKEN__ is there but we cannot replace it, we need to
        // directly redirect to the login, otherwise the URI might show an
        // error 500
        } else if (uri.indexOf("__ID_TOKEN__") > -1)
        {
          uri = "/election/" + scope.election.id + "/public/login";
        }

        return uri;
      }

      scope.redirectingToUri = false;

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
              if (response.data.status !== "ok" || !response.data.events || response.data.events.auth_method !== 'openid-connect' || !getLogoutUri())
              {
                simpleRedirectToLogin();
                return;
              }

              var postfix = "_authevent_" + scope.election.id;
              var uri = getLogoutUri();
              delete $cookies["id_token_" + postfix];
              $window.location.href = uri;
            },
            function onError(response)
            {
              simpleRedirectToLogin();
            }
          );
      };

      // cookies log out
      var postfix = "_authevent_" + scope.election.id;
      delete $cookies["authevent_" + postfix];
      delete $cookies["userid" + postfix];
      delete $cookies["user" + postfix];
      delete $cookies["auth" + postfix];
      delete $cookies["isAdmin" + postfix];
      delete $cookies["isAdmin" + postfix];

      // Automatic redirect to login if configured to do so
      if (!!scope.election.presentation.extra_options &&
	  scope.election.presentation.extra_options.success_screen__redirect_to_login__auto_seconds &&
          angular.isNumber(scope.election.presentation.extra_options.success_screen__redirect_to_login__auto_seconds) &&
          scope.election.presentation.extra_options.success_screen__redirect_to_login__auto_seconds >= 0) {
        setTimeout(
          scope.redirectToLogin,
          1000*scope.election.presentation.extra_options.success_screen__redirect_to_login__auto_seconds
        );
      }
    }

      return {
        restrict: 'AE',
        link: link,
        templateUrl: 'avBooth/success-screen-directive/success-screen-directive.html'
      };
    }
  );
