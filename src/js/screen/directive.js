// Shared directive between room.ejs and screen.ejs
// This handles OpenTok screensharing and sets `$scope.sharingMyScreen` to true
// when you are ready to share your screen. Then you need to include an ot-publisher
// somewhere else in your application using the screenPublisherProps and the id 'screenPublisher'
angular.module('opentok-meet').directive('screenShareDialogs', () => ({
  restrict: 'E',
  template: `<div id="screenShareFailed" class="statusMessage" ng-if="screenShareFailed">
    Screen Share Failed {{screenShareFailed}}</div>
    <div id="installScreenshareExtension" class="statusMessage" ng-if="promptToInstall">
    You need a Chrome extension to share your screen. 
    <a href="{{ 'https://chrome.google.com/webstore/detail/' + chromeExtensionId }}" target="_blank">Install Screensharing Extension</a>.
     Once you have installed refresh your browser and click the share screen button again.
    </div>
    <div id="screenShareUnsupported" class="statusMessage" ng-if="!screenShareSupported">
        Screen Sharing currently requires Google Chrome or Firefox on Desktop.
    </div>`,
  controller: ['$scope', 'chromeExtensionId', function controller($scope, chromeExtensionId) {
    $scope.promptToInstall = false;
    $scope.selectingScreenSource = false;
    $scope.sharingMyScreen = false;
    $scope.screenShareSupported = true;
    $scope.screenShareFailed = null;
    $scope.chromeExtensionId = chromeExtensionId;
    $scope.screenAvailable = true;
    $scope.screenCanvasAvailable = true;


    OT.registerScreenSharingExtension('chrome', chromeExtensionId);

    OT.checkScreenSharingCapability((response) => {
      const supported = response.supported && response.extensionRegistered !== false;
      if (supported !== $scope.screenShareSupported) {
        $scope.screenShareSupported = supported;
        $scope.$apply();
      }
    });

    $scope.$on('otPublisherError', (event, error, publisher) => {
      if (publisher.id === 'screenPublisher') {
        $scope.$apply(() => {
          $scope.screenShareFailed = error.message;
          if ($scope.screenCanvasAvailable) {
            $scope.toggleShareScreenCanvas();
          } else {
            $scope.toggleShareScreen();
          }
        });
      }
    });

    $scope.$on('otStreamDestroyed', (event) => {
      if (event.targetScope.publisher.id === 'screenPublisher') {
        $scope.$apply(() => {
          $scope.sharingMyScreen = false;
          $scope.screenAvailable = true;
          $scope.screenCanvasAvailable = true;
        });
      }
    });

    $scope.toggleShareScreen = () => {
      shareScreen({
        videoSource: 'screen',
        scalableScreenshare: true,
      });
    };

    $scope.toggleShareScreenCanvas = () => {
      // Hard coded values for testing purposes: HD at 15fps
      // TODO: param from dialog box
      const screenProps = {
        videoSource: 'screenCanvas',
        screenwidth: 1280,
        screenheight: 720,
        framerate: 15
      }
      shareScreen(screenProps);
    };

    const setScreenShareProps = (props) => {
      $scope.screenPublisherProps = {
        name: 'screen',
        style: {
          nameDisplayMode: 'off',
        },
        publishAudio: false,
      };
      for([key, val] of Object.entries(props)) {
        $scope.screenPublisherProps[key] = val;
      }
    };

    const shareScreen = (props) => {
      if (!$scope.sharingMyScreen && !$scope.selectingScreenSource) {
        const isCanvas = props.videoSource === 'screenCanvas';
        setScreenShareProps(props);
        $scope.selectingScreenSource = true;
        $scope.screenShareFailed = null;

        OT.checkScreenSharingCapability((response) => {
          if (!response.supported || response.extensionRegistered === false) {
            $scope.screenShareSupported = false;
            $scope.selectingScreenSource = false;
          } else if (response.extensionInstalled === false && response.extensionRegistered) {
            $scope.promptToInstall = true;
            $scope.selectingScreenSource = false;
          } else {
            $scope.sharingMyScreen = true;
            $scope.selectingScreenSource = false;
            $scope.screenAvailable = !isCanvas;
            $scope.screenCanvasAvailable = isCanvas;
          }
          $scope.$apply();
        });
      } else if ($scope.sharingMyScreen) {
        $scope.sharingMyScreen = false;
        $scope.screenAvailable = true;
        $scope.screenCanvasAvailable = true;
      }
    };
  }],
}));
