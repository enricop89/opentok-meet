const appendQueryParamToUrl = (queryString, url) => {
  const delimiter = url.includes('?') ? '&' : '?';
  return `${url}${delimiter}${queryString}`;
};

module.exports = appendQueryParamToUrl;
