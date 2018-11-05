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
    function(ConfigService, Authmethod, $interpolate, $window, $cookies)
    {

    function link(scope, element, attrs) {
      var text = $interpolate(ConfigService.success.text);
      scope.organization = ConfigService.organization;
      scope.showDocOnVoteCast = ConfigService.showDocOnVoteCast;

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
          .success(
            function(data)
            {
              if (data.status !== "ok" || !data.events || data.events.auth_method !== 'openid-connect' || !getLogoutUri())
              {
                simpleRedirectToLogin();
                return;
              }

              var postfix = "_authevent_" + scope.election.id;
              var uri = getLogoutUri();
              delete $cookies["id_token_" + postfix];
              $window.location.href = uri;
            }
          )
          .error(
            function(error)
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
      if (scope.election.presentation.extra_options.success_screen__redirect_to_login__auto_seconds &&
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
