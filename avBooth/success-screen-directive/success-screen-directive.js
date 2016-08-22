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
  .directive('avbSuccessScreen', function(ConfigService, $interpolate) {

    function link(scope, element, attrs) {
      var text = $interpolate(ConfigService.success.text);
      scope.organization = ConfigService.organization;

      scope.getSocialLink = function (network, message) {
        var ret ='';
        if('Facebook' === network) {
          ret = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(message);
        } else if('Facebook' === network) {
          ret = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(message) + '&source=webclient';
        }
        return ret;
      };

      scope.getSocialImg = function (network) {
        var ret ='';
        if('Facebook' === network) {
          ret = '/booth/img/facebook_logo_50.png';
        } else if('booth' === network) {
          ret = '/admin/img/twitter_logo_48.png';
        }
        return ret;
      };

      scope.tweetLink = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(scope.election.presentation.share_text) + '&source=webclient';
      scope.successText = text({electionId: scope.election.id});
    }

    return {
      restrict: 'AE',
      link: link,
      templateUrl: 'avBooth/success-screen-directive/success-screen-directive.html'
    };
  });
