angular.module('avBooth')
  .directive('avLegalFoot', function() {
    // we use it as something similar to a controller here
    function link(scope, element, attrs) {
        scope.extra_data = {};
        if (attrs.extra !== undefined) {
            scope.extra_data = JSON.parse(attrs.extra);
        }
    }

    return {
      restrict: 'AE',
      scope: {
      },
      link: link,
      templateUrl: 'avBooth/foot-directive/foot-directive.html'
    };
  });
