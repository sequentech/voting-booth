/**
 * Shows a modal showing some issues
 */
angular.module('avBooth')
  .controller('InvalidAnswersController',
    function($scope, $modalInstance, questions, numSelectedOptions)
    {
      $scope.ok = function ()
      {
        $modalInstance.close();
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }
  );
