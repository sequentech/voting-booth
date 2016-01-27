/*
 * Start screen directive.
 *
 * Shows the steps to the user.
 */
angular.module('avBooth')
  .directive('avbStartScreen',  function(ConfigService) {

    function link(scope, element, attrs) {
        scope.tosTitle = ConfigService.tos.title;
        scope.tosText = ConfigService.tos.text;
        scope.extra_data = {};
        scope.legal = false;
        if (attrs.extra !== undefined) {
            scope.extra_data = JSON.parse(attrs.extra);
            var d = scope.extra_data;
            if (d.name && d.org && d.nif && d.contact) {
                scope.legal = true;
            }
        }
    }

    return {
      restrict: 'AE',
      scope: true,
      link: link,
      templateUrl: 'avBooth/start-screen-directive/start-screen-directive.html'
    };
  });
