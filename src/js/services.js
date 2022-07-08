const appendQueryParamToUrl = require('./append-query-param-to-url');

// Asynchronous fetching of the room. This is so that the mobile app can use the
// same controller. It doesn't know the room straight away
angular.module('opentok-meet').factory('RoomService', ['$http', 'baseURL', '$window', 'room', 'tokenRole',
  function RoomService($http, baseURL, $window, room, tokenRole) {
    return {
      getRoom(roomName) {
        const e2ee = (new URL(document.location)).searchParams.get('e2ee');
        const r = roomName || room;
        let url = `${baseURL}${r}`;
        if (tokenRole) {
          url = appendQueryParamToUrl(`tokenRole=${tokenRole}`, url);
        }
        if (e2ee) {
          url = appendQueryParamToUrl('e2ee=true', url);
        }

        return $http.get(url)
          .then(response => response.data)
          .catch(response => response.data);
      },
      changeRoom() {
        $window.location.href = baseURL;
      },
      getWebviewComposerRoom() {
        return this.getRoom(`${room}_wvc`);
      },
    };
  },
]);
