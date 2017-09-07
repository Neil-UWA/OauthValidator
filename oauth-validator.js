'use strict';
let Promise = require('bluebird');
let request = Promise.promisifyAll(require('request'));

function OauthValidator(config) {
  config = config || {};
  this.service = config.service;
  this.appid = config.appid;
  this.options = { json: true };
}

OauthValidator.prototype._getIdentity = function(data) {
  let identity = undefined;

  try {
    identity = data.uid || data.openid || JSON.parse(data.replace('callback(', '').replace(');', '')).openid;
  } catch (e) {
    return undefined;
  }
  return identity;
};

OauthValidator.prototype.validate = function(token, expectedIdentity) {
  this._buildOptions(token);
  let method = this.service === 'weibo' ? 'postAsync' : 'getAsync';

  return request[method](this.options).spread((res, body) => {
    const identity = this._getIdentity(body);

    //weibo uid is number there for use `==` rather than `===`
    if (identity) {
      return identity == expectedIdentity;
    } else {
      return Promise.reject(body);
    }
  });
};

OauthValidator.prototype._getEndpoint = function() {
  switch (this.service) {
    case 'qq':
      return OauthValidator.QQ_ENDPOINT;
    case 'wechat':
      return OauthValidator.WECHAT_ENDPOINT;
    case 'weibo':
      return OauthValidator.WEIBO_ENDPIONT;
    default:
      return undefined;
  }
};

OauthValidator.prototype._buildOptions = function(token) {
  this.options.uri = this._getEndpoint();
  switch (this.service) {
    case 'weibo':
      this.options.form = { access_token: token };
      break;
    case 'wechat':
      this.options.qs = {
        appid: this.appid,
        grant_type: 'refresh_token',
        refresh_token: token
      };
      break;
    case 'qq':
      this.options.qs = { access_token: token };
      break;
  }
  return this.options;
};

OauthValidator.QQ_ENDPOINT = 'https://graph.qq.com/oauth2.0/me';
OauthValidator.WECHAT_ENDPOINT = 'https://api.weixin.qq.com/sns/oauth2/refresh_token';
OauthValidator.WEIBO_ENDPIONT = 'https://api.weibo.com/oauth2/get_token_info';

module.exports = OauthValidator;
