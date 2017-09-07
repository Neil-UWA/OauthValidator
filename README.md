Usage
=====

``` javascript
  let oauthValidator = new OauthValidator({
    service: 'wechat',
    appid: 'xxx'
  });

  return oauthValidator.validate('token', 'openid').then(isValid => {
    if(!isValid) {
      //do something
      return;
    }
    //do something else
  });

```
