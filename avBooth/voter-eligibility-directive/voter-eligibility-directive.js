
angular.module('avBooth')
  .directive('avbVoterEligibilityScreen',  function($window, $timeout, $q, $modal, ConfigService) {

    function link(scope, element, attrs) {
    }
    return {
      restrict: 'AE',
      scope: true,
      link: link,
      templateUrl: 'avBooth/voter-eligibility-directive/voter-eligibility-directive.html'
    };
  });
