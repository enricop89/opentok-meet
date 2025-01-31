const filterousFilters = require('./filterous-filters');

angular.module('opentok-meet').controller('RoomCtrl', ['$scope', '$http', '$window', '$document',
  '$timeout', 'OTSession', 'RoomService', 'baseURL', 'SimulcastService', 'NotificationService',
  function RoomCtrl(
    $scope, $http, $window, $document, $timeout, OTSession, RoomService, baseURL, SimulcastService,
    NotificationService
  ) {
    $scope.streams = OTSession.streams;
    $scope.connections = OTSession.connections;
    $scope.publishing = false;
    $scope.archiveId = null;
    $scope.archiving = false;
    $scope.isAndroid = /Android/g.test(navigator.userAgent);
    $scope.connected = false;
    $scope.reconnecting = false;
    $scope.mouseMove = false;
    $scope.showWhiteboard = false;
    $scope.whiteboardUnread = false;
    $scope.showEditor = false;
    $scope.editorUnread = false;
    $scope.showTextchat = false;
    $scope.textChatUnread = false;
    $scope.leaving = false;
    $scope.zoomed = true;
    $scope.bigZoomed = false;
    $scope.layoutProps = {
      animate: false,
      bigFixedRatio: !$scope.bigZoomed,
      fixedRatio: !$scope.zoomed,
    };
    $scope.filter = 'none';
    $scope.filterousFilters = filterousFilters;
    $scope.webviewComposerRequestInflight = false;
    $scope.webviewComposerId = null;
    $scope.startingWebviewComposing = false;
    $scope.webViewComposerStreamId = null;

    const url = new URL($window.location.href);
    let enableDtx = true;
    if (url.searchParams.get('dtx') === 'false') {
      enableDtx = false;
    }

    const encryptionSecret = url.searchParams.get('e2ee');

    const facePublisherPropsSD = {
      name: 'face',
      width: '100%',
      height: '100%',
      style: {
        nameDisplayMode: 'off',
      },
      enableDtx,
      resolution: '640x480',
      _allowSafariSimulcast: true,
      publishCaptions: true,
    };

    const facePublisherProps720 = Object.assign({
      frameRate: 30,
    }, facePublisherPropsSD);
    facePublisherProps720.resolution = '1280x720';

    const facePublisherProps1080 = Object.assign({}, facePublisherProps720);
    facePublisherProps1080.resolution = '1920x1080';

    $scope.facePublisherProps = facePublisherProps720;

    $scope.notMine = stream =>
      stream.connection.connectionId !== $scope.session.connection.connectionId;

    $scope.getPublisher = id => OTSession.publishers.filter(x => x.id === id)[0];

    $scope.togglePublish = (quality) => {
      if (!$scope.publishing) {
        let props = facePublisherPropsSD;
        if (quality) {
          props = quality === 1080 ? facePublisherProps1080 : facePublisherProps720;
        }
        $scope.facePublisherProps = props;
      }
      $scope.publishing = !$scope.publishing;
    };

    $scope.forceMuteAll = () => {
      $scope.session.forceMuteAll().then(() => {
        console.log('forceMuteAll complete');
      }).catch((error) => {
        console.error('forceMuteAll failed', error);
      });
    };

    $scope.muteOnEntry = () => {
      const myStream = OT.publishers.find().stream;
      $scope.session.forceMuteAll([myStream]).then(() => {
        console.log('Enable MuteOnEntry complete');
      }).catch((error) => {
        console.error('Enable MuteOnEntry failed', error);
      });
    };

    $scope.disableMuteOnEntry = () => {
      $scope.session.disableForceMute().then(() => {
        console.log('Disable MuteOnEntry complete');
      }).catch((error) => {
        console.error('Disable MuteOnEntry failed', error);
      });
    };

    $scope.forceMuteAllExcludingPublisherStream = () => {
      const streamId = (OT.publishers.find() || {}).streamId;
      const streams = (OT.sessions.find() || {}).streams;
      const stream = streams ? streams.get(streamId) : undefined;
      $scope.session.forceMuteAll([stream]).then(() => {
        console.log('forceMuteAllExcludingPublisherStream complete');
      }).catch((error) => {
        console.error('forceMuteAllExcludingPublisherStream failed', error);
      });
    };

    const startArchiving = () => {
      $scope.archiving = true;
      $http.post(`${baseURL + $scope.room}/startArchive`).then((response) => {
        if (response.data.error) {
          $scope.archiving = false;
          console.error('Failed to start archive', response.data.error);
        } else {
          $scope.archiveId = response.data.archiveId;
        }
      }).catch((response) => {
        console.error('Failed to start archiving', response);
        $scope.archiving = false;
      });
    };

    const stopArchiving = () => {
      $scope.archiving = false;
      $http.post(`${baseURL + $scope.room}/stopArchive`, {
        archiveId: $scope.archiveId,
      }).then((response) => {
        if (response.data.error) {
          console.error('Failed to stop archiving', response.data.error);
          $scope.archiving = true;
        } else {
          $scope.archiveId = response.data.archiveId;
        }
      }).catch((response) => {
        console.error('Failed to stop archiving', response);
        $scope.archiving = true;
      });
    };

    const startTranscribing = () => {
      $scope.transcribing = true;
      const postBody = {
        sessionId: $scope.session.sessionId,
        token: $scope.session.token,
      };

      $http.post(`${baseURL + $scope.room}/startTranscribing`, postBody).then((response) => {
        if (response.data.error) {
          $scope.transcribing = false;
          console.error('Failed to start transcribing', response.data.error);
        } else {
          $scope.transcribeId = response.data;
          console.log(`Transcribe ID: ${$scope.transcribeId}`);
        }
      }).catch((response) => {
        console.error('Failed to start transcribing', response);
        $scope.transcribing = false;
      });
    };

    const stopTranscribing = () => {
      $scope.transcribing = false;
      $http.post(`${baseURL + $scope.room}/stopTranscribing`, {
        captionId: $scope.transcribeId,
      }).then((response) => {
        if (response.data.error) {
          console.error('Failed to stop transcribing', response.data.error);
          $scope.transcribing = true;
        } else {
          $scope.transcribingId = '';
        }
      }).catch((response) => {
        console.error('Failed to stop transcribing', response);
        $scope.transcribing = true;
      });
    };

    $scope.reportIssue = () => {
      let url = `mailto:broken@tokbox.com?subject=Meet%20Issue%20Report&body=room: ${$scope.room}  p2p: ${$scope.p2p}`;
      if ($scope.session) {
        url += ` sessionId: ${$scope.session.sessionId} connectionId: ${($scope.session.connection ? $scope.session.connection.connectionId : 'none')}`;
      }
      OT.publishers.forEach((publisher) => {
        if (publisher.stream) {
          url += ` publisher streamId: ${publisher.stream.streamId} publisher stream type: ${publisher.stream.videoType}`;
        }
      });
      OT.subscribers.forEach((subscriber) => {
        if (subscriber.stream) {
          url += ` subscriber streamId: ${subscriber.stream.streamId}
            subscriber stream type: ${subscriber.stream.videoType} subscriber id: ${subscriber.id}`;
        }
      });
      $window.open(url);
      return false;
    };

    $scope.toggleArchiving = () => {
      if ($scope.archiving) {
        stopArchiving();
      } else {
        startArchiving();
      }
    };

    $scope.toggleTranscribing = () => {
      const transcribeWarningTimeout = 1 * 1000;
      if (!$scope.isModerator) {
        $scope.unmoddedTranscribe = true;
        setTimeout(() => {
          $scope.unmoddedTranscribe = false;
        }, transcribeWarningTimeout);
        return;
      }

      if ($scope.transcribing) {
        stopTranscribing();
      } else {
        startTranscribing();
      }
    };

    $scope.toggleWhiteboard = () => {
      $scope.showWhiteboard = !$scope.showWhiteboard;
      $scope.whiteboardUnread = false;
      setTimeout(() => {
        $scope.$broadcast('otLayout');
      }, 10);
    };

    $scope.toggleEditor = () => {
      $scope.showEditor = !$scope.showEditor;
      $scope.editorUnread = false;
      setTimeout(() => {
        $scope.$broadcast('otLayout');
        $scope.$broadcast('otEditorRefresh');
      }, 10);
    };

    $scope.toggleTextchat = () => {
      $scope.showTextchat = !$scope.showTextchat;
      $scope.textChatUnread = false;
    };

    const webViewComposerSignals = {
      INFLIGHT_STOP: 'inflightStop',
      INFLIGHT_START: 'inflightStart',
      RENDER_STARTED: 'renderStarted',
      RENDER_STOPPED: 'renderStopped',
      QUERY_RENDER: 'queryRender',
    };

    const webViewComposerInflightAction = {
      START: 'START',
      STOP: 'STOP',
    };

    const reportInflighStart = () => {
      $scope.webviewComposerRequestInflight = true;
      $scope.session.signal({
        type: 'wvc',
        data: {
          msg: webViewComposerSignals.INFLIGHT_START,
          action: $scope.webviewComposerRequestAction,
        },
      });
    };

    const reportInflighStop = () => {
      $scope.webviewComposerRequestInflight = false;
      $scope.session.signal({
        type: 'wvc',
        data: {
          msg: webViewComposerSignals.INFLIGHT_STOP,
        },
      });
    };

    const reportRenderStarted = () => {
      $scope.session.signal({
        type: 'wvc',
        data: {
          msg: webViewComposerSignals.RENDER_STARTED,
          id: $scope.webviewComposerId,
        },
      });
    };

    const reportRenderStopped = () => {
      $scope.session.signal({
        type: 'wvc',
        data: {
          msg: webViewComposerSignals.RENDER_STOPPED,
        },
      });
    };

    const queryRender = () => {
      $scope.session.signal({
        type: 'wvc',
        data: {
          msg: webViewComposerSignals.QUERY_RENDER,
        },
      });
    };

    const handleWVCSessionSignal = (data) => {
      switch (data.msg) {
        case webViewComposerSignals.INFLIGHT_START:
          if (!$scope.webviewComposerRequestInflight) {
            $scope.webviewComposerRequestInflight = true;
            $scope.webviewComposerRequestAction = data.action;
          }
          break;

        case webViewComposerSignals.INFLIGHT_STOP:
          if ($scope.webviewComposerRequestInflight) {
            $scope.webviewComposerRequestInflight = false;
          }
          break;

        case webViewComposerSignals.RENDER_STARTED:
          if (!$scope.webviewComposerId) {
            console.log('started', data.id);
            $scope.webviewComposerId = data.id;
          }
          break;

        case webViewComposerSignals.RENDER_STOPPED:
          if ($scope.webviewComposerId) {
            $scope.webviewComposerId = null;
            $scope.webViewComposerStreamId = null;
          }
          break;

        case webViewComposerSignals.QUERY_RENDER:
          if ($scope.webviewComposerId) {
            reportRenderStarted($scope.webviewComposerId);
          } else if ($scope.webviewComposerRequestInflight) {
            reportInflighStart();
          }
          break;

        default:
          console.log('Unexpected signal received: ', data.msg);
      }
    };

    const handleWVCServerSignal = (data) => {
      switch (data.status) {
        case 'stopped':
          $scope.webviewComposerId = null;
          $scope.webViewComposerStreamId = null;
          break;

        case 'started':
          if (data.streamId) {
            $scope.webViewComposerStreamId = data.streamId;
          }
          break;

        case 'failed':
          $scope.webviewComposerId = null;
          $scope.webViewComposerStreamId = null;
          $scope.$broadcast('otError', { message: 'Webview composer failed' });
          break;

        default:
          console.log('Unexpected singal received: ', data);
      }
    };

    $scope.toggleWebcomposing = () => {
      if ($scope.webviewComposerRequestInflight) { return; }
      $scope.webviewComposerRequestAction = $scope.webviewComposerId ?
        webViewComposerInflightAction.STOP : webViewComposerInflightAction.START;
      reportInflighStart();
      if ($scope.webviewComposerId) {
        const postData = { id: $scope.webviewComposerId };
        $http.post(`${baseURL + $scope.room}/stop-web-view-composing`, postData)
          .then(() => {
            reportInflighStop();
            reportRenderStopped();
            $scope.webviewComposerId = null;
            $scope.webViewComposerStreamId = null;
          }, (error) => {
            reportInflighStop();
            console.log('Failed to stop webview composer', error);
            $timeout(() => $scope.$broadcast('otError', { message: `Failed to stop webview composer: ${error.statusText}` }));
          });
      } else {
        RoomService.getWebviewComposerRoom().then((roomData) => {
          const postData = roomData;
          postData.url = `${window.location.href}/webview-composer-app`;
          const roomPathWithNoParams = window.location.href.split('?')[0];
          postData.statusCallbackUrl = `${roomPathWithNoParams}/status-callback`;
          $http.post(`${baseURL + $scope.room}/start-web-view-composing`, postData)
            .then((response) => {
              reportInflighStop();
              if (response.data.id) {
                $scope.webviewComposerId = response.data.id;
                reportRenderStarted($scope.webviewComposerId);
              } else {
                console.log('Wrong answer from server', response.data);
                $timeout(() => $scope.$broadcast('otError', { message: 'Unexpected answer from server' }));
              }
            }, (error) => {
              console.log('Failed to start webview composer: ', error);
              reportInflighStop();
              $timeout(() => $scope.$broadcast('otError', { message: `Failed to start webview composer: ${error.statusText}` }));
            });
        });
      }
    };

    NotificationService.init();

    // Fetch the room info
    RoomService.getRoom().then((roomData) => {
      if (roomData.error === 'AUTH-REQUIRED') {
        $window.location.href = '/login';
      }
      if (roomData.error === 'SESSION-EXPIRED') {
        $window.location.reload();
      }

      if ($scope.session) {
        $scope.session.disconnect();
      }
      $scope.p2p = roomData.p2p;
      $scope.room = roomData.room;
      $scope.shareURL = baseURL === '/' ? $window.location.href : baseURL + roomData.room;
      $scope.isModerator = roomData.role === 'moderator';

      const sessionOptions = encryptionSecret ? { encryptionSecret } : {};

      OTSession.init(
        roomData.apiKey, roomData.sessionId, roomData.token, sessionOptions,
        (err, session) => {
          if (err) {
            $scope.$broadcast('otError', { message: err.message });
            return;
          }
          $scope.session = session;
          const connectDisconnect = (connected) => {
            $scope.$apply(() => {
              $scope.connected = connected;
              $scope.reconnecting = false;
              if (!connected) {
                $scope.publishing = false;
              }
            });
          };
          const reconnecting = (isReconnecting) => {
            $scope.$apply(() => {
              $scope.reconnecting = isReconnecting;
            });
          };
          if ((session.is && session.is('connected')) || session.connected) {
            connectDisconnect(true);
          }
          $scope.session.on('sessionConnected', connectDisconnect.bind($scope.session, true));
          $scope.session.on('sessionDisconnected', connectDisconnect.bind($scope.session, false));
          $scope.session.on('archiveStarted archiveStopped', (event) => {
          // event.id is the archiveId
            $scope.$apply(() => {
              $scope.archiveId = event.id;
              $scope.archiving = (event.type === 'archiveStarted');
            });
          });
          SimulcastService.init($scope.streams, $scope.session);
          $scope.session.on('sessionReconnecting', reconnecting.bind($scope.session, true));
          $scope.session.on('sessionReconnected', reconnecting.bind($scope.session, false));

          // webview composer signaling
          $scope.session.on('signal:wvc', (event) => {
            if ($scope.session.connection && event.from && event.from.connectionId !== $scope.session.connection.id) {
            // This signal is originated by an user action.
              handleWVCSessionSignal(event.data);
            } else {
            // This signal is coming from the server
              handleWVCServerSignal(event.data);
            }
          });

          queryRender();
        }
      );

      const whiteboardUpdated = () => {
        if (!$scope.showWhiteboard && !$scope.whiteboardUnread) {
          // Someone did something to the whiteboard while we weren't looking
          $scope.$apply(() => {
            $scope.whiteboardUnread = true;
            $scope.mouseMove = true; // Show the bottom bar
          });
        }
      };
      const editorUpdated = () => {
        if (!$scope.showEditor && !$scope.editorUnread) {
          // Someone did something to the editor while we weren't looking
          $scope.$apply(() => {
            $scope.editorUnread = true;
            $scope.mouseMove = true; // Show the bottom bar
          });
        }
      };
      const textChatMessage = () => {
        if (!$scope.showTextchat) {
          $scope.textChatUnread = true;
          $scope.mouseMove = true; // Show the bottom bar
          $scope.$apply();
        }
      };
      $scope.$on('otEditorUpdate', editorUpdated);
      $scope.$on('otWhiteboardUpdate', whiteboardUpdated);
      $scope.$on('otTextchatMessage', textChatMessage);

      const params = new URLSearchParams($window.location.search);
      $scope.publishing = (params.get('autoPublish') !== 'false');
    });

    $scope.$on('changeZoom', (event, expanded) => {
      if (expanded) {
        $scope.bigZoomed = !$scope.bigZoomed;
      } else {
        $scope.zoomed = !$scope.zoomed;
      }
      $scope.layoutProps = {
        animate: false,
        bigFixedRatio: !$scope.bigZoomed,
        fixedRatio: !$scope.zoomed,
      };
      $scope.$broadcast('otLayout');
    });

    $scope.changeRoom = () => {
      if (!$scope.leaving) {
        $scope.leaving = true;
        $scope.session.disconnect();
        $scope.session.on('sessionDisconnected', () => {
          $scope.$apply(() => {
            RoomService.changeRoom();
          });
        });
      }
    };

    $scope.sendEmail = () => {
      $window.location.href = `mailto:?subject=Let's Meet&body=${$scope.shareURL}`;
    };

    let mouseMoveTimeout;
    const mouseMoved = () => {
      if (!$scope.mouseMove) {
        $scope.$apply(() => {
          $scope.mouseMove = true;
        });
      }
      if (mouseMoveTimeout) {
        $timeout.cancel(mouseMoveTimeout);
      }
      mouseMoveTimeout = $timeout(() => {
        $scope.$apply(() => {
          $scope.mouseMove = false;
        });
      }, 5000);
    };
    $window.addEventListener('mousemove', mouseMoved);
    $window.addEventListener('touchstart', mouseMoved);
    $document.context.body.addEventListener('orientationchange', () => {
      $scope.$broadcast('otLayout');
    });

    $scope.$on('$destroy', () => {
      if ($scope.session && $scope.connected) {
        $scope.session.disconnect();
        $scope.connected = false;
      }
      $scope.session = null;
    });
  }]);
