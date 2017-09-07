'use strict';

let OauthValidator = require('../oauth-validator.js');
let Promise = require('bluebird');
let sinon = require('sinon');
let expect = require('chai').expect;

var request = Promise.promisifyAll(require('request'));

const QQ_ENDPOINT = 'https://graph.qq.com/oauth2.0/me';
const WECHAT_ENDPOINT = 'https://api.weixin.qq.com/sns/oauth2/refresh_token';
const WEIBO_ENDPIONT = 'https://api.weibo.com/oauth2/get_token_info';

describe('OauthValidator', function() {
  describe('#constructor', () => {
    it('works', () => {
      let oauthValidator = new OauthValidator({ service: 'qq' });
      expect(oauthValidator.service).to.eql('qq');
      expect(oauthValidator).to.be.an.instanceof(OauthValidator);
      expect(oauthValidator.options).to.eql({ json: true });
    });
  });

  describe('.getIdentity', () => {
    let qq = 'callback( {"client_id": "1234", "openid": "111111"} );';
    let wechat = { openid: '222222' };
    let weibo = { uid: '333333' };

    beforeEach(() => {
      this.oauthValidator = new OauthValidator();
    });

    it('returns uid when login with weibo', () => {
      this.oauthValidator.service = 'weibo';
      expect(this.oauthValidator.getIdentity(weibo)).to.eql('333333');
    });

    it('returns openid when login with qq', () => {
      this.oauthValidator.service = 'qq';
      expect(this.oauthValidator.getIdentity(qq)).to.eql('111111');
    });

    it('returns openid when login with wechat', () => {
      this.oauthValidator.service = 'wechat';
      expect(this.oauthValidator.getIdentity(wechat)).to.eql('222222');
    });

    it('should return undefined when data is invalid', () => {
      expect(this.oauthValidator.getIdentity({ xxx: 'wrong' })).to.eql(undefined);
    });
  });

  describe('.getEndpoint', () => {
    [
      { service: 'wechat', endpoint: OauthValidator.WECHAT_ENDPOINT },
      { service: 'qq', endpoint: OauthValidator.QQ_ENDPOINT },
      { service: 'weibo', endpoint: OauthValidator.WEIBO_ENDPIONT }
    ].forEach(data => {
      it(`should return ${data.service} endpoint with service ${data.service}`, () => {
        let oauthValidator = new OauthValidator({ service: data.service });
        expect(oauthValidator.getEndpoint()).to.eql(data.endpoint);
      });
    });

    it('should return undefined when service is unknown', () => {
      let oauthValidator = new OauthValidator({ service: 'xxx' });
      expect(oauthValidator.getEndpoint()).to.eql(undefined);
    });
  });

  describe('.buildOptions', () => {
    [
      {
        service: 'weibo',
        token: 'token',
        options: {
          json: true,
          uri: OauthValidator.WEIBO_ENDPIONT,
          form: { access_token: 'token' }
        }
      },
      {
        service: 'wechat',
        token: 'token',
        options: {
          json: true,
          uri: OauthValidator.WECHAT_ENDPOINT,
          qs: {
            appid: 'xxx',
            grant_type: 'refresh_token',
            refresh_token: 'token'
          }
        }
      },
      {
        service: 'qq',
        token: 'token',
        options: {
          json: true,
          uri: OauthValidator.QQ_ENDPOINT,
          qs: { access_token: 'token' }
        }
      }
    ].forEach(data => {
      it(`build options for ${data.service}`, () => {
        let oauthValidator = new OauthValidator({ service: data.service });
        if (data.service === 'wechat') oauthValidator.appid = data.options.qs.appid;
        oauthValidator.buildOptions(data.token);
        expect(oauthValidator.options).to.eql(data.options);
      });
    });
  });

  describe('.validate', () => {
    let getStub = null;
    let postStub = null;

    context('login with weibo', () => {
      beforeEach(() => {
        postStub = sinon.stub(request, 'postAsync').returns(Promise.resolve([{}, { uid: 123 }]));
      });

      afterEach(() => postStub.restore());

      it('should call request.postAsync once', () => {
        let oauthValidator = new OauthValidator({ service: 'weibo' });
        oauthValidator.validate('token');
        expect(postStub.calledOnce).to.be.true;
      });

      it('should returns true when result matches identity', done => {
        let oauthValidator = new OauthValidator({ service: 'weibo' });
        oauthValidator.validate('token', 123).then(matched => {
          expect(matched).to.be.true;
          done();
        });
      });

      it("should returns false when result doesn't match identity", done => {
        let oauthValidator = new OauthValidator({ service: 'weibo' });
        oauthValidator.validate('token', 122).then(matched => {
          expect(matched).to.be.false;
          done();
        });
      });
    });

    context('login with wechat', () => {
      beforeEach(() => {
        getStub = sinon.stub(request, 'getAsync').returns(Promise.resolve([{}, { openid: 'xxxx' }]));
      });

      afterEach(() => getStub.restore());

      it('should call request.getAsync once', () => {
        let oauthValidator = new OauthValidator({ service: 'wechat' });
        oauthValidator.validate('token');
        expect(getStub.calledOnce).to.be.true;
      });

      it('should returns true when result matches identity', done => {
        let oauthValidator = new OauthValidator({ service: 'wechat' });
        oauthValidator.validate('token', 'xxxx').then(matched => {
          expect(matched).to.be.true;
          done();
        });
      });

      it("should returns false when result doesn't match identity", done => {
        let oauthValidator = new OauthValidator({ service: 'wechat' });
        oauthValidator.validate('token', 'x3x').then(matched => {
          expect(matched).to.be.false;
          done();
        });
      });
    });

    context('login with qq', () => {
      beforeEach(() => {
        getStub = sinon.stub(request, 'getAsync').returns(Promise.resolve([{}, { openid: 'yyyy' }]));
      });

      afterEach(() => getStub.restore());

      it('should call request.getAsync once', () => {
        let oauthValidator = new OauthValidator({ service: 'qq' });
        oauthValidator.validate('token');
        expect(getStub.calledOnce).to.be.true;
      });

      it('should returns true when result matches identity', done => {
        let oauthValidator = new OauthValidator({ service: 'qq' });
        oauthValidator.validate('token', 'yyyy').then(matched => {
          expect(matched).to.be.true;
          done();
        });
      });

      it("should returns false when result doesn't match identity", done => {
        let oauthValidator = new OauthValidator({ service: 'qq' });
        oauthValidator.validate('token', 'y3y').then(matched => {
          expect(matched).to.be.false;
          done();
        });
      });
    });
  });
});
