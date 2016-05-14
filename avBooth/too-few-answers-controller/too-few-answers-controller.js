/**
 * Shows a modal saying: "look, you need to answer more options in the following
 * questions" and the list of questions
 */
angular.module('avBooth')
  .controller('ConfirmNullVoteController',
    function($scope, $modalInstance, questions, numSelectedOptions)
    {
      $scope.ok = function ()
      {
        $modalInstance.close();
      };

      $scope.questions = questions;
      $scope.numSelectedOptions = numSelectedOptions;
    }
  );
