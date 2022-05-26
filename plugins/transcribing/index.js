const { projectToken } = require('opentok-jwt');
const axios = require('axios');

module.exports = (app, config) => {
  const { apiKey, apiSecret, apiUrl } = config;

  app.post('/:room/startTranscribing', async (req, res) => {
    const expires = Math.floor(new Date() / 1000) + (24 * 60 * 60);
    const projectJWT = projectToken(apiKey, apiSecret, expires);

    const captionURL = `${apiUrl}/v2/project/${apiKey}/captions`;

    const captionPostBody = {
      sessionId: req.body.sessionId,
      token: req.body.token,
      languageCode: 'en-US',
      maxDuration: 36000,
      partialCaptions: 'true',
    };

    let captionResponse;

    try {
      captionResponse = await axios.post(captionURL, captionPostBody, {
        headers: {
          'X-OPENTOK-AUTH': projectJWT,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.warn(err);
      res.status(500);
      res.send(`Error starting transcription services: ${err}`);
      return;
    }
    res.send(captionResponse.data.captionsId);
  });

  app.post('/:room/stopTranscribing', async (req, res) => {
    const captionsId = req.body.captionId;
    const expires = Math.floor(new Date() / 1000) + (24 * 60 * 60);
    const projectJWT = projectToken(apiKey, apiSecret, expires);

    const captionURL = `${apiUrl}/v2/project/${apiKey}/captions/${captionsId}/stop`;
    let captionResponse;

    try {
      captionResponse = await axios.post(captionURL, {}, {
        headers: {
          'X-OPENTOK-AUTH': projectJWT,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.warn(err);
      res.status(500);
      res.send(`Error stopping transcription services: ${err}`);
      return;
    }

    // Express send status is only supported on >= 4.x
    res.send(captionResponse.status);
  });
};
