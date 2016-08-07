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
    function(ConfigService, $interpolate, $i18next)
    {

      function link(scope, element, attrs)
      {
        var text = $interpolate(ConfigService.success.text);
        scope.organization = ConfigService.organization;
        if (scope.election.id === 147140)
        {
          scope.election.presentation.tweetLinks =
          [
            {
              share_text: "Eusko Legebiltzarrerako hauuteskundeetarako konfluentziei buruzko botaketan parte hartu dut! #PodemosEuskadiDecide",
              link_text: '¡Twitea hauteskunde honetan!'
            },
            {
              share_text: "¡He participado en la votación para decidir sobre las confluencias en las elecciones al Parlamento Vasco 2016! #PodemosEuskadiDecide",
              link_text: $i18next("avCommon.shareLink")
            }
          ];
        } else
        {
          scope.election.presentation.tweetLinks = [
            {
              share_text: scope.election.presentation.share_text,
              link_text: $i18next("avCommon.shareLink")
            }
          ];
        }

        scope.tweetLinkGenerator = function (share_text)
        {
          return 'https://twitter.com/intent/tweet?text=' +
            encodeURIComponent(share_text) +
            '&source=webclient';
        };

        scope.successText = text({electionId: scope.election.id});
      }

      return {
        restrict: 'AE',
        link: link,
        templateUrl: 'avBooth/success-screen-directive/success-screen-directive.html'
      };
    }
  );
