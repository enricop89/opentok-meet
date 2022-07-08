const isValidTokenRole = require('../isValidTokenRole');
const appendQueryParamToUrl = require('../append-query-param-to-url');

const isp2p = room => room && room.toLowerCase().indexOf('p2p') > -1;

angular.module('opentok-meet-login', [])
  .controller('MainCtrl', ['$scope', '$window', function MainCtrl($scope, $window) {
    $scope.room = '';
    $scope.roomType = 'normal';
    $scope.tokenRole = 'moderator';
    $scope.advanced = false;
    $scope.dtx = true;
    $scope.e2ee = false;
    $scope.encryptionSecret = '';
    $scope.joinRoom = () => {
      const location = new URL($window.location.href);
      let url = `${location.origin}/${encodeURIComponent($scope.room)}`;

      if ($scope.roomType !== 'normal') {
        url += `/${$scope.roomType}`;
      }

      if (!isValidTokenRole($scope.tokenRole)) {
        $scope.tokenRole = 'moderator';
      }

      if ($scope.tokenRole) {
        url = appendQueryParamToUrl(`tokenRole=${$scope.tokenRole}`, url);
      }

      if (!$scope.dtx) {
        url = appendQueryParamToUrl('dtx=false', url);
      }

      if ($scope.e2ee && $scope.encryptionSecret) {
        url = appendQueryParamToUrl(`e2ee=${$scope.encryptionSecret}`, url);
      }

      $window.location.href = url;
    };
    $scope.p2p = false;
    $scope.$watch('room', (room) => {
      $scope.p2p = isp2p(room);
    });
    $scope.p2pChanged = () => {
      if ($scope.p2p && !isp2p($scope.room)) {
        $scope.room += 'p2p';
      } else if (!$scope.p2p) {
        $scope.room = $scope.room.replace('p2p', '');
      }
    };
  }]);
