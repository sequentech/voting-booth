/**
 * Shows a modal showing some issues
 */
angular.module('avBooth')
  .controller('InvalidAnswersController',
    function(
      $scope, 
      $modalInstance, 
      data
    ) {
      $scope.ok = function ()
      {
        $modalInstance.close();
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };

      $scope.data = data;
    }
  );
