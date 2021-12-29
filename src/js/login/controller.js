const isValidTokenRole = require('../isValidTokenRole');

const isp2p = room => room && room.toLowerCase().indexOf('p2p') > -1;

angular.module('opentok-meet-login', [])
  .controller('MainCtrl', ['$scope', '$window', function MainCtrl($scope, $window) {
    $scope.room = '';
    $scope.roomType = 'normal';
    $scope.tokenRole = 'moderator';
    $scope.advanced = false;
    $scope.dtx = true;
    $scope.e2ee = false;
    $scope.e2eePassphrase = '';
    $scope.joinRoom = () => {
      const location = new URL($window.location.href);
      let url = `${location.origin}/${encodeURIComponent($scope.room)}`;

      if ($scope.roomType !== 'normal') {
        url += `/${$scope.roomType}`;
      }

      const appendQueryParamToUrl = (queryString) => {
        const precursor = url.includes('?') ? '&' : '?';
        url += precursor + queryString;
      }

      if (!isValidTokenRole($scope.tokenRole)) {
        $scope.tokenRole = 'moderator';
      }

      if ($scope.tokenRole) {
        appendQueryParamToUrl(`tokenRole=${$scope.tokenRole}`);
      }

      if (!$scope.dtx) {
        appendQueryParamToUrl('dtx=false');
      }

      if ($scope.e2ee && $scope.e2eePassphrase) {
        appendQueryParamToUrl(`e2ee=${$scope.e2eePassphrase}`);
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
